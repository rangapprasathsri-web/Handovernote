/**
 * Source Configuration Data Contract
 *
 * Defines the configuration schema for local and future external data sources.
 */

export interface SourceConfig {
  /** Unique source identifier (e.g. 'ticketing', 'incidents') */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Type of adapter (e.g. 'seeded_json', 'api', 'webhook', 'firestore') */
  type: 'seeded_json' | 'api' | 'webhook' | 'firestore';
  /** Path to the local seeded dataset (for seeded_json) or endpoint (optional when type is 'firestore') */
  path?: string;
  /** Firestore collection path (used instead of path when type is 'firestore') */
  collection?: string;
  /** Whether the source is enabled and ready for querying */
  enabled: boolean;
  /** Optional descriptive note */
  description?: string;
}

export interface SourceConfigValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSourceConfig(config: unknown): SourceConfigValidationResult {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Source config must be a non-null object'] };
  }

  const c = config as Record<string, unknown>;

  if (typeof c.id !== 'string' || c.id.trim() === '') {
    errors.push("Field 'id' is required and must be a non-empty string");
  }

  if (typeof c.name !== 'string' || c.name.trim() === '') {
    errors.push("Field 'name' is required and must be a non-empty string");
  }

  if (
    c.type !== 'seeded_json' &&
    c.type !== 'api' &&
    c.type !== 'webhook' &&
    c.type !== 'firestore'
  ) {
    errors.push("Field 'type' must be one of: 'seeded_json', 'api', 'webhook', 'firestore'");
  }

  if (c.type === 'firestore') {
    if (typeof c.collection !== 'string' || c.collection.trim() === '') {
      errors.push("Field 'collection' is required and must be a non-empty string when type is 'firestore'");
    }
  } else {
    if (typeof c.path !== 'string' || c.path.trim() === '') {
      errors.push("Field 'path' is required and must be a non-empty string");
    }
  }

  if (typeof c.enabled !== 'boolean') {
    errors.push("Field 'enabled' must be a boolean");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
