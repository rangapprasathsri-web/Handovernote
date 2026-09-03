import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';
import { setFirestoreDbForTesting } from '../config/firebase.js';
import { fetch_and_filter_events } from '../services/generationService.js';
import {
  clearInMemoryHistoryStore,
  getHandoverHistoryById,
  listHandoverHistory,
  saveHandoverHistory,
} from '../services/historyService.js';
import { MockFirestore } from './mockFirestore.js';
import { Firestore } from 'firebase-admin/firestore';
import { HandoverNote } from '../models/handover.js';

describe('Handover History & Firestore Persistence (Goal 2 & 5)', () => {
  let mockDb: MockFirestore;

  beforeEach(() => {
    mockDb = new MockFirestore();
    setFirestoreDbForTesting(mockDb as unknown as Firestore);
    clearInMemoryHistoryStore();
  });

  test('1. Generation pipeline automatically persists note to Firestore with matching fingerprint', async () => {
    const request = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const result = await fetch_and_filter_events(request);
    assert.equal(result.status, 'ready');
    assert.ok(result.note);

    const snapshot = await mockDb.collection('handover_notes').get();
    assert.equal(snapshot.size, 1, 'Expected exactly 1 document in handover_notes');

    const savedDoc = snapshot.docs[0].data();
    assert.equal(savedDoc.fingerprint, result.note.fingerprint);
    assert.equal(savedDoc.timezone, 'Asia/Kolkata');
    assert.deepEqual(savedDoc.sources, ['ticketing', 'incidents']);
    assert.equal(
      (savedDoc.shift_window as { shift_start: string }).shift_start,
      '2026-09-03T17:00:00+05:30'
    );
    assert.equal(
      (savedDoc.shift_window as { shift_end: string }).shift_end,
      '2026-09-03T20:00:00+05:30'
    );
  });

  test('2. Subsequent run with same inputs updates/deduplicates rather than creating orphan duplicates', async () => {
    const request = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    // First run
    const result1 = await fetch_and_filter_events(request);
    assert.ok(result1.note);

    let snapshot = await mockDb.collection('handover_notes').get();
    assert.equal(snapshot.size, 1);
    const firstDocId = snapshot.docs[0].id;

    // Second run with identical inputs
    const result2 = await fetch_and_filter_events(request);
    assert.ok(result2.note);
    assert.equal(result1.note.fingerprint, result2.note.fingerprint);

    snapshot = await mockDb.collection('handover_notes').get();
    assert.equal(snapshot.size, 1, 'Document count must remain 1 after repeated generation of the same shift');
    assert.equal(snapshot.docs[0].id, firstDocId, 'Must update existing document rather than creating a duplicate');
  });

  test('3. listHandoverHistory returns paginated, sorted notes with filter support', async () => {
    // Manually save two notes with distinct sources and timestamps
    const noteA: HandoverNote = {
      title: 'Shift Handover Note A',
      shift_start: '2026-09-02T17:00:00+05:30',
      shift_end: '2026-09-02T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing'],
      source_display_names: ['Ticketing'],
      generated_at: '2026-09-02T20:01:00Z',
      fingerprint: 'fp_aaaa_1111',
      sections: {
        'Completed': [],
        'In Progress': [],
        'Blockers / Escalations': [],
        'Watch-list': [],
      },
      ordered_sections: [],
      metrics: {
        records_reviewed: 1,
        events_in_shift: 1,
        records_represented: 1,
        updates_consolidated: 0,
        sources_with_warnings: 0,
      },
      overview: 'Shift completed with 1 record.',
      deduplicated_records: [],
      source_stats: [],
      warnings: [],
      errors: [],
      status: 'ready',
    };

    const noteB: HandoverNote = {
      ...noteA,
      title: 'Shift Handover Note B',
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      sources: ['incidents'],
      generated_at: '2026-09-03T20:01:00Z',
      fingerprint: 'fp_bbbb_2222',
    };

    await saveHandoverHistory(noteA);
    await saveHandoverHistory(noteB);

    // Test 3a: Sorting - Note B (Sep 3) should come before Note A (Sep 2)
    const listAll = await listHandoverHistory();
    assert.equal(listAll.total, 2);
    assert.equal(listAll.items[0].fingerprint, 'fp_bbbb_2222');
    assert.equal(listAll.items[1].fingerprint, 'fp_aaaa_1111');

    // Test 3b: Pagination
    const page1 = await listHandoverHistory({ page: 1, limit: 1 });
    assert.equal(page1.items.length, 1);
    assert.equal(page1.total, 2);
    assert.equal(page1.total_pages, 2);
    assert.equal(page1.items[0].fingerprint, 'fp_bbbb_2222');

    // Test 3c: Source Filtering
    const ticketingFilter = await listHandoverHistory({ source: 'ticketing' });
    assert.equal(ticketingFilter.total, 1);
    assert.equal(ticketingFilter.items[0].fingerprint, 'fp_aaaa_1111');

    const incidentsFilter = await listHandoverHistory({ source: 'incidents' });
    assert.equal(incidentsFilter.total, 1);
    assert.equal(incidentsFilter.items[0].fingerprint, 'fp_bbbb_2222');

    // Test 3d: Date Range Filtering
    const dateFiltered = await listHandoverHistory({
      startDate: '2026-09-03T00:00:00+05:30',
    });
    assert.equal(dateFiltered.total, 1);
    assert.equal(dateFiltered.items[0].fingerprint, 'fp_bbbb_2222');
  });

  test('4. getHandoverHistoryById retrieves expected note or null for invalid ID', async () => {
    const note: HandoverNote = {
      title: 'Shift Handover Note C',
      shift_start: '2026-09-03T09:00:00+05:30',
      shift_end: '2026-09-03T17:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing'],
      source_display_names: ['Ticketing'],
      generated_at: '2026-09-03T17:01:00Z',
      fingerprint: 'fp_cccc_3333',
      sections: {
        'Completed': [],
        'In Progress': [],
        'Blockers / Escalations': [],
        'Watch-list': [],
      },
      ordered_sections: [],
      metrics: {
        records_reviewed: 0,
        events_in_shift: 0,
        records_represented: 0,
        updates_consolidated: 0,
        sources_with_warnings: 0,
      },
      overview: 'No activity was recorded during the specified shift window across all configured sources.',
      deduplicated_records: [],
      source_stats: [],
      warnings: [],
      errors: [],
      status: 'ready',
    };

    const saved = await saveHandoverHistory(note);
    assert.ok(saved.id);

    // Retrieve by valid ID
    const found = await getHandoverHistoryById(saved.id);
    assert.ok(found);
    assert.equal(found?.id, saved.id);
    assert.equal(found?.title, 'Shift Handover Note C');
    assert.equal(found?.fingerprint, 'fp_cccc_3333');
    assert.ok(found?.note);
    assert.equal(found?.note.title, 'Shift Handover Note C');

    // Retrieve by non-existent ID
    const notFound = await getHandoverHistoryById('non_existent_id');
    assert.equal(notFound, null);
  });
});
