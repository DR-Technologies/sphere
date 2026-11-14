import { appLogger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { StoryDefinition } from './types';

export interface SavedStoryRecord {
  id: string;
  userId: string;
  datasetId: string;
  sourceReportId?: string | null;
  title: string;
  subtitle: string;
  templateId: StoryDefinition['templateId'];
  motionPresetId: StoryDefinition['motionPresetId'];
  pacingPresetId: StoryDefinition['pacingPresetId'];
  orientation: StoryDefinition['orientation'];
  definitionVersion: number;
  storyDefinition: StoryDefinition;
  createdAt?: string;
  updatedAt?: string;
}

interface StoryRecordRow {
  id: string;
  user_id: string;
  dataset_id: string;
  source_report_id?: string | null;
  title: string;
  subtitle: string;
  template_id: StoryDefinition['templateId'];
  motion_preset_id: StoryDefinition['motionPresetId'];
  pacing_preset_id: StoryDefinition['pacingPresetId'];
  orientation: StoryDefinition['orientation'];
  definition_version: number;
  story_definition: StoryDefinition;
  created_at?: string;
  updated_at?: string;
}

function toStoryRow(story: StoryDefinition): StoryRecordRow {
  const now = new Date().toISOString();
  return {
    id: story.id || crypto.randomUUID(),
    user_id: story.userId,
    dataset_id: story.datasetId,
    source_report_id: story.sourceReportId || null,
    title: story.title,
    subtitle: story.subtitle,
    template_id: story.templateId,
    motion_preset_id: story.motionPresetId,
    pacing_preset_id: story.pacingPresetId,
    orientation: story.orientation,
    definition_version: story.schemaVersion,
    story_definition: {
      ...story,
      id: story.id || undefined,
      updatedAt: now,
      createdAt: story.createdAt || now
    },
    created_at: story.createdAt || now,
    updated_at: now
  };
}

function fromStoryRow(row: StoryRecordRow): SavedStoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    datasetId: row.dataset_id,
    sourceReportId: row.source_report_id || null,
    title: row.title,
    subtitle: row.subtitle,
    templateId: row.template_id,
    motionPresetId: row.motion_preset_id,
    pacingPresetId: row.pacing_preset_id,
    orientation: row.orientation,
    definitionVersion: row.definition_version,
    storyDefinition: {
      ...row.story_definition,
      id: row.id,
      userId: row.user_id,
      datasetId: row.dataset_id,
      sourceReportId: row.source_report_id || null,
      title: row.title,
      subtitle: row.subtitle,
      templateId: row.template_id,
      motionPresetId: row.motion_preset_id,
      pacingPresetId: row.pacing_preset_id,
      orientation: row.orientation,
      schemaVersion: row.definition_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function saveStory(story: StoryDefinition) {
  const payload = toStoryRow(story);
  const { data, error } = await supabase
    .from('stories')
    .upsert([payload])
    .select('*')
    .single();

  if (error) {
    appLogger.error('story', 'SAVE_STORY_FAILED', 'Failed to save story.', { error, meta: { storyId: story.id } });
    throw error;
  }

  return fromStoryRow(data as StoryRecordRow);
}

export async function getStoryById(storyId: string) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();

  if (error) {
    appLogger.warn('story', 'FETCH_STORY_FAILED', 'Failed to fetch story.', { error, meta: { storyId } });
    return null;
  }

  return fromStoryRow(data as StoryRecordRow);
}

export async function getStories(userId: string, datasetId?: string) {
  let query = supabase
    .from('stories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (datasetId) {
    query = query.eq('dataset_id', datasetId);
  }

  const { data, error } = await query;
  if (error) {
    appLogger.error('story', 'FETCH_STORIES_FAILED', 'Failed to fetch stories.', { error, meta: { userId, datasetId } });
    return [];
  }

  return ((data || []) as StoryRecordRow[]).map(fromStoryRow);
}

export async function deleteStory(storyId: string, userId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Authenticated session required to delete Story.');

  const response = await fetch(`/api/lifecycle/story-artifacts/${storyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    const error = new Error(payload?.error || 'Story could not be deleted.');
    appLogger.error('story', 'DELETE_STORY_FAILED', 'Failed to delete story.', { error, meta: { storyId, userId } });
    throw error;
  }
}
