import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { validateNormalizedEvent } from '../models/events.js';
import { GenerationRequest } from '../models/generation.js';
import { SourceConfig } from '../models/sourceConfig.js';
import {
  fetch_and_filter_events,
  orchestrateGeneration,
} from '../services/generationService.js';
import { IncidentAdapter, incidentsAdapter } from '../sources/incidentsAdapter.js';
import { getSourceConfigById } from '../sources/registry.js';
import { TicketingAdapter, ticketingAdapter } from '../sources/ticketingAdapter.js';
import {
  isWithinShiftWindow,
  normalizeTimestamp,
} from '../utils/timestampNormalizer.js';

describe('Step 2: Source Adapters, Timestamp Normalization & Shift-Window Pipeline', () => {
  // Test 17: Each source adapter loads valid local records
  test('17. Each source adapter loads valid local records', async () => {
    const ticketConfig = getSourceConfigById('ticketing')!;
    assert.ok(ticketConfig, 'Ticketing config must exist');
    const ticketRecords = await ticketingAdapter.load_records(ticketConfig);
    assert.ok(Array.isArray(ticketRecords));
    assert.ok(ticketRecords.length >= 8, `Expected at least 8 ticketing records, got ${ticketRecords.length}`);

    const incidentConfig = getSourceConfigById('incidents')!;
    assert.ok(incidentConfig, 'Incidents config must exist');
    const incidentRecords = await incidentsAdapter.load_records(incidentConfig);
    assert.ok(Array.isArray(incidentRecords));
    assert.ok(incidentRecords.length >= 8, `Expected at least 8 incident records, got ${incidentRecords.length}`);
  });

  // Test 18: Each adapter maps its records to the normalized event contract
  test('18. Each adapter maps its records to the normalized event contract', () => {
    const rawTicket = {
      ticket_id: 'OPS-4821',
      created_at: '2026-09-03T19:42:00+05:30',
      subject: 'Customer reported login failures on mobile app',
      ticket_status: 'in_progress',
      urgency: 'high',
      assignee: 'vikram.singh@example.com',
      severity_level: 'high',
      description: 'Investigating OAuth latency',
      tags: ['auth'],
    };

    const normalizedTicket = ticketingAdapter.normalize_record(rawTicket);
    const ticketValidation = validateNormalizedEvent(normalizedTicket);
    assert.equal(ticketValidation.valid, true, `Validation failed: ${ticketValidation.errors.join('; ')}`);
    assert.equal(normalizedTicket.source, 'ticketing');
    assert.equal(normalizedTicket.record_id, 'OPS-4821');
    assert.equal(normalizedTicket.summary, 'Customer reported login failures on mobile app');
    assert.equal(normalizedTicket.status, 'in_progress');
    assert.equal(normalizedTicket.priority, 'high');
    assert.equal(normalizedTicket.owner, 'vikram.singh@example.com');

    const rawIncident = {
      incident_id: 'INC-9101',
      reported_at: '2026-09-03T17:35:00+05:30',
      headline: 'Major latency spike on payment webhook processing',
      incident_state: 'investigating',
      priority: 'critical',
      severity: 'p1',
      incident_commander: 'ananya.sharma@example.com',
      impact_summary: 'Downstream bank gateway returning 504',
      subsystem: 'payments',
    };

    const normalizedIncident = incidentsAdapter.normalize_record(rawIncident);
    const incidentValidation = validateNormalizedEvent(normalizedIncident);
    assert.equal(incidentValidation.valid, true, `Validation failed: ${incidentValidation.errors.join('; ')}`);
    assert.equal(normalizedIncident.source, 'incidents');
    assert.equal(normalizedIncident.record_id, 'INC-9101');
    assert.equal(normalizedIncident.summary, 'Major latency spike on payment webhook processing');
    assert.equal(normalizedIncident.status, 'investigating');
    assert.equal(normalizedIncident.severity, 'p1');
    assert.equal(normalizedIncident.owner, 'ananya.sharma@example.com');
  });

  // Test 19: A valid timezone-aware timestamp is normalized correctly
  test('19. A valid timezone-aware timestamp is normalized correctly', () => {
    const rawTs = '2026-09-03T19:42:00+05:30';
    const result = normalizeTimestamp(rawTs, 'Asia/Kolkata');

    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.original, rawTs);
      assert.equal(result.utcIso, '2026-09-03T14:12:00.000Z');
      assert.equal(result.epochMs, Date.parse('2026-09-03T14:12:00.000Z'));
      assert.ok(result.timezoneIso.includes('+05:30'));
    }

    // Also verify UTC timestamp
    const utcTs = '2026-09-03T14:12:00Z';
    const utcResult = normalizeTimestamp(utcTs, 'Asia/Kolkata');
    assert.equal(utcResult.valid, true);
    if (utcResult.valid) {
      assert.equal(utcResult.utcIso, '2026-09-03T14:12:00.000Z');
      assert.equal(utcResult.epochMs, result.valid ? result.epochMs : 0);
    }
  });

  // Test 20: A malformed timestamp is skipped and logged
  test('20. A malformed timestamp is skipped and logged', async () => {
    const malformedTs = 'invalid-timestamp-string';
    const normResult = normalizeTimestamp(malformedTs);
    assert.equal(normResult.valid, false);

    // Verify in generation pipeline: OPS-4899 in ticketing.json has 'invalid-timestamp-format'
    const request: GenerationRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing'],
    };

    const result = await fetch_and_filter_events(request);
    const ticketingStat = result.source_stats.find((s) => s.source_id === 'ticketing')!;
    assert.ok(ticketingStat.skipped_malformed_count >= 1, 'Expected at least 1 skipped malformed record');

    const malformedWarning = result.warnings.find(
      (w) => w.code === 'RECORD_SKIPPED_MALFORMED' && w.record_id === 'OPS-4899'
    );
    assert.ok(malformedWarning, 'Expected diagnostic warning logged for malformed record OPS-4899');
  });

  // Test 21: A missing timestamp is skipped and logged
  test('21. A missing timestamp is skipped and logged', () => {
    const nullResult = normalizeTimestamp(null);
    assert.equal(nullResult.valid, false);

    const emptyResult = normalizeTimestamp('');
    assert.equal(emptyResult.valid, false);

    assert.throws(() => {
      ticketingAdapter.normalize_record({
        ticket_id: 'OPS-MISSING-TS',
        created_at: '',
        subject: 'No timestamp ticket',
        ticket_status: 'open',
      });
    });
  });

  // Test 22: An event before shift_start is excluded
  test('22. An event before shift_start is excluded', () => {
    const shiftStartMs = Date.parse('2026-09-03T17:00:00+05:30');
    const shiftEndMs = Date.parse('2026-09-03T20:00:00+05:30');

    // OPS-4810 at 09:15:00+05:30 is before shift_start
    const eventBeforeMs = Date.parse('2026-09-03T09:15:00+05:30');
    assert.equal(isWithinShiftWindow(eventBeforeMs, shiftStartMs, shiftEndMs), false);
  });

  // Test 23: An event exactly at shift_start is included
  test('23. An event exactly at shift_start is included (shift_start <= event_timestamp)', () => {
    const shiftStartMs = Date.parse('2026-09-03T17:00:00+05:30');
    const shiftEndMs = Date.parse('2026-09-03T20:00:00+05:30');

    // Exactly at 17:00:00+05:30
    const exactStartMs = Date.parse('2026-09-03T17:00:00+05:30');
    assert.equal(
      isWithinShiftWindow(exactStartMs, shiftStartMs, shiftEndMs),
      true,
      'Event exactly at shift_start MUST be included by inclusive lower bound'
    );
  });

  // Test 24: An event inside the shift is included
  test('24. An event inside the shift is included', () => {
    const shiftStartMs = Date.parse('2026-09-03T17:00:00+05:30');
    const shiftEndMs = Date.parse('2026-09-03T20:00:00+05:30');

    // Mid shift at 18:15:00+05:30
    const insideMs = Date.parse('2026-09-03T18:15:00+05:30');
    assert.equal(isWithinShiftWindow(insideMs, shiftStartMs, shiftEndMs), true);
  });

  // Test 25: An event exactly at shift_end is excluded
  test('25. An event exactly at shift_end is excluded (event_timestamp < shift_end)', () => {
    const shiftStartMs = Date.parse('2026-09-03T17:00:00+05:30');
    const shiftEndMs = Date.parse('2026-09-03T20:00:00+05:30');

    // Exactly at 20:00:00+05:30
    const exactEndMs = Date.parse('2026-09-03T20:00:00+05:30');
    assert.equal(
      isWithinShiftWindow(exactEndMs, shiftStartMs, shiftEndMs),
      false,
      'Event exactly at shift_end MUST be excluded by exclusive upper bound'
    );
  });

  // Test 26: An event after shift_end is excluded
  test('26. An event after shift_end is excluded', () => {
    const shiftStartMs = Date.parse('2026-09-03T17:00:00+05:30');
    const shiftEndMs = Date.parse('2026-09-03T20:00:00+05:30');

    // OPS-4830 at 23:30:00+05:30 is after shift_end
    const afterMs = Date.parse('2026-09-03T23:30:00+05:30');
    assert.equal(isWithinShiftWindow(afterMs, shiftStartMs, shiftEndMs), false);
  });

  // Test 27: UTC and +05:30 timestamps representing the same instant are compared consistently
  test('27. UTC and +05:30 timestamps representing the same instant are compared consistently', () => {
    // 2026-09-03T19:42:00+05:30 and 2026-09-03T14:12:00Z are the exact same physical instant
    const istNorm = normalizeTimestamp('2026-09-03T19:42:00+05:30');
    const utcNorm = normalizeTimestamp('2026-09-03T14:12:00Z');

    assert.equal(istNorm.valid, true);
    assert.equal(utcNorm.valid, true);
    if (istNorm.valid && utcNorm.valid) {
      assert.equal(istNorm.epochMs, utcNorm.epochMs);
      assert.equal(istNorm.utcIso, utcNorm.utcIso);
    }

    // Both should evaluate identically in the shift window
    const shiftStartMs = Date.parse('2026-09-03T17:00:00+05:30');
    const shiftEndMs = Date.parse('2026-09-03T20:00:00+05:30');
    if (istNorm.valid && utcNorm.valid) {
      assert.equal(isWithinShiftWindow(istNorm.epochMs, shiftStartMs, shiftEndMs), true);
      assert.equal(isWithinShiftWindow(utcNorm.epochMs, shiftStartMs, shiftEndMs), true);
    }
  });

  // Test 28: An unavailable source does not crash healthy-source processing
  test('28. An unavailable source does not crash healthy-source processing', async () => {
    // Request healthy source 'ticketing' alongside non-existent source 'missing_pagerduty'
    const request: GenerationRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'missing_pagerduty'],
    };

    const result = await fetch_and_filter_events(request);
    assert.equal(result.status, 'ready');

    // Healthy source ticketing should still succeed and populate events
    assert.ok(result.events.length > 0, 'Healthy ticketing events should still be processed');

    const missingStat = result.source_stats.find((s) => s.source_id === 'missing_pagerduty')!;
    assert.ok(missingStat, 'Should record stats entry for missing source');
    assert.equal(missingStat.status, 'error');

    const warning = result.warnings.find((w) => w.source === 'missing_pagerduty');
    assert.ok(warning, 'Should log structured warning for missing source');
  });

  // Test 29: An empty source produces zero events and a valid diagnostic result
  test('29. An empty source produces zero events and a valid diagnostic result', async () => {
    const request: GenerationRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['quiet_ops'],
    };

    const result = await fetch_and_filter_events(request);
    assert.equal(result.status, 'ready');
    assert.equal(result.events.length, 0, 'Empty source should produce 0 in-window events');
    assert.equal(result.items.length, 0);

    const quietStat = result.source_stats.find((s) => s.source_id === 'quiet_ops')!;
    assert.ok(quietStat, 'Should produce source_stats for quiet_ops');
    assert.equal(quietStat.fetched, 0);
    assert.equal(quietStat.included, 0);
    assert.equal(quietStat.excluded, 0);
    assert.equal(quietStat.skipped, 0);
  });

  // Test 30: Source statistics contain fetched, included, excluded, and skipped counts
  test('30. Source statistics contain fetched, included, excluded, and skipped counts', async () => {
    const request: GenerationRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const result = await fetch_and_filter_events(request);

    for (const stat of result.source_stats) {
      assert.ok(typeof stat.fetched === 'number' && stat.fetched >= 0);
      assert.ok(typeof stat.included === 'number' && stat.included >= 0);
      assert.ok(typeof stat.excluded === 'number' && stat.excluded >= 0);
      assert.ok(typeof stat.skipped === 'number' && stat.skipped >= 0);

      // Verify count conservation: fetched == included + excluded + skipped
      assert.equal(
        stat.fetched,
        stat.included + stat.excluded + stat.skipped,
        `Conservation failed for ${stat.source_name}: fetched (${stat.fetched}) !== included (${stat.included}) + excluded (${stat.excluded}) + skipped (${stat.skipped})`
      );
    }
  });

  // Test 31: The generation response preserves the Step 1 structured result contract
  test('31. The generation response preserves the Step 1 structured result contract', async () => {
    const request: GenerationRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing'],
    };

    const result = await orchestrateGeneration(request);

    // Contract keys from Step 1
    assert.ok('shift_start' in result);
    assert.ok('shift_end' in result);
    assert.ok('timezone' in result);
    assert.ok('items' in result);
    assert.ok('source_stats' in result);
    assert.ok('warnings' in result);
    assert.ok('status' in result);

    // Step 2 enrichment
    assert.ok('events' in result);
    assert.ok('errors' in result);
  });

  // Test 32: Repeated calls with unchanged input return the same filtered event list in the same order (deterministic ordering)
  test('32. Repeated calls with unchanged input return the same filtered event list in the same order', async () => {
    const request: GenerationRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const run1 = await fetch_and_filter_events(request);
    const run2 = await fetch_and_filter_events(request);

    assert.equal(run1.events.length, run2.events.length);

    for (let i = 0; i < run1.events.length; i++) {
      const e1 = run1.events[i];
      const e2 = run2.events[i];
      assert.equal(e1.record_id, e2.record_id);
      assert.equal(e1.source, e2.source);
      assert.equal(e1.timestamp, e2.timestamp);
      assert.equal(e1.status, e2.status);
    }

    // Verify ordering is strictly non-decreasing by epoch timestamp
    for (let i = 1; i < run1.events.length; i++) {
      const prevMs = Date.parse(run1.events[i - 1].normalized_timestamp_utc || run1.events[i - 1].timestamp);
      const currMs = Date.parse(run1.events[i].normalized_timestamp_utc || run1.events[i].timestamp);
      assert.ok(
        prevMs <= currMs,
        `Ordering violation at index ${i}: ${run1.events[i - 1].timestamp} should be <= ${run1.events[i].timestamp}`
      );
    }
  });

  // Integration test: End-to-end service execution
  test('Integration: Pipeline end-to-end execution filters shift events and populates boundary fixtures', async () => {
    const request: GenerationRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const result = await fetch_and_filter_events(request);

    // Verify boundary test fixtures in output
    const recordIds = result.events.map((e) => e.record_id);

    // Exact shift start (17:00:00) MUST BE INCLUDED
    assert.ok(recordIds.includes('OPS-4819'), 'OPS-4819 at exactly 17:00:00+05:30 must be included');
    assert.ok(recordIds.includes('INC-9099'), 'INC-9099 at exactly 17:00:00+05:30 must be included');

    // Exact shift end (20:00:00) MUST BE EXCLUDED
    assert.ok(!recordIds.includes('OPS-4825'), 'OPS-4825 at exactly 20:00:00+05:30 must be excluded');
    assert.ok(!recordIds.includes('INC-9105'), 'INC-9105 at exactly 20:00:00+05:30 must be excluded');

    // Before shift start MUST BE EXCLUDED
    assert.ok(!recordIds.includes('OPS-4810'), 'OPS-4810 at 09:15:00+05:30 must be excluded');
    assert.ok(!recordIds.includes('INC-9088'), 'INC-9088 yesterday must be excluded');

    // After shift end MUST BE EXCLUDED
    assert.ok(!recordIds.includes('OPS-4830'), 'OPS-4830 at 23:30:00+05:30 must be excluded');
    assert.ok(!recordIds.includes('INC-9120'), 'INC-9120 next morning must be excluded');

    // Malformed records MUST BE SKIPPED & LOGGED, not in events
    assert.ok(!recordIds.includes('OPS-4899'), 'OPS-4899 with malformed timestamp must be skipped');
    assert.ok(!recordIds.includes('INC-9199'), 'INC-9199 with naive timestamp must be skipped');
  });
});
