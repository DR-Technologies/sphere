import { storagePathFromReference } from '@/lib/datasetArtifacts';
import { supabase } from '@/lib/supabase';

const FILES_BUCKET = 'files';
const DEFAULT_SIGNED_URL_TTL_SECONDS = 5 * 60;

/**
 * Resolves private dataset artifacts just-in-time. Legacy public URLs are
 * converted back to their object path before a short-lived URL is issued.
 */
export async function resolvePrivateFileUrl(
  reference: string,
  expiresIn = DEFAULT_SIGNED_URL_TTL_SECONDS
) {
  const path = storagePathFromReference(reference);
  if (!path) return reference;

  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`No se pudo autorizar el acceso temporal al archivo: ${error?.message || 'SIGNED_URL_MISSING'}`);
  }
  return data.signedUrl;
}

export async function downloadPrivateFile(reference: string) {
  const path = storagePathFromReference(reference);
  if (!path) {
    const response = await fetch(reference, { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo descargar el archivo (${response.status}).`);
    return response.blob();
  }

  const { data, error } = await supabase.storage.from(FILES_BUCKET).download(path);
  if (error || !data) {
    throw new Error(`No se pudo descargar el archivo privado: ${error?.message || 'FILE_MISSING'}`);
  }
  return data;
}
