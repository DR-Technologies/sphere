import 'server-only';

import crypto from 'node:crypto';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { deleteExportJobFiles } from '@/lib/story/exportStore';
import {
  isOwnedStoragePath,
  normalizedArtifactPathsFromManifest,
  storagePathFromReference
} from '@/lib/datasetArtifacts';
import { AccountApiError } from './server';
import { getStripeClient } from '@/lib/billing/stripeServer';

interface DeletionResourceSet {
  datasets?: Array<{
    id?: string;
    table?: string | null;
    file_url?: string | null;
    normalized_file_url?: string | null;
    analytics_manifest_url?: string | null;
  }>;
  export_job_ids?: string[];
  storage_paths?: string[];
  [key: string]: unknown;
}

export function needsStorageInventory(request: {
  storage_cleaned_at?: string | null;
  resources?: DeletionResourceSet | null;
}) {
  return !request.storage_cleaned_at && !Array.isArray(request.resources?.storage_paths);
}

export function accountDeletionResumePlan(request: {
  database_cleaned_at?: string | null;
  storage_cleaned_at?: string | null;
  auth_deleted_at?: string | null;
  resources?: DeletionResourceSet | null;
}) {
  return {
    inventory: needsStorageInventory(request),
    database: !request.database_cleaned_at,
    storage: !request.storage_cleaned_at,
    auth: !request.auth_deleted_at
  };
}

function createEphemeralAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) {
    throw new AccountApiError(503, 'AUTH_VERIFICATION_UNAVAILABLE', 'La verificación de identidad no está configurada.');
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

export function deletionTokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function tokenMatches(token: string, expectedHash: string) {
  const actual = Buffer.from(deletionTokenHash(token));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function requestAccountDeletionVerification(user: User) {
  if (!user.email) throw new AccountApiError(400, 'VERIFIED_EMAIL_REQUIRED', 'La cuenta necesita un correo confirmado.');
  const client = createEphemeralAuthClient();
  const { error } = await client.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false }
  });
  if (error) throw new AccountApiError(502, 'VERIFICATION_CODE_SEND_FAILED', 'No se pudo enviar el código de verificación.');
}

export async function verifyRecentAuthentication(user: User, nonce: string) {
  if (!/^\d{6}$/.test(nonce)) throw new AccountApiError(400, 'REAUTH_CODE_REQUIRED', 'Ingresa el código de autenticación reciente.');
  if (!user.email) throw new AccountApiError(400, 'VERIFIED_EMAIL_REQUIRED', 'La cuenta necesita un correo confirmado.');

  const client = createEphemeralAuthClient();
  const { data, error } = await client.auth.verifyOtp({
    email: user.email,
    token: nonce,
    type: 'email'
  });
  const verifiedUserId = data.user?.id || data.session?.user.id;
  if (error || verifiedUserId !== user.id) {
    if (data.session) await client.auth.signOut({ scope: 'local' });
    throw new AccountApiError(401, 'RECENT_AUTHENTICATION_REQUIRED', 'El código expiró o no es válido. Solicita uno nuevo.');
  }
  if (data.session) await client.auth.signOut({ scope: 'local' });
}

async function completeStorageInventory(admin: SupabaseClient, userId: string, resources: DeletionResourceSet) {
  const paths = new Set<string>();
  const addOwnedPath = (path: string | null) => {
    if (!path) return;
    if (!isOwnedStoragePath(path, userId)) throw new Error(`STORAGE_PATH_OWNERSHIP_MISMATCH ${path}`);
    paths.add(path);
  };
  (resources.storage_paths || []).forEach(addOwnedPath);
  for (const dataset of resources.datasets || []) {
    [dataset.file_url, dataset.normalized_file_url, dataset.analytics_manifest_url]
      .map(storagePathFromReference).forEach(addOwnedPath);
    const manifestPath = storagePathFromReference(dataset.analytics_manifest_url);
    if (manifestPath) {
      const { data, error } = await admin.storage.from('files').download(manifestPath);
      if (error || !data) throw new Error(`STORAGE_MANIFEST_READ_FAILED ${error?.message || manifestPath}`);
      let manifest: unknown;
      try { manifest = JSON.parse(await data.text()); }
      catch { throw new Error(`STORAGE_MANIFEST_INVALID ${manifestPath}`); }
      normalizedArtifactPathsFromManifest(manifest).forEach(addOwnedPath);
    }
  }
  return { ...resources, storage_paths: Array.from(paths) };
}

