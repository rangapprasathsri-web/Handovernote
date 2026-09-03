import { getFirestoreDb } from '../config/firebase.js';
import { NormalizedEvent } from '../models/events.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { normalizeTimestamp } from '../utils/timestampNormalizer.js';
import { SourceAdapter } from './types.js';

export interface RawFirestoreRecord {
  id?: string;
  _firestore_id?: string;
  record_id?: string;
  ticket_id?: string;
  incident_id?: string;
  source?: string;
  timestamp?: string | { toDate: () => Date };
  created_at?: string | { toDate: () => Date };
  reported_at?: string | { toDate: () => Date };
  event_time?: string | { toDate: () => Date };
  summary?: string;
  subject?: string;
  headline?: string;
  title?: string;
  status?: string;
  ticket_status?: string;
  incident_state?: string;
  state?: string;
  priority?: string | null;
  urgency?: string | null;
  severity?: string | null;
  severity_level?: string | null;
  owner?: string | null;
  assignee?: string | null;
  incident_commander?: string | null;
  details?: string | null;
  description?: string | null;
  impact_summary?: string | null;
  updated_by?: string | null;
  [key: string]: unknown;
}

export class FirestoreNormalizationError extends Error {
  public recordId?: string;
  constructor(message: string, recordId?: string) {
    super(message);
    this.name = 'FirestoreNormalizationError';
    this.recordId = recordId;
  }
}

/**
 * Loads raw documents from the configured Firestore collection.
 * Attaches the Firestore document ID to the raw record so normalization can reference it.
 */
export async function load_source_events(config: SourceConfig): Promise<RawFirestoreRecord[]> {
  const collectionName = config.collection || config.path;
  if (!collectionName) {
    throw new Error(
      `Firestore source '${config.id}' is missing required 'collection' configuration`
    );
  }

  const db = getFirestoreDb();
  const snapshot = await db.collection(collectionName).get();

  const records: RawFirestoreRecord[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    records.push({
      ...data,
      id: doc.id,
      _firestore_id: doc.id,
      // Default record_id to document ID if not explicitly set
      record_id: (typeof data.record_id === 'string' && data.record_id) || doc.id,
      // Source default to config id if not explicitly specified
      source: (typeof data.source === 'string' && data.source) || config.id,
    });
  });

  return records;
}

export const load_records = load_source_events;

/**
 * Normalizes a raw Firestore document into the standard NormalizedEvent shape.
 * Reuses the central normalizeTimestamp utility for strict timezone-aware validation.
 */
export function normalize_event(
  raw: RawFirestoreRecord,
  targetTimezone: string = 'Asia/Kolkata'
): NormalizedEvent {
  if (!raw || typeof raw !== 'object') {
    throw new FirestoreNormalizationError('Firestore document must be a non-null object');
  }

  // 1. Resolve Record ID
  const rawId =
    raw.record_id ||
    raw.ticket_id ||
    raw.incident_id ||
    raw.id ||
    raw._firestore_id;

  const recordId = typeof rawId === 'string' ? rawId.trim() : '';
  if (!recordId) {
    throw new FirestoreNormalizationError("Missing or empty required field 'record_id' (or document id)");
  }

  // 2. Resolve Summary / Title
  const rawSummary = raw.summary || raw.subject || raw.headline || raw.title;
  if (typeof rawSummary !== 'string' || !rawSummary.trim()) {
    throw new FirestoreNormalizationError(
      `Document '${recordId}' is missing required field 'summary' (or subject/headline/title)`,
      recordId
    );
  }

  // 3. Resolve Status
  const rawStatus = raw.status || raw.ticket_status || raw.incident_state || raw.state;
  if (typeof rawStatus !== 'string' || !rawStatus.trim()) {
    throw new FirestoreNormalizationError(
      `Document '${recordId}' is missing required field 'status'`,
      recordId
    );
  }

  // 4. Resolve Timestamp (string or Firestore Timestamp object)
  let rawTs: unknown = raw.timestamp || raw.created_at || raw.reported_at || raw.event_time;
  if (rawTs && typeof rawTs === 'object' && 'toDate' in rawTs && typeof (rawTs as { toDate: () => Date }).toDate === 'function') {
    rawTs = (rawTs as { toDate: () => Date }).toDate().toISOString();
  }

  if (!rawTs || typeof rawTs !== 'string') {
    throw new FirestoreNormalizationError(
      `Document '${recordId}' is missing required timestamp field`,
      recordId
    );
  }

  const tsResult = normalizeTimestamp(rawTs, targetTimezone);
  if (tsResult.valid === false) {
    throw new FirestoreNormalizationError(
      `Document '${recordId}' has invalid timestamp: ${(tsResult as { error: string }).error}`,
      recordId
    );
  }

  // 5. Build NormalizedEvent
  const sourceName = typeof raw.source === 'string' && raw.source.trim() ? raw.source.trim() : 'firestore';
  const priority = (raw.priority || raw.urgency || null) as string | null;
  const severity = (raw.severity || raw.severity_level || null) as string | null;
  const owner = (raw.owner || raw.assignee || raw.incident_commander || null) as string | null;
  const details = (raw.details || raw.description || raw.impact_summary || null) as string | null;
  const updatedBy = (raw.updated_by || null) as string | null;

  return {
    source: sourceName,
    record_id: recordId,
    timestamp: tsResult.timezoneIso,
    original_timestamp: tsResult.original,
    normalized_timestamp_utc: tsResult.utcIso,
    summary: rawSummary.trim(),
    status: rawStatus.trim(),
    priority: priority ? String(priority).trim() : null,
    severity: severity ? String(severity).trim() : null,
    owner: owner ? String(owner).trim() : null,
    details: details ? String(details).trim() : null,
    updated_by: updatedBy ? String(updatedBy).trim() : null,
  };
}

export const normalize_record = normalize_event;

export class FirestoreAdapter implements SourceAdapter<RawFirestoreRecord> {
  public readonly id = 'firestore';
  public readonly source_id = 'firestore';
  public readonly name = 'Firestore Collection Source';
  public readonly display_name = 'Firestore Collection Source';

  async loadSourceEvents(config: SourceConfig): Promise<RawFirestoreRecord[]> {
    return load_source_events(config);
  }

  async load_records(config: SourceConfig): Promise<RawFirestoreRecord[]> {
    return load_records(config);
  }

  normalizeEvent(raw: RawFirestoreRecord, targetTimezone?: string): NormalizedEvent {
    return normalize_event(raw, targetTimezone);
  }

  normalize_record(raw: RawFirestoreRecord, targetTimezone?: string): NormalizedEvent {
    return normalize_record(raw, targetTimezone);
  }
}

export const firestoreAdapter = new FirestoreAdapter();
