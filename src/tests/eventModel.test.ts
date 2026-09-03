import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  isTimezoneAwareIso8601,
  NormalizedEvent,
  validateNormalizedEvent,
} from '../models/events.js';
import { incidentsAdapter } from '../sources/incidentsAdapter.js';
import { ticketingAdapter } from '../sources/ticketingAdapter.js';

describe('Normalized Event Contract & Validation', () => {
  // Test 17: Validation of a normalized event with all required fields
  test('validates a normalized event with all required fields (Test 17)', () => {
    const validEvent: NormalizedEvent = {
      source: 'ticketing',
      record_id: 'OPS-4821',
      timestamp: '2026-09-03T19:42:00+05:30',
      summary: 'Customer reported login failures on mobile app',
      status: 'open',
      priority: 'high',
      owner: null,
      severity: 'high',
      details: 'Root cause not yet found',
    };

    const result = validateNormalizedEvent(validEvent);
    assert.equal(result.valid, true, 'Normalized event should pass validation');
    assert.equal(result.errors.length, 0);
  });

  // Test 18: Rejection of an event with a missing record ID or invalid timestamp
  test('rejects an event with a missing record ID (Test 18)', () => {
    const missingRecordIdEvent = {
      source: 'ticketing',
      record_id: '', // Missing record ID
      timestamp: '2026-09-03T19:42:00+05:30',
      summary: 'Customer reported login failures',
      status: 'open',
    };

    const result = validateNormalizedEvent(missingRecordIdEvent);
    assert.equal(result.valid, false, 'Expected event with empty record_id to be rejected');
    assert.ok(
      result.errors.some((err) => err.includes("Field 'record_id' is required")),
      `Expected record_id error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('rejects an event with a missing timestamp (Test 18)', () => {
    const missingTimestampEvent = {
      source: 'ticketing',
      record_id: 'OPS-4821',
      timestamp: '',
      summary: 'Customer reported login failures',
      status: 'open',
    };

    const result = validateNormalizedEvent(missingTimestampEvent);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((err) => err.includes("Field 'timestamp' is required")));
  });

  test('rejects an event with an ambiguous/naive timestamp lacking timezone offset (Test 18)', () => {
    const naiveTimestampEvent = {
      source: 'ticketing',
      record_id: 'OPS-4821',
      timestamp: '2026-09-03T19:42:00', // Ambiguous local timestamp
      summary: 'Customer reported login failures',
      status: 'open',
    };

    const result = validateNormalizedEvent(naiveTimestampEvent);
    assert.equal(result.valid, false, 'Expected ambiguous local timestamp to be rejected');
    assert.ok(
      result.errors.some((err) => err.includes('timezone-aware ISO 8601')),
      `Expected timezone error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('timezone helper isTimezoneAwareIso8601 accurately detects valid and invalid formats', () => {
    // Valid timezone-aware timestamps
    assert.equal(isTimezoneAwareIso8601('2026-09-03T19:42:00+05:30'), true);
    assert.equal(isTimezoneAwareIso8601('2026-09-03T14:12:00Z'), true);
    assert.equal(isTimezoneAwareIso8601('2026-09-03T10:00:00-07:00'), true);
    assert.equal(isTimezoneAwareIso8601('2026-09-03T10:00:00.123+05:30'), true);

    // Invalid / naive timestamps
    assert.equal(isTimezoneAwareIso8601('2026-09-03T19:42:00'), false); // No TZ offset
    assert.equal(isTimezoneAwareIso8601('2026-09-03 19:42:00'), false);
    assert.equal(isTimezoneAwareIso8601('09/03/2026 19:42'), false);
    assert.equal(isTimezoneAwareIso8601('invalid-timestamp'), false);
    assert.equal(isTimezoneAwareIso8601(''), false);
  });

  test('ticketing adapter normalizeEvent produces a valid NormalizedEvent', () => {
    const rawTicket = {
      ticket_id: 'OPS-4821',
      created_at: '2026-09-03T19:42:00+05:30',
      subject: 'Customer reported login failures on mobile app',
      ticket_status: 'open',
      urgency: 'high',
      assignee: null,
      severity_level: 'high',
      description: 'Root cause not yet found',
    };

    const normalized = ticketingAdapter.normalizeEvent(rawTicket);
    const validation = validateNormalizedEvent(normalized);
    assert.equal(validation.valid, true);
    assert.equal(normalized.source, 'ticketing');
    assert.equal(normalized.record_id, 'OPS-4821');
    assert.equal(normalized.status, 'open');
    assert.equal(normalized.priority, 'high');
  });

  test('incidents adapter normalizeEvent produces a valid NormalizedEvent', () => {
    const rawIncident = {
      incident_id: 'INC-9101',
      reported_at: '2026-09-03T17:35:00+05:30',
      headline: 'Major latency spike on payment webhook processing',
      incident_state: 'investigating',
      priority: 'critical',
      severity: 'p1',
      incident_commander: 'ananya.sharma@example.com',
      impact_summary: 'Downstream bank gateway slow response',
    };

    const normalized = incidentsAdapter.normalizeEvent(rawIncident);
    const validation = validateNormalizedEvent(normalized);
    assert.equal(validation.valid, true);
    assert.equal(normalized.source, 'incidents');
    assert.equal(normalized.record_id, 'INC-9101');
    assert.equal(normalized.severity, 'p1');
  });
});
