import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  GenerationValidationError,
  fetch_and_filter_events,
  orchestrateGeneration,
} from '../services/generationService.js';

describe('Generation Service & Step 2 Filtering', () => {
  test('returns expected structured GenerationResult with filtered in-window events', async () => {
    const request = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const result = await orchestrateGeneration(request);

    // 1. Check status and basic attributes
    assert.equal(result.status, 'ready');
    assert.equal(result.shift_start, request.shift_start);
    assert.equal(result.shift_end, request.shift_end);
    assert.equal(result.timezone, request.timezone);

    // 2. Check items and events contain normalized in-window events
    assert.ok(Array.isArray(result.items), 'items must be an array');
    assert.ok(Array.isArray(result.events), 'events must be an array');
    assert.equal(result.items, result.events, 'items and events should reference the same array');
    assert.equal(result.events.length, 12, `Expected 12 in-window events, got ${result.events.length}`);

    // Verify all in-window events are strictly within [shift_start, shift_end)
    const startMs = Date.parse(request.shift_start);
    const endMs = Date.parse(request.shift_end);
    for (const evt of result.events) {
      const evtMs = Date.parse(evt.normalized_timestamp_utc || evt.timestamp);
      assert.ok(
        evtMs >= startMs && evtMs < endMs,
        `Event ${evt.record_id} at ${evt.timestamp} should be within [start, end)`
      );
    }

    // 3. Check source_stats structure and record counts
    assert.ok(Array.isArray(result.source_stats), 'source_stats must be an array');
    assert.equal(result.source_stats.length, 2, 'Should have stats for 2 sources');

    const ticketingStat = result.source_stats.find((s) => s.source_id === 'ticketing');
    assert.ok(ticketingStat, 'Must include ticketing stats');
    assert.ok(ticketingStat.status === 'ok' || ticketingStat.status === 'success');
    assert.equal(ticketingStat.fetched, 10);
    assert.equal(ticketingStat.included, 6);
    assert.equal(ticketingStat.excluded, 3);
    assert.equal(ticketingStat.skipped, 1);

    const incidentsStat = result.source_stats.find((s) => s.source_id === 'incidents');
    assert.ok(incidentsStat, 'Must include incidents stats');
    assert.ok(incidentsStat.status === 'ok' || incidentsStat.status === 'success');
    assert.equal(incidentsStat.fetched, 10);
    assert.equal(incidentsStat.included, 6);
    assert.equal(incidentsStat.excluded, 3);
    assert.equal(incidentsStat.skipped, 1);

    // 4. Check structured warnings
    assert.ok(Array.isArray(result.warnings), 'warnings must be an array');
    assert.ok(
      result.warnings.some((w) => w.code === 'STEP_2_FILTERING_COMPLETE'),
      'Should contain STEP_2_FILTERING_COMPLETE notice'
    );
    assert.ok(
      result.warnings.some((w) => w.code === 'RECORD_SKIPPED_MALFORMED'),
      'Should contain RECORD_SKIPPED_MALFORMED notice for fixture malformed records'
    );

    // 5. Check metadata
    assert.ok(result.meta, 'meta object should be present');
    assert.ok(result.meta.generated_at, 'generated_at should be present');
    assert.ok(typeof result.meta.duration_ms === 'number');
  });

  test('throws GenerationValidationError when request is invalid', async () => {
    const invalidRequest = {
      shift_start: '2026-09-03T20:00:00+05:30',
      shift_end: '2026-09-03T17:00:00+05:30', // inverted
      timezone: 'Asia/Kolkata',
      sources: ['ticketing'],
    };

    await assert.rejects(
      async () => {
        await orchestrateGeneration(invalidRequest);
      },
      (err: any) => {
        assert.ok(err instanceof GenerationValidationError);
        assert.ok(err.errors.length > 0);
        return true;
      }
    );
  });

  test('gracefully handles unconfigured source with structured warning', async () => {
    const requestWithUnknownSource = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'unknown_slack_channel'],
    };

    const result = await orchestrateGeneration(requestWithUnknownSource);
    assert.equal(result.status, 'ready');

    const unknownStat = result.source_stats.find((s) => s.source_id === 'unknown_slack_channel');
    assert.ok(unknownStat, 'Should report stat for unknown source');
    assert.equal(unknownStat.status, 'error');

    const warning = result.warnings.find((w) => w.source === 'unknown_slack_channel');
    assert.ok(warning, 'Should generate structured warning for unconfigured source');
    assert.equal(warning.code, 'SOURCE_NOT_CONFIGURED');
  });
});
