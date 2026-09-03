import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';
import { setFirestoreDbForTesting } from '../config/firebase.js';
import {
  FirestoreAdapter,
  FirestoreNormalizationError,
  firestoreAdapter,
  load_records,
  normalize_record,
} from '../sources/firestoreAdapter.js';
import {
  clearDynamicSourceConfigs,
  registerDynamicSourceConfig,
} from '../sources/firestoreSourceRegistry.js';
import { fetch_and_filter_events } from '../services/generationService.js';
import { MockFirestore } from './mockFirestore.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { Firestore } from 'firebase-admin/firestore';

describe('Firestore Source Adapter (Goal 1 & 5)', () => {
  let mockDb: MockFirestore;

  beforeEach(() => {
    mockDb = new MockFirestore();
    setFirestoreDbForTesting(mockDb as unknown as Firestore);
    clearDynamicSourceConfigs();
  });

  describe('1. load_records from Firestore collection', () => {
    test('successfully loads documents and preserves document IDs', async () => {
      // Seed mock collection
      await mockDb.collection('live_alerts').doc('ALERT-101').set({
        summary: 'High CPU on ingress gateway',
        status: 'open',
        timestamp: '2026-09-03T18:00:00+05:30',
        priority: 'high',
        severity: 'p2',
      });

      await mockDb.collection('live_alerts').doc('ALERT-102').set({
        summary: 'Disk space warning on db node',
        status: 'investigating',
        timestamp: '2026-09-03T18:30:00+05:30',
        priority: 'medium',
      });

      const config: SourceConfig = {
        id: 'alerts_source',
        name: 'Live Alerts Stream',
        type: 'firestore',
        collection: 'live_alerts',
        enabled: true,
      };

      const records = await firestoreAdapter.load_records(config);
      assert.equal(records.length, 2);

      const alert101 = records.find((r) => r.id === 'ALERT-101');
      assert.ok(alert101, 'Expected ALERT-101 in loaded records');
      assert.equal(alert101?.summary, 'High CPU on ingress gateway');
      assert.equal(alert101?.record_id, 'ALERT-101');
      assert.equal(alert101?.source, 'alerts_source');

      // Test alias function load_records
      const recordsAlias = await load_records(config);
      assert.equal(recordsAlias.length, 2);
    });

    test('throws error if collection configuration is missing', async () => {
      const invalidConfig = {
        id: 'bad_source',
        name: 'Bad Source',
        type: 'firestore' as const,
        enabled: true,
      };

      await assert.rejects(
        async () => {
          await firestoreAdapter.load_records(invalidConfig as SourceConfig);
        },
        /missing required 'collection'/i
      );
    });
  });

  describe('2. normalize_record contract validation', () => {
    test('normalizes a valid Firestore document with ISO offset timestamp', () => {
      const raw = {
        id: 'DOC-501',
        summary: 'Core switch firmware verified',
        status: 'resolved',
        timestamp: '2026-09-03T18:30:00+05:30',
        priority: 'high',
        severity: 'p2',
        owner: 'network-oncall@example.com',
        details: 'Switch firmware 14.2 patched cleanly without dropped frames.',
        source: 'firestore_network',
      };

      const event = normalize_record(raw, 'Asia/Kolkata');

      assert.equal(event.record_id, 'DOC-501');
      assert.equal(event.summary, 'Core switch firmware verified');
      assert.equal(event.status, 'resolved');
      assert.equal(event.priority, 'high');
      assert.equal(event.severity, 'p2');
      assert.equal(event.owner, 'network-oncall@example.com');
      assert.equal(event.source, 'firestore_network');
      assert.equal(event.original_timestamp, '2026-09-03T18:30:00+05:30');
      assert.equal(event.timestamp, '2026-09-03T18:30:00+05:30');
      assert.equal(event.normalized_timestamp_utc, '2026-09-03T13:00:00.000Z');
    });

    test('supports Firestore Timestamp objects with toDate() method', () => {
      const raw = {
        id: 'TS-999',
        title: 'Kafka broker rebalance complete',
        state: 'closed',
        timestamp: {
          toDate: () => new Date('2026-09-03T14:00:00Z'),
        },
      };

      const event = normalize_record(raw, 'Asia/Kolkata');
      assert.equal(event.record_id, 'TS-999');
      assert.equal(event.summary, 'Kafka broker rebalance complete');
      assert.equal(event.status, 'closed');
      assert.equal(event.normalized_timestamp_utc, '2026-09-03T14:00:00.000Z');
      assert.equal(event.timestamp, '2026-09-03T19:30:00+05:30');
    });

    test('throws FirestoreNormalizationError when summary is missing', () => {
      const raw = {
        id: 'ERR-01',
        status: 'open',
        timestamp: '2026-09-03T18:00:00+05:30',
      };

      assert.throws(
        () => normalize_record(raw),
        (err) => err instanceof FirestoreNormalizationError && /missing required field 'summary'/i.test(err.message)
      );
    });

    test('throws FirestoreNormalizationError when status is missing', () => {
      const raw = {
        id: 'ERR-02',
        summary: 'Something happened',
        timestamp: '2026-09-03T18:00:00+05:30',
      };

      assert.throws(
        () => normalize_record(raw),
        (err) => err instanceof FirestoreNormalizationError && /missing required field 'status'/i.test(err.message)
      );
    });

    test('throws FirestoreNormalizationError when timestamp is invalid or unparseable', () => {
      const raw = {
        id: 'ERR-03',
        summary: 'Malformed event',
        status: 'open',
        timestamp: 'unparseable-date',
      };

      assert.throws(
        () => normalize_record(raw),
        (err) => err instanceof FirestoreNormalizationError && /invalid timestamp/i.test(err.message)
      );
    });

    test('throws FirestoreNormalizationError when timestamp is missing', () => {
      const raw = {
        id: 'ERR-04',
        summary: 'Missing timestamp event',
        status: 'open',
      };

      assert.throws(
        () => normalize_record(raw),
        (err) => err instanceof FirestoreNormalizationError && /missing required timestamp/i.test(err.message)
      );
    });
  });

  describe('3. Integration with fetch_and_filter_events pipeline', () => {
    test('Firestore source participates in filtering, deduplication, and 4-section classification', async () => {
      // Setup dynamic Firestore source
      const firestoreConfig: SourceConfig = {
        id: 'live_ops',
        name: 'Live Operations Cloud Stream',
        type: 'firestore',
        collection: 'live_operations',
        enabled: true,
      };
      registerDynamicSourceConfig(firestoreConfig);

      // Seed 4 records:
      // 1. In-shift resolved task (17:15) -> completed_work
      await mockDb.collection('live_operations').doc('OPS-FIRE-01').set({
        summary: 'SSL edge certificates renewed',
        status: 'resolved',
        timestamp: '2026-09-03T17:15:00+05:30',
        priority: 'low',
        owner: 'security@example.com',
      });

      // 2. In-shift critical escalated blocker (18:10) -> blockers_escalations
      await mockDb.collection('live_operations').doc('OPS-FIRE-02').set({
        summary: 'Payment gateway auth failing',
        status: 'escalated',
        timestamp: '2026-09-03T18:10:00+05:30',
        priority: 'critical',
        severity: 'p1',
        owner: 'oncall@example.com',
      });

      // 3. Duplicate update to OPS-FIRE-02 with later timestamp (18:45) -> verifies dedup retains latest
      await mockDb.collection('live_operations').doc('OPS-FIRE-02-UPD').set({
        record_id: 'OPS-FIRE-02',
        summary: 'Payment gateway auth failing (upstream bank contacted)',
        status: 'escalated',
        timestamp: '2026-09-03T18:45:00+05:30',
        priority: 'critical',
        severity: 'p1',
        owner: 'oncall-lead@example.com',
      });

      // 4. Out-of-shift record after shift_end (20:30) -> should be excluded by shift window
      await mockDb.collection('live_operations').doc('OPS-FIRE-03').set({
        summary: 'Post-shift nightly health check',
        status: 'open',
        timestamp: '2026-09-03T20:30:00+05:30',
      });

      const generationResult = await fetch_and_filter_events({
        shift_start: '2026-09-03T17:00:00+05:30',
        shift_end: '2026-09-03T20:00:00+05:30',
        timezone: 'Asia/Kolkata',
        sources: ['live_ops'],
      });

      assert.equal(generationResult.status, 'ready');
      assert.ok(generationResult.note, 'Expected HandoverNote to be generated');

      // Check shift boundaries: OPS-FIRE-03 after 20:00 must be excluded
      const sourceStats = generationResult.source_stats.find((s) => s.source === 'live_ops');
      assert.ok(sourceStats);
      assert.equal(sourceStats?.fetched, 4);
      assert.equal(sourceStats?.included, 3);
      assert.equal(sourceStats?.excluded, 1);

      // Check deduplication: OPS-FIRE-02 had 2 updates, deduplicated to 1 latest record
      assert.equal(generationResult.note.metrics.records_represented, 2);
      assert.equal(generationResult.note.metrics.updates_consolidated, 1);

      // Check 4-section classification:
      // OPS-FIRE-01 (resolved) -> Completed
      // OPS-FIRE-02 (escalated/p1) -> Blockers / Escalations
      const completedSection = generationResult.note.sections['Completed'];
      assert.ok(completedSection.some((item) => item.record_id === 'OPS-FIRE-01'));

      const blockersSection = generationResult.note.sections['Blockers / Escalations'];
      assert.ok(blockersSection.some((item) => item.record_id === 'OPS-FIRE-02'));
      // Verify deduplication chose the latest summary from 18:45
      const blockerItem = blockersSection.find((item) => item.record_id === 'OPS-FIRE-02');
      assert.match(blockerItem?.item || blockerItem?.raw_record?.latest_summary || '', /upstream bank contacted/);
    });
  });
});
