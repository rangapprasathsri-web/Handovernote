import fs from 'fs/promises';
import path from 'path';
import { REGISTERED_SOURCES } from '../config/sources.js';
import { NormalizedEvent } from '../models/events.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { IncidentAdapter, incidentsAdapter } from './incidentsAdapter.js';
import { TicketingAdapter, ticketingAdapter } from './ticketingAdapter.js';
import { FirestoreAdapter, firestoreAdapter } from './firestoreAdapter.js';
import {
  listFirestoreSourceConfigs,
  getDynamicSourceConfigs,
  getDynamicSourceConfigById,
  registerDynamicSourceConfig,
  clearDynamicSourceConfigs,
} from './firestoreSourceRegistry.js';
import { SourceAdapter } from './types.js';

// Simple adapter for quiet/empty testing sources
class QuietOpsAdapter implements SourceAdapter<any> {
  public readonly id = 'quiet_ops';
  public readonly source_id = 'quiet_ops';
  public readonly name = 'Quiet Ops Queue (Empty)';
  public readonly display_name = 'Quiet Ops Queue (Empty)';

  async loadSourceEvents(config: SourceConfig): Promise<any[]> {
    const resolvedPath = path.isAbsolute(config.path || '')
      ? config.path!
      : path.resolve(process.cwd(), config.path || '');
    try {
      const fileData = await fs.readFile(resolvedPath, 'utf-8');
      const parsed = JSON.parse(fileData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async load_records(config: SourceConfig): Promise<any[]> {
    return this.loadSourceEvents(config);
  }

  normalizeEvent(raw: any): NormalizedEvent {
    return raw as NormalizedEvent;
  }

  normalize_record(raw: any): NormalizedEvent {
    return raw as NormalizedEvent;
  }
}

const adapters: Record<string, SourceAdapter<any>> = {
  ticketing: ticketingAdapter,
  incidents: incidentsAdapter,
  quiet_ops: new QuietOpsAdapter(),
  firestore: firestoreAdapter,
};

/**
 * Retrieves the adapter for a given source ID.
 * Resolves static adapters or binds dynamic Firestore sources to firestoreAdapter.
 */
export function getAdapter(sourceId: string): SourceAdapter<any> | undefined {
  if (adapters[sourceId]) {
    return adapters[sourceId];
  }
  const config = getSourceConfigById(sourceId);
  if (config?.type === 'firestore') {
    return firestoreAdapter;
  }
  return undefined;
}

/**
 * Checks if a source ID is registered.
 */
export function hasSource(sourceId: string): boolean {
  return Boolean(getAdapter(sourceId));
}

/**
 * Loads raw events using the appropriate adapter based on config.
 */
export async function loadSourceEvents(config: SourceConfig): Promise<unknown[]> {
  const adapter = getAdapter(config.id);
  if (!adapter) {
    throw new Error(`No source adapter registered for source ID '${config.id}'`);
  }
  return adapter.loadSourceEvents(config);
}

/**
 * Returns all configured source specifications (static seeded sources + dynamic Firestore sources).
 */
export function getAllSourceConfigs(): SourceConfig[] {
  return [...REGISTERED_SOURCES, ...getDynamicSourceConfigs()];
}

/**
 * Looks up a SourceConfig by ID (checking static seeded sources first, then dynamic Firestore sources).
 */
export function getSourceConfigById(id: string): SourceConfig | undefined {
  return REGISTERED_SOURCES.find((s) => s.id === id) || getDynamicSourceConfigById(id);
}

export {
  TicketingAdapter,
  IncidentAdapter,
  FirestoreAdapter,
  firestoreAdapter,
  listFirestoreSourceConfigs,
  registerDynamicSourceConfig,
  clearDynamicSourceConfigs,
};

