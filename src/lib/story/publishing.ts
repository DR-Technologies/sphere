import { appLogger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { isMissingPostgrestFunction } from '@/lib/supabaseCompatibility';
import { materializeStory } from './materialize';
import type { MaterializedStory, StoryDefinition, StoryPublicationSnapshot } from './types';

interface StoryPublicationRecord {
  id: string;
  slug: string;
  story_id?: string | null;
  dataset_id: string;
  user_id: string;
  title: string;
  subtitle: string;
  template_id: StoryDefinition['templateId'];
  motion_preset_id: StoryDefinition['motionPresetId'];
  pacing_preset_id: StoryDefinition['pacingPresetId'];
  orientation: StoryDefinition['orientation'];
  definition_version: number;
  render_model_version: number;
  story_definition: StoryDefinition;
  materialized_story: MaterializedStory;
  published_at?: string;
  revoked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

function generateSnapshotSlug() {
  return `story_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

function fromStoryPublicationRecord(record: StoryPublicationRecord): StoryPublicationSnapshot {
  return {
    id: record.id,
    slug: record.slug,
    storyId: record.story_id || null,
    datasetId: record.dataset_id,
    userId: record.user_id,
    storyDefinition: {
      ...record.story_definition,
      id: record.story_id || record.story_definition.id,
      datasetId: record.dataset_id,
      userId: record.user_id,
      title: record.title,
      subtitle: record.subtitle,
      templateId: record.template_id,
      motionPresetId: record.motion_preset_id,
      pacingPresetId: record.pacing_preset_id,
      orientation: record.orientation,
      schemaVersion: record.definition_version
    },
    materializedStory: record.materialized_story,
    publishedAt: record.published_at,
    revokedAt: record.revoked_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export async function publishStorySnapshot(params: {
  story: StoryDefinition;
  columnsMeta: import('@/lib/widgets/types').DatasetColumnMeta[];
  materializedStory?: MaterializedStory;
  existingSlug?: string | null;
}) {
  const activeSnapshot = !params.existingSlug && params.story.id
    ? await getPublishedStorySnapshotByStoryId(params.story.id)
    : null;
  const materializedStory = params.materializedStory || await materializeStory(params.story, {
    columnsMeta: params.columnsMeta
  });

  const now = new Date().toISOString();
  const payload = {
    slug: params.existingSlug || activeSnapshot?.slug || generateSnapshotSlug(),
    story_id: params.story.id || null,
    dataset_id: params.story.datasetId,
    user_id: params.story.userId,
    title: params.story.title,
    subtitle: params.story.subtitle,
    template_id: params.story.templateId,
    motion_preset_id: params.story.motionPresetId,
    pacing_preset_id: params.story.pacingPresetId,
    orientation: params.story.orientation,
    definition_version: params.story.schemaVersion,
    render_model_version: materializedStory.renderModelVersion,
    story_definition: params.story,
    materialized_story: materializedStory,
    revoked_at: null,
    published_at: now,
    updated_at: now
  };

  const { data, error } = await supabase
    .from('public_story_snapshots')
    .upsert([payload], { onConflict: 'slug' })
    .select('*')
    .single();

  if (error) {
    appLogger.error('story', 'PUBLISH_STORY_SNAPSHOT_FAILED', 'Failed to publish story snapshot.', { error });
    throw error;
  }

  return fromStoryPublicationRecord(data as StoryPublicationRecord);
}

export async function getPublishedStorySnapshotBySlug(slug: string) {
  const { data, error } = await supabase
    .rpc('get_public_story_snapshot', { p_slug: slug });

  if (!error) return data ? fromStoryPublicationRecord(data as StoryPublicationRecord) : null;

  if (!isMissingPostgrestFunction(error, 'get_public_story_snapshot')) {
    appLogger.warn('story', 'FETCH_PUBLIC_STORY_FAILED', 'Failed to fetch public story snapshot.', { error, meta: { slug } });
    return null;
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from('public_story_snapshots')
    .select('*')
    .eq('slug', slug)
    .is('revoked_at', null)
    .maybeSingle();

  if (legacyError) {
    appLogger.warn('story', 'FETCH_PUBLIC_STORY_LEGACY_FAILED', 'Failed to fetch the pre-migration public Story.', {
      error: legacyError,
      meta: { slug }
    });
    return null;
  }

  return legacyData ? fromStoryPublicationRecord(legacyData as StoryPublicationRecord) : null;
}

export async function getPublishedStorySnapshotByStoryId(storyId: string) {
  const { data, error } = await supabase
    .from('public_story_snapshots')
    .select('*')
    .eq('story_id', storyId)
    .is('revoked_at', null)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    appLogger.warn('story', 'FETCH_STORY_PUBLICATION_FAILED', 'Failed to fetch publication by story id.', { error, meta: { storyId } });
    return null;
  }

  return data ? fromStoryPublicationRecord(data as StoryPublicationRecord) : null;
}

export async function revokePublishedStorySnapshot(slug: string) {
  const { error } = await supabase
    .from('public_story_snapshots')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('slug', slug);

  if (error) {
    appLogger.error('story', 'REVOKE_STORY_PUBLICATION_FAILED', 'Failed to revoke public story snapshot.', { error, meta: { slug } });
    throw error;
  }
}

export function getPublicStoryUrl(slug: string) {
  if (typeof window === 'undefined') return `/story/${slug}`;
  return `${window.location.origin}/story/${slug}`;
}
