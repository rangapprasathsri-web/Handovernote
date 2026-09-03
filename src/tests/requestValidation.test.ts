import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { validateGenerationRequest } from '../models/generation.js';

describe('Generation Request Validation', () => {
  // Test 13: Valid generation-request validation
  test('passes validation for a valid timezone-aware generation request', () => {
    const validRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const result = validateGenerationRequest(validRequest);
    assert.equal(result.valid, true, 'Expected valid request to pass');
    assert.equal(result.errors.length, 0);
  });

  // Test 14: Rejection when shift end is before or equal to shift start
  test('rejects request when shift end is before shift start', () => {
    const invalidRequest = {
      shift_start: '2026-09-03T20:00:00+05:30',
      shift_end: '2026-09-03T17:00:00+05:30', // End is before start
      timezone: 'Asia/Kolkata',
      sources: ['ticketing'],
    };

    const result = validateGenerationRequest(invalidRequest);
    assert.equal(result.valid, false, 'Expected inverted time range to be rejected');
    assert.ok(
      result.errors.some((err) => err.includes('Shift end') && err.includes('after shift start')),
      `Expected chronological order error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('rejects request when shift end is equal to shift start', () => {
    const invalidRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T17:00:00+05:30', // Equal timestamps
      timezone: 'Asia/Kolkata',
      sources: ['ticketing'],
    };

    const result = validateGenerationRequest(invalidRequest);
    assert.equal(result.valid, false, 'Expected equal start/end to be rejected');
    assert.ok(
      result.errors.some((err) => err.includes('after shift start')),
      `Expected chronological order error, got: ${JSON.stringify(result.errors)}`
    );
  });

  // Test 15: Rejection when no source is selected
  test('rejects request when no source is selected (empty array)', () => {
    const noSourcesRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: [],
    };

    const result = validateGenerationRequest(noSourcesRequest);
    assert.equal(result.valid, false, 'Expected empty sources array to be rejected');
    assert.ok(
      result.errors.some((err) => err.includes('At least one source must be selected')),
      `Expected source selection error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('rejects request when timestamp is naive/ambiguous without timezone offset', () => {
    const naiveRequest = {
      shift_start: '2026-09-03T17:00:00', // Missing timezone offset/Z
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing'],
    };

    const result = validateGenerationRequest(naiveRequest);
    assert.equal(result.valid, false, 'Expected naive timestamp to be rejected');
    assert.ok(
      result.errors.some((err) => err.includes('timezone-aware ISO 8601')),
      `Expected timezone-aware error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('rejects request when timezone is invalid', () => {
    const invalidTzRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Invalid/City_Name_XYZ',
      sources: ['ticketing'],
    };

    const result = validateGenerationRequest(invalidTzRequest);
    assert.equal(result.valid, false, 'Expected invalid timezone to be rejected');
    assert.ok(
      result.errors.some((err) => err.includes('Invalid timezone')),
      `Expected timezone error, got: ${JSON.stringify(result.errors)}`
    );
  });
});
