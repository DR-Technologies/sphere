import { describe, expect, it, vi } from 'vitest';
import {
  isOwnedStoragePath,
  normalizedArtifactPathsFromManifest,
  sha256Blob,
  storagePathFromReference,
  uploadPartitionedNormalizedArtifact
} from './datasetArtifacts';

describe('private dataset artifact references', () => {
  it('normalizes paths plus legacy public and signed URLs without query tokens', () => {
    const path = 'owner-id/datasets/source.xlsx';
    expect(storagePathFromReference(path)).toBe(path);
    expect(storagePathFromReference(`files/${path}`)).toBe(path);
    expect(storagePathFromReference(`https://project.supabase.co/storage/v1/object/public/files/${path}`)).toBe(path);
    expect(storagePathFromReference(`https://project.supabase.co/storage/v1/object/sign/files/${path}?token=secret`)).toBe(path);
    expect(storagePathFromReference('https://example.com/file.xlsx')).toBeNull();
    expect(storagePathFromReference('../other-user/file.xlsx')).toBeNull();
  });

  it('enforces the owner prefix without accepting lookalike user ids', () => {
    expect(isOwnedStoragePath('owner-id/datasets/source.xlsx', 'owner-id')).toBe(true);
    expect(isOwnedStoragePath('owner-id-2/datasets/source.xlsx', 'owner-id')).toBe(false);
  });
});

describe('partitioned normalized dataset artifacts', () => {
  it('uploads bounded ordered parts with verifiable integrity', async () => {
    const source = new Blob(['header_a,header_b\n', ...Array.from({ length: 2_000 }, (_, index) => `${index},value-${index}\n`)]);
    const uploaded = new Map<string, Blob>();
    const progress = vi.fn();
    const descriptor = await uploadPartitionedNormalizedArtifact({
      blob: source,
      basePath: 'owner/datasets/import__normalized',
      rowCount: 2_000,
      columnCount: 2,
      partSize: 4_096,
      upload: async (path, body) => { uploaded.set(path, body); },
      onProgress: progress
    });

    expect(descriptor.parts.length).toBeGreaterThan(1);
    expect(descriptor.sourceBytes).toBe(source.size);
    expect(descriptor.rowCount).toBe(2_000);
    expect(descriptor.columnCount).toBe(2);
    expect(descriptor.partsChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(progress).toHaveBeenLastCalledWith(descriptor.parts.length, descriptor.parts.length);

    for (const part of descriptor.parts) {
      const stored = uploaded.get(part.path)!;
      expect(stored.size).toBe(part.storedBytes);
      expect(await sha256Blob(stored)).toBe(part.storedSha256);
      const decoded = part.encoding === 'gzip'
        ? await new Response(stored.stream().pipeThrough(new DecompressionStream('gzip'))).blob()
        : stored;
      expect(await sha256Blob(decoded)).toBe(part.sourceSha256);
    }
    expect(normalizedArtifactPathsFromManifest({ normalized_artifact: descriptor }))
      .toEqual(descriptor.parts.map((part) => part.path));
  });
});
