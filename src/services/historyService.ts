import {
  FIREBASE_HANDOVERS_COLLECTION,
  getFirestoreDb,
} from '../config/firebase.js';
import { HandoverNote } from '../models/handover.js';
import {
  HandoverHistoryFilterOptions,
  HandoverHistoryListResponse,
  HandoverHistoryRecord,
} from '../models/history.js';

// In-memory fallback cache when running offline or during testing without active Firestore connection
const inMemoryHistoryStore = new Map<string, HandoverHistoryRecord>();

/**
 * Generates a unique, human-identifiable history record ID.
 */
export function generateHistoryId(fingerprint: string): string {
  const shortFp = fingerprint.slice(0, 8);
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 6);
  return `ho_${timestamp}_${shortFp}_${rand}`;
}

/**
 * Saves a completed HandoverNote to Firestore.
 * Detects duplicate regenerations of the same shift window via deterministic fingerprint.
 */
export async function saveHandoverHistory(
  note: HandoverNote
): Promise<HandoverHistoryRecord> {
  const recordId = generateHistoryId(note.fingerprint);
  const nowIso = new Date().toISOString();

  const record: HandoverHistoryRecord = {
    id: recordId,
    title: note.title,
    shift_window: {
      shift_start: note.shift_start,
      shift_end: note.shift_end,
    },
    timezone: note.timezone,
    sources: [...note.sources],
    generated_at: note.generated_at || nowIso,
    fingerprint: note.fingerprint,
    note: JSON.parse(JSON.stringify(note)), // Clean serializable clone
    created_at: nowIso,
    updated_at: nowIso,
  };

  try {
    const db = getFirestoreDb();
    const collection = db.collection(FIREBASE_HANDOVERS_COLLECTION);

    // Check for existing record with the same fingerprint to deduplicate regenerations
    const existingSnap = await collection
      .where('fingerprint', '==', note.fingerprint)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      const existingData = existingDoc.data() as HandoverHistoryRecord;
      const updatedRecord: HandoverHistoryRecord = {
        ...existingData,
        id: existingDoc.id,
        updated_at: nowIso,
      };

      await collection.doc(existingDoc.id).update({
        updated_at: nowIso,
      });

      inMemoryHistoryStore.set(existingDoc.id, updatedRecord);
      return updatedRecord;
    }

    // Persist new record to Firestore
    await collection.doc(recordId).set(record);
    inMemoryHistoryStore.set(recordId, record);
    return record;
  } catch (err) {
    // Fall back to in-memory store if Firestore is not reachable or in mock test mode
    for (const [id, existing] of inMemoryHistoryStore.entries()) {
      if (existing.fingerprint === note.fingerprint) {
        existing.updated_at = nowIso;
        return existing;
      }
    }
    inMemoryHistoryStore.set(recordId, record);
    return record;
  }
}

/**
 * Retrieves a paginated list of saved handover notes with optional filtering.
 * Results are sorted most recent first.
 */
export async function listHandoverHistory(
  options: HandoverHistoryFilterOptions = {}
): Promise<HandoverHistoryListResponse> {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));

  let records: HandoverHistoryRecord[] = [];

  try {
    const db = getFirestoreDb();
    const collection = db.collection(FIREBASE_HANDOVERS_COLLECTION);
    const snapshot = await collection.get();

    snapshot.forEach((doc) => {
      const data = doc.data() as HandoverHistoryRecord;
      records.push({
        ...data,
        id: doc.id,
      });
    });
  } catch {
    // Fallback to in-memory store
    records = Array.from(inMemoryHistoryStore.values());
  }

  // If both empty, ensure in-memory records are used
  if (records.length === 0 && inMemoryHistoryStore.size > 0) {
    records = Array.from(inMemoryHistoryStore.values());
  }

  // 1. Filter by source (if specified)
  if (options.source && options.source.trim()) {
    const filterSource = options.source.trim().toLowerCase();
    records = records.filter((r) =>
      r.sources.some((s) => s.toLowerCase() === filterSource)
    );
  }

  // 2. Filter by date range (start date / end date)
  if (options.startDate) {
    const startEpoch = Date.parse(options.startDate);
    if (!Number.isNaN(startEpoch)) {
      records = records.filter((r) => {
        const itemStart = Date.parse(r.shift_window?.shift_start || r.generated_at);
        return !Number.isNaN(itemStart) && itemStart >= startEpoch;
      });
    }
  }

  if (options.endDate) {
    const endEpoch = Date.parse(options.endDate);
    if (!Number.isNaN(endEpoch)) {
      records = records.filter((r) => {
        const itemEnd = Date.parse(r.shift_window?.shift_end || r.generated_at);
        return !Number.isNaN(itemEnd) && itemEnd <= endEpoch;
      });
    }
  }

  // 3. Sort most recent first (generated_at descending)
  records.sort((a, b) => {
    const timeA = Date.parse(a.generated_at || a.created_at || '0');
    const timeB = Date.parse(b.generated_at || b.created_at || '0');
    return timeB - timeA;
  });

  const total = records.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = records.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page,
    limit,
    total_pages: totalPages,
  };
}

/**
 * Retrieves a single saved handover record by ID.
 */
export async function getHandoverHistoryById(
  id: string
): Promise<HandoverHistoryRecord | null> {
  try {
    const db = getFirestoreDb();
    const docSnap = await db.collection(FIREBASE_HANDOVERS_COLLECTION).doc(id).get();

    if (docSnap.exists) {
      const data = docSnap.data() as HandoverHistoryRecord;
      return {
        ...data,
        id: docSnap.id,
      };
    }
  } catch {
    // Check fallback store
  }

  return inMemoryHistoryStore.get(id) || null;
}

/**
 * Clears the in-memory history store (for testing purposes).
 */
export function clearInMemoryHistoryStore(): void {
  inMemoryHistoryStore.clear();
}
