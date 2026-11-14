const DEFAULT_PART_SIZE = 16 * 1024 * 1024;
const FILES_BUCKET = 'files';
const STORAGE_OBJECT_MARKER = `/storage/v1/object/`;

export interface NormalizedArtifactPart {
  index: number;
  path: string;
  encoding: 'gzip' | 'identity';
  sourceBytes: number;
  storedBytes: number;
  sourceSha256: string;
  storedSha256: string;
}

export interface NormalizedArtifactDescriptor {
  version: 1;
  format: 'csv';
  sourceBytes: number;
  rowCount: number;
  columnCount: number;
  partSize: number;
  partsChecksum: string;
  parts: NormalizedArtifactPart[];
}

function normalizeStoragePath(path: string) {
  const normalized = path.replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    return null;
  }
  return normalized;
}

/**
 * Accepts current path references plus legacy public/signed Supabase URLs.
 * Dataset metadata keeps using its existing text columns while the bucket is
 * migrated to private access.
 */
export function storagePathFromReference(reference?: string | null) {
  if (!reference) return null;
  const trimmed = reference.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const markerIndex = url.pathname.indexOf(STORAGE_OBJECT_MARKER);
    if (markerIndex < 0) return null;
    const objectPath = url.pathname.slice(markerIndex + STORAGE_OBJECT_MARKER.length);
    const segments = objectPath.split('/');
    const accessMode = segments.shift();
    const bucket = segments.shift();
    if (!['public', 'sign', 'authenticated'].includes(accessMode || '') || bucket !== FILES_BUCKET) return null;
    return normalizeStoragePath(decodeURIComponent(segments.join('/')));
  } catch {
    const withoutBucket = trimmed.startsWith(`${FILES_BUCKET}/`)
      ? trimmed.slice(FILES_BUCKET.length + 1)
      : trimmed;
    return normalizeStoragePath(withoutBucket);
  }
}

export function isOwnedStoragePath(path: string, userId: string) {
  return path.startsWith(`${userId}/`);
}

interface PartitionOptions {
  blob: Blob;
  basePath: string;
  rowCount: number;
  columnCount: number;
  partSize?: number;
  upload: (path: string, body: Blob, contentType: string) => Promise<void>;
  onProgress?: (completedParts: number, totalParts: number) => void;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Blob(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return bytesToHex(new Uint8Array(digest));
}

async function gzipBlob(blob: Blob) {
  if (typeof CompressionStream === 'undefined') {
    return { body: blob, encoding: 'identity' as const, contentType: 'text/csv;charset=utf-8' };
  }
  const compressed = blob.stream().pipeThrough(new CompressionStream('gzip'));
  return {
    body: await new Response(compressed).blob(),
    encoding: 'gzip' as const,
    contentType: 'application/gzip'
  };
}

export async function uploadPartitionedNormalizedArtifact({
  blob,
  basePath,
  rowCount,
  columnCount,
  partSize = DEFAULT_PART_SIZE,
  upload,
  onProgress
}: PartitionOptions): Promise<NormalizedArtifactDescriptor> {
  if (blob.size <= 0) throw new Error('Normalized CSV artifact is empty.');
  if (!Number.isInteger(rowCount) || rowCount < 0) throw new Error('Normalized artifact row count is invalid.');
  if (!Number.isInteger(columnCount) || columnCount <= 0) throw new Error('Normalized artifact column count is invalid.');
  if (!Number.isInteger(partSize) || partSize <= 0) throw new Error('Normalized artifact part size is invalid.');

  const totalParts = Math.ceil(blob.size / partSize);
  const parts: NormalizedArtifactPart[] = [];
  for (let index = 0; index < totalParts; index += 1) {
    const source = blob.slice(index * partSize, Math.min((index + 1) * partSize, blob.size), 'text/csv;charset=utf-8');
    const encoded = await gzipBlob(source);
    const path = `${basePath}/part-${String(index).padStart(5, '0')}.csv${encoded.encoding === 'gzip' ? '.gz' : ''}`;
    const [sourceSha256, storedSha256] = await Promise.all([
      sha256Blob(source),
      sha256Blob(encoded.body)
    ]);
    await upload(path, encoded.body, encoded.contentType);
    parts.push({
      index,
      path,
      encoding: encoded.encoding,
      sourceBytes: source.size,
      storedBytes: encoded.body.size,
      sourceSha256,
      storedSha256
    });
    onProgress?.(index + 1, totalParts);
  }

  const partsChecksum = await sha256Blob(new Blob([
    parts.map((part) => `${part.index}:${part.sourceSha256}:${part.storedSha256}`).join('|')
  ]));
  return {
    version: 1,
    format: 'csv',
    sourceBytes: blob.size,
    rowCount,
    columnCount,
    partSize,
    partsChecksum,
    parts
  };
}

export function normalizedArtifactPathsFromManifest(manifest: unknown) {
  if (!manifest || typeof manifest !== 'object') return [];
  const artifact = (manifest as { normalized_artifact?: unknown }).normalized_artifact;
  if (!artifact || typeof artifact !== 'object') return [];
  const parts = (artifact as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return [];
  return parts
    .map((part) => part && typeof part === 'object' ? (part as { path?: unknown }).path : null)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);
}