async function removeStorage(admin: SupabaseClient, paths: string[]) {
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await admin.storage.from('files').remove(paths.slice(index, index + 100));
    if (error) throw new Error(`STORAGE_CLEANUP_FAILED ${error.message}`);
  }
}

export async function processAccountDeletion(
  admin: SupabaseClient,
  requestId: string,
  retryToken: string,
  expectedUserId?: string
) {
  const { data: request, error } = await admin.from('account_deletion_requests')
    .select('*').eq('id', requestId).single();
  if (error || !request || !tokenMatches(retryToken, request.retry_token_hash)
    || (expectedUserId && request.user_id !== expectedUserId)) {
    throw new AccountApiError(403, 'INVALID_DELETION_RETRY', 'La solicitud de eliminación no es válida.');
  }
  if (request.status === 'completed') return;
  const userId = request.user_id as string;
  const resume = accountDeletionResumePlan(request);

  let stage = 'inventory';
  try {
    let resources = request.resources as DeletionResourceSet;
    if (resume.inventory) {
      resources = await completeStorageInventory(admin, userId, resources);
      const { error: inventoryError } = await admin.from('account_deletion_requests').update({
        resources,
        status: 'processing',
        updated_at: new Date().toISOString()
      }).eq('id', requestId);
      if (inventoryError) throw inventoryError;
    }

    stage = 'validation';
    const { error: validationError } = await admin.rpc('assert_account_dataset_tables', { p_user_id: userId });
    if (validationError) throw validationError;

    stage = 'billing_preflight';
    const { data: billing } = await admin.from('account_subscriptions').select('stripe_subscription_id').eq('user_id', userId).maybeSingle();
    if (billing?.stripe_subscription_id && !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      throw new Error('STRIPE_TEST_MODE_NOT_CONFIGURED');
    }

    stage = 'database';
    if (resume.database) {
      const { error: cleanupError } = await admin.rpc('delete_account_product_data', { p_user_id: userId, p_request_id: requestId });
      if (cleanupError) throw cleanupError;
    }

    stage = 'storage';
    if (resume.storage) {
      await removeStorage(admin, resources.storage_paths || []);
      await Promise.all((resources.export_job_ids || []).map((jobId) => deleteExportJobFiles(jobId)));
      const { error: storageCheckpointError } = await admin.from('account_deletion_requests')
        .update({ storage_cleaned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (storageCheckpointError) throw storageCheckpointError;
    }

    stage = 'billing';
    if (billing?.stripe_subscription_id) {
      const subscription = await getStripeClient().subscriptions.retrieve(billing.stripe_subscription_id);
      if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
        await getStripeClient().subscriptions.cancel(subscription.id);
      }
    }

    stage = 'auth';
    if (resume.auth) {
      const { error: authError } = await admin.auth.admin.deleteUser(userId);
      if (authError && !authError.message.toLowerCase().includes('not found')) throw authError;
    }

    const { error: completionError } = await admin.from('account_deletion_requests').update({
      status: 'completed', auth_deleted_at: new Date().toISOString(), completed_at: new Date().toISOString(),
      last_error: null, last_error_stage: null, updated_at: new Date().toISOString()
    }).eq('id', requestId);
    if (completionError) throw completionError;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'ACCOUNT_DELETION_FAILED';
    await admin.from('account_deletion_requests').update({ status: 'failed', last_error: message, last_error_stage: stage, updated_at: new Date().toISOString() }).eq('id', requestId);
    throw new AccountApiError(500, 'ACCOUNT_DELETION_INCOMPLETE', 'La eliminación no terminó. Puedes reintentar de forma segura.', { requestId, stage });
  }
}
