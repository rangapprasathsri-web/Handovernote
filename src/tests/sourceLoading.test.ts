import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { getSourceConfigById } from '../sources/registry.js';
import { incidentsAdapter } from '../sources/incidentsAdapter.js';
import { ticketingAdapter } from '../sources/ticketingAdapter.js';

describe('Source Loading (Test 16)', () => {
  test('successfully loads ticketing seeded source data', async () => {
    const config = getSourceConfigById('ticketing');
    assert.ok(config, 'Ticketing config should exist in registry');

    const records = await ticketingAdapter.loadSourceEvents(config);
    assert.ok(Array.isArray(records), 'Expected records to be an array');
    assert.ok(records.length >= 5, `Expected at least 5 ticketing records, got ${records.length}`);

    // Verify key fixture scenarios
    const recordIds = records.map((r) => r.ticket_id);
    assert.ok(recordIds.includes('OPS-4821'), 'Expected OPS-4821 in ticketing records');
    assert.ok(recordIds.includes('OPS-4822'), 'Expected OPS-4822 (blocker) in records');

    // Verify multiple updates to the same record exist in ticketing fixture
    const ops4821Matches = records.filter((r) => r.ticket_id === 'OPS-4821');
    assert.ok(
      ops4821Matches.length >= 2,
      `Expected multiple updates to OPS-4821, found ${ops4821Matches.length}`
    );
  });

  test('successfully loads incidents seeded source data', async () => {
    const config = getSourceConfigById('incidents');
    assert.ok(config, 'Incidents config should exist in registry');

    const records = await incidentsAdapter.loadSourceEvents(config);
    assert.ok(Array.isArray(records), 'Expected records to be an array');
    assert.ok(records.length >= 5, `Expected at least 5 incident records, got ${records.length}`);

    // Verify key fixture scenarios
    const recordIds = records.map((r) => r.incident_id);
    assert.ok(recordIds.includes('INC-9101'), 'Expected INC-9101 (critical incident) in records');

    // Verify multiple updates to same incident
    const inc9102Matches = records.filter((r) => r.incident_id === 'INC-9102');
    assert.ok(
      inc9102Matches.length >= 2,
      `Expected multiple updates to INC-9102, found ${inc9102Matches.length}`
    );
  });
});
