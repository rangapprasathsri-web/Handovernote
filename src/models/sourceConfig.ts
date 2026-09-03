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
  /** Type of adapter (e.g. 'seeded_json', 'api', 'webhook') */
  type: 'seeded_json' | 'api' | 'webhook';
  /** Path to the local seeded dataset (for seeded_json) or endpoint */
  path: string;
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

  if (c.type !== 'seeded_json' && c.type !== 'api' && c.type !== 'webhook') {
    errors.push("Field 'type' must be one of: 'seeded_json', 'api', 'webhook'");
  }

  if (typeof c.path !== 'string' || c.path.trim() === '') {
    errors.push("Field 'path' is required and must be a non-empty string");
  }

  if (typeof c.enabled !== 'boolean') {
    errors.push("Field 'enabled' must be a boolean");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
