import { SourceConfig } from '../models/sourceConfig.js';
import {
  getAllSourceConfigs,
  getSourceConfigById,
  listFirestoreSourceConfigs,
  loadSourceEvents,
} from '../sources/registry.js';

export async function listSources(): Promise<SourceConfig[]> {
  try {
    await listFirestoreSourceConfigs();
  } catch {
    // Gracefully continue with registered static sources
  }
  return getAllSourceConfigs();
}

export async function getSourcePreview(sourceId: string): Promise<{
  config: SourceConfig;
  count: number;
  sample: unknown[];
}> {
  let config = getSourceConfigById(sourceId);
  if (!config) {
    try {
      await listFirestoreSourceConfigs();
      config = getSourceConfigById(sourceId);
    } catch {
      // Ignore
    }
  }

  if (!config) {
    throw new Error(`Source with ID '${sourceId}' not found`);
  }

  const rawEvents = await loadSourceEvents(config);
  return {
    config,
    count: rawEvents.length,
    sample: rawEvents.slice(0, 5),
  };
}

