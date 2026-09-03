import {
  FIREBASE_SOURCE_CONFIGS_COLLECTION,
  getFirestoreDb,
} from '../config/firebase.js';
import { SourceConfig, validateSourceConfig } from '../models/sourceConfig.js';

// In-memory cache of dynamically loaded Firestore source configurations
let dynamicConfigsCache: Map<string, SourceConfig> = new Map();

/**
 * Queries the configured Firestore collection (e.g. 'source_configs') to discover
 * live, dynamic data sources configured by operations teams.
 * Caches valid configs in memory for synchronous lookup.
 */
export async function listFirestoreSourceConfigs(): Promise<SourceConfig[]> {
  try {
    const db = getFirestoreDb();
    const snapshot = await db.collection(FIREBASE_SOURCE_CONFIGS_COLLECTION).get();

    const loadedConfigs: SourceConfig[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const config: SourceConfig = {
        id: (typeof data.id === 'string' && data.id) || doc.id,
        name: (typeof data.name === 'string' && data.name) || doc.id,
        type: 'firestore',
        collection: (typeof data.collection === 'string' && data.collection) || doc.id,
        enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
        description: typeof data.description === 'string' ? data.description : undefined,
      };

      const validation = validateSourceConfig(config);
      if (validation.valid) {
        dynamicConfigsCache.set(config.id, config);
        loadedConfigs.push(config);
      } else {
        console.warn(
          `[Firestore Source Registry] Skipping invalid source config '${doc.id}':`,
          validation.errors
        );
      }
    });

    return Array.from(dynamicConfigsCache.values());
  } catch (err) {
    // If Firestore is unavailable or offline in non-configured environments,
    // return cached configs or empty array without crashing pipeline
    return Array.from(dynamicConfigsCache.values());
  }
}

/**
 * Returns all currently cached dynamic Firestore source configurations.
 */
export function getDynamicSourceConfigs(): SourceConfig[] {
  return Array.from(dynamicConfigsCache.values());
}

/**
 * Looks up a dynamic Firestore source configuration by source ID.
 */
export function getDynamicSourceConfigById(id: string): SourceConfig | undefined {
  return dynamicConfigsCache.get(id);
}

/**
 * Programmatically adds or updates a dynamic Firestore source configuration in cache.
 * Useful for tests and runtime registrations.
 */
export function registerDynamicSourceConfig(config: SourceConfig): void {
  dynamicConfigsCache.set(config.id, config);
}

/**
 * Clears the dynamic Firestore source configuration cache.
 */
export function clearDynamicSourceConfigs(): void {
  dynamicConfigsCache.clear();
}
