import { SourceConfig } from '../models/sourceConfig.js';
import {
  getAllSourceConfigs,
  getSourceConfigById,
  loadSourceEvents,
} from '../sources/registry.js';

export async function listSources(): Promise<SourceConfig[]> {
  return getAllSourceConfigs();
}

export async function getSourcePreview(sourceId: string): Promise<{
  config: SourceConfig;
  count: number;
  sample: unknown[];
}> {
  const config = getSourceConfigById(sourceId);
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
