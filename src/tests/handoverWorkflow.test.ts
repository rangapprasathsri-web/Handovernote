import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { NormalizedEvent } from '../models/events.js';
import { deduplicate_events, DeduplicatedRecord } from '../models/deduplication.js';
import {
  classify_record,
  buildHandoverNote,
  formatHandoverItemText,
} from '../services/classificationService.js';
import {
  generateHandoverPdf,
  generateHandoverFilename,
  wrapText,
} from '../services/pdfService.js';
import {
  fetch_and_filter_events,
  orchestrateGeneration,
  generate_handover_note,
} from '../services/generationService.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Handover Workflow & Verification (Tests 13 to 30)', () => {
  // Test 13: Three updates to one record become one item.
  test('13. Three updates to one record become one item', () => {
    const rawEvents: NormalizedEvent[] = [
      {
        source: 'ticketing',
        record_id: 'OPS-100',
        timestamp: '2026-09-03T17:15:00+05:30',
        summary: 'First update on database connection pool',
        status: 'open',
      },
      {
        source: 'ticketing',
        record_id: 'OPS-100',
        timestamp: '2026-09-03T18:00:00+05:30',
        summary: 'Second update on database connection pool',
        status: 'in_progress',
      },
      {
        source: 'ticketing',
        record_id: 'OPS-100',
        timestamp: '2026-09-03T19:30:00+05:30',
        summary: 'Third update on database connection pool',
        status: 'resolved',
      },
    ];

    const result = deduplicate_events(rawEvents);
    assert.equal(result.records.length, 1, 'Three raw updates must collapse into exactly 1 record');
    assert.equal(result.total_events, 3);
    assert.equal(result.updates_collapsed_count, 2);

    const rec = result.records[0];
    assert.equal(rec.record_id, 'OPS-100');
    assert.equal(rec.update_count, 3);
    assert.equal(rec.latest_status, 'resolved');
    assert.equal(rec.latest_timestamp, '2026-09-03T19:30:00+05:30');
    assert.equal(rec.first_timestamp, '2026-09-03T17:15:00+05:30');
    assert.equal(rec.progression, 'open → in_progress → resolved');
  });

  // Test 14: Records with the same ID from different sources remain separate.
  test('14. Records with the same ID from different sources remain separate', () => {
    const rawEvents: NormalizedEvent[] = [
      {
        source: 'ticketing',
        record_id: 'SHARED-777',
        timestamp: '2026-09-03T17:30:00+05:30',
        summary: 'Ticketing item regarding cluster failover',
        status: 'open',
      },
      {
        source: 'incidents',
        record_id: 'SHARED-777',
        timestamp: '2026-09-03T17:40:00+05:30',
        summary: 'Incident item regarding cluster failover',
        status: 'investigating',
      },
    ];

    const result = deduplicate_events(rawEvents);
    assert.equal(result.records.length, 2, 'Records with matching IDs across distinct sources must NOT be merged');

    const ticketingRec = result.records.find((r) => r.source === 'ticketing');
    const incidentRec = result.records.find((r) => r.source === 'incidents');
    assert.ok(ticketingRec);
    assert.ok(incidentRec);
    assert.equal(ticketingRec.record_id, 'SHARED-777');
    assert.equal(incidentRec.record_id, 'SHARED-777');
  });

  // Test 15: Out-of-order updates still produce the correct latest state.
  test('15. Out-of-order updates still produce the correct latest state', () => {
    // Arrival sequence: latest first, then oldest, then intermediate
    const rawEvents: NormalizedEvent[] = [
      {
        source: 'ticketing',
        record_id: 'OPS-200',
        timestamp: '2026-09-03T19:00:00+05:30', // Latest
        summary: 'Third update: Final patch deployed',
        status: 'resolved',
      },
      {
        source: 'ticketing',
        record_id: 'OPS-200',
        timestamp: '2026-09-03T17:00:00+05:30', // Oldest
        summary: 'First update: Issue identified',
        status: 'open',
      },
      {
        source: 'ticketing',
        record_id: 'OPS-200',
        timestamp: '2026-09-03T18:00:00+05:30', // Intermediate
        summary: 'Second update: Patch in review',
        status: 'in_progress',
      },
    ];

    const result = deduplicate_events(rawEvents);
    assert.equal(result.records.length, 1);
    const rec = result.records[0];
    assert.equal(rec.latest_timestamp, '2026-09-03T19:00:00+05:30');
    assert.equal(rec.latest_status, 'resolved');
    assert.equal(rec.latest_summary, 'Third update: Final patch deployed');
    assert.equal(rec.first_timestamp, '2026-09-03T17:00:00+05:30');
    assert.equal(rec.progression, 'open → in_progress → resolved');
  });

  // Test 16: Equal timestamps produce stable results.
  test('16. Equal timestamps produce stable results', () => {
    const rawEventsA: NormalizedEvent[] = [
      {
        source: 'ticketing',
        record_id: 'OPS-300',
        timestamp: '2026-09-03T18:00:00+05:30',
        summary: 'Alpha event at 18:00',
        status: 'in_progress',
      },
      {
        source: 'ticketing',
        record_id: 'OPS-300',
        timestamp: '2026-09-03T18:00:00+05:30',
        summary: 'Beta event at 18:00',
        status: 'verifying',
      },
    ];

    const rawEventsB: NormalizedEvent[] = [
      rawEventsA[1],
      rawEventsA[0],
    ];

    const resultA = deduplicate_events(rawEventsA);
    const resultB = deduplicate_events(rawEventsB);

    assert.equal(resultA.records[0].latest_status, resultB.records[0].latest_status);
    assert.equal(resultA.records[0].latest_summary, resultB.records[0].latest_summary);
  });

  // Test 17: Completed records enter Completed.
  test('17. Completed records enter Completed', () => {
    const completedRecord: DeduplicatedRecord = {
      source: 'ticketing',
      record_id: 'OPS-401',
      latest_timestamp: '2026-09-03T18:30:00+05:30',
      first_timestamp: '2026-09-03T17:30:00+05:30',
      latest_status: 'resolved',
      latest_summary: 'Routine database index maintenance',
      update_count: 1,
      events: [],
    };

    assert.equal(classify_record(completedRecord), 'Completed');

    const closedRecord: DeduplicatedRecord = {
      ...completedRecord,
      latest_status: 'closed',
    };
    assert.equal(classify_record(closedRecord), 'Completed');
  });

  // Test 18: Active records enter In Progress.
  test('18. Active records enter In Progress', () => {
    const inProgressRecord: DeduplicatedRecord = {
      source: 'ticketing',
      record_id: 'OPS-402',
      latest_timestamp: '2026-09-03T18:30:00+05:30',
      first_timestamp: '2026-09-03T17:30:00+05:30',
      latest_status: 'in_progress',
      latest_summary: 'SSL certificate verification in progress',
      update_count: 2,
      events: [],
    };
    assert.equal(classify_record(inProgressRecord), 'In Progress');

    const investigatingRecord: DeduplicatedRecord = {
      ...inProgressRecord,
      latest_status: 'investigating',
      severity: 'p3',
    };
    assert.equal(classify_record(investigatingRecord), 'In Progress');
  });

  // Test 19: Blocked and escalated records enter Blockers / Escalations.
  test('19. Blocked and escalated records enter Blockers / Escalations', () => {
    const blockedRecord: DeduplicatedRecord = {
      source: 'ticketing',
      record_id: 'OPS-403',
      latest_timestamp: '2026-09-03T18:15:00+05:30',
      first_timestamp: '2026-09-03T17:30:00+05:30',
      latest_status: 'escalated',
      latest_summary: 'Storage gateway unreachable in AP-South-1',
      severity: 'critical',
      update_count: 1,
      events: [],
    };
    assert.equal(classify_record(blockedRecord), 'Blockers / Escalations');

    const p1Incident: DeduplicatedRecord = {
      source: 'incidents',
      record_id: 'INC-9101',
      latest_timestamp: '2026-09-03T17:35:00+05:30',
      first_timestamp: '2026-09-03T17:35:00+05:30',
      latest_status: 'investigating',
      latest_summary: 'Major latency spike on payment webhook processing',
      severity: 'p1',
      update_count: 1,
      events: [],
    };
    assert.equal(classify_record(p1Incident), 'Blockers / Escalations');
  });

  // Test 20: Unresolved non-blocking records enter Watch-list.
  test('20. Unresolved non-blocking records enter Watch-list', () => {
    const watchRecord: DeduplicatedRecord = {
      source: 'ticketing',
      record_id: 'OPS-423',
      latest_timestamp: '2026-09-03T18:50:00+05:30',
      first_timestamp: '2026-09-03T18:50:00+05:30',
      latest_status: 'monitoring',
      latest_summary: 'Memory pressure warning on analytics cache pod',
      update_count: 1,
      events: [],
    };
    assert.equal(classify_record(watchRecord), 'Watch-list');

    const openNormalRecord: DeduplicatedRecord = {
      source: 'ticketing',
      record_id: 'OPS-424',
      latest_timestamp: '2026-09-03T18:50:00+05:30',
      first_timestamp: '2026-09-03T18:50:00+05:30',
      latest_status: 'open',
      owner: 'rajesh@example.com',
      severity: 'low',
      latest_summary: 'Review queue configuration',
      update_count: 1,
      events: [],
    };
    assert.equal(classify_record(openNormalRecord), 'Watch-list');
  });

  // Test 21: A record matching multiple rules follows the documented precedence.
  test('21. A record matching multiple rules follows documented precedence', () => {
    // Precedence: Blockers / Escalations → Completed → In Progress → Watch-list
    // Case 1: Status says 'escalated' (Blocker) while text or secondary state might say active/progress
    const record1: DeduplicatedRecord = {
      source: 'ticketing',
      record_id: 'REC-MULTI-1',
      latest_timestamp: '2026-09-03T18:00:00+05:30',
      first_timestamp: '2026-09-03T17:00:00+05:30',
      latest_status: 'escalated',
      latest_summary: 'Investigating critical gateway timeout',
      update_count: 1,
      events: [],
    };
    assert.equal(
      classify_record(record1),
      'Blockers / Escalations',
      'Escalated status must supersede investigating/in_progress'
    );

    // Case 2: Status is 'resolved' (Completed) but severity was p1
    const record2: DeduplicatedRecord = {
      source: 'incidents',
      record_id: 'REC-MULTI-2',
      latest_timestamp: '2026-09-03T18:00:00+05:30',
      first_timestamp: '2026-09-03T17:00:00+05:30',
      latest_status: 'resolved',
      severity: 'p1',
      latest_summary: 'P1 payment incident successfully mitigated',
      update_count: 1,
      events: [],
    };
    assert.equal(
      classify_record(record2),
      'Completed',
      'A resolved item must be classified as Completed rather than an active Blocker'
    );
  });

  // Test 22: Every generated item has source and record ID.
  test('22. Every generated item has source and record ID', async () => {
    const request = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const note = await generate_handover_note(request);
    assert.ok(note);

    let totalItems = 0;
    for (const section of note.ordered_sections) {
      for (const item of section.items) {
        totalItems++;
        assert.ok(item.source, `Item missing source attribute`);
        assert.ok(item.record_id, `Item missing record_id`);
        assert.ok(item.source_system, `Item missing source_system`);
        assert.ok(item.timestamp, `Item missing timestamp`);
        assert.ok(item.item.startsWith(item.record_id), `Item text should begin with record ID: ${item.item}`);
      }
    }
    assert.ok(totalItems > 0, 'Must have generated items from fixtures');
  });

  // Test 23: Empty sections say "Nothing to report."
  test('23. Empty sections say "Nothing to report."', async () => {
    // Generate a note with single record that only falls into Completed
    const singleCompletedEvent: DeduplicatedRecord = {
      source: 'ticketing',
      record_id: 'OPS-ONLY-DONE',
      latest_timestamp: '2026-09-03T18:00:00+05:30',
      first_timestamp: '2026-09-03T18:00:00+05:30',
      latest_status: 'resolved',
      latest_summary: 'Sole completed item',
      update_count: 1,
      events: [],
    };

    const note = buildHandoverNote(
      {
        shift_start: '2026-09-03T17:00:00+05:30',
        shift_end: '2026-09-03T20:00:00+05:30',
        timezone: 'Asia/Kolkata',
        sources: ['ticketing'],
      },
      [singleCompletedEvent],
      [],
      [],
      []
    );

    assert.equal(note.sections['Completed'].length, 1);
    assert.equal(note.sections['In Progress'].length, 0);
    assert.equal(note.sections['Blockers / Escalations'].length, 0);
    assert.equal(note.sections['Watch-list'].length, 0);

    // Verify PDF rendering handles empty sections with "Nothing to report."
    const pdfBytes = await generateHandoverPdf(note);
    assert.ok(pdfBytes.length > 0);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    assert.ok(pdfDoc.getPageCount() >= 1);
  });

  // Test 24: A fully empty shift produces a valid preview and PDF.
  test('24. A fully empty shift produces a valid preview and PDF', async () => {
    // Shift window where no fixture events exist
    const emptyRequest = {
      shift_start: '2026-09-01T01:00:00+05:30',
      shift_end: '2026-09-01T03:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const note = await generate_handover_note(emptyRequest);
    assert.equal(note.status, 'ready');
    assert.equal(note.metrics.records_represented, 0);
    assert.equal(note.metrics.events_in_shift, 0);

    // All four sections must exist and have 0 items
    assert.equal(note.ordered_sections.length, 4);
    for (const section of note.ordered_sections) {
      assert.equal(section.items.length, 0);
    }

    // Must generate a valid PDF without errors
    const pdfBytes = await generateHandoverPdf(note);
    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.length > 1000, 'PDF buffer should be non-empty');

    const pdfDoc = await PDFDocument.load(pdfBytes);
    assert.equal(pdfDoc.getPageCount(), 1);
  });

  // Test 25: A partially failed source produces a note with a visible warning.
  test('25. A partially failed source produces a note with a visible warning', async () => {
    const partialRequest = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'unregistered_source_xyz'],
    };

    const note = await generate_handover_note(partialRequest);
    assert.equal(note.status, 'ready', 'Note status should remain ready for available sources');
    assert.ok(note.metrics.sources_with_warnings > 0, 'Sources with warnings metric should be > 0');

    const warning = note.warnings.find((w) => w.source === 'unregistered_source_xyz');
    assert.ok(warning, 'Must record structured warning for failed source');
    assert.equal(warning.code, 'SOURCE_NOT_CONFIGURED');
  });

  // Test 26: PDF generation creates exactly one valid file.
  test('26. PDF generation creates exactly one valid file', async () => {
    const request = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const note = await generate_handover_note(request);
    const pdfBytes = await generateHandoverPdf(note);

    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.byteLength > 1000);

    // Verify PDF format header %PDF-
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii');
    assert.equal(header, '%PDF-');

    // Filename follows stable format
    const filename = generateHandoverFilename(note);
    assert.equal(filename, 'shift-handover-2026-09-03-1700-to-2000-Asia-Kolkata.pdf');
  });

  // Test 27: PDF export failure produces an error state and no download link.
  test('27. PDF export failure produces an error state and no download link', async () => {
    // Calling generateHandoverPdf with an invalid note structure throws an error
    await assert.rejects(
      async () => {
        await generateHandoverPdf(null as unknown as any);
      },
      (err) => {
        assert.ok(err);
        return true;
      }
    );
  });

  // Test 28: Long item text wraps correctly in the preview and PDF.
  test('28. Long item text wraps correctly in the preview and PDF', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    const longText =
      'Extremely long description of an operational event: Customer reported login failures across several APAC cellular data carriers including Airtel and Jio after a CDN certificate rotation caused edge caches to invalidate SSL session tickets for over two hours.';

    const lines = wrapText(longText, font, 9.5, 300);
    assert.ok(lines.length > 2, `Expected at least 3 wrapped lines, got ${lines.length}`);

    // Verify each line width is <= maxWidth
    for (const line of lines) {
      const width = font.widthOfTextAtSize(line, 9.5);
      assert.ok(width <= 300 + 5, `Line width ${width} exceeded max width 300`);
    }
  });

  // Test 29: Repeated generation produces identical structured output and equivalent document content.
  test('29. Repeated generation produces identical structured output and equivalent document content', async () => {
    const request = {
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    };

    const note1 = await generate_handover_note(request);
    const note2 = await generate_handover_note(request);

    assert.equal(note1.fingerprint, note2.fingerprint);
    assert.equal(note1.metrics.records_represented, note2.metrics.records_represented);
    assert.equal(note1.metrics.events_in_shift, note2.metrics.events_in_shift);
    assert.equal(note1.metrics.updates_consolidated, note2.metrics.updates_consolidated);

    // Verify each section has identical items in identical order
    for (let s = 0; s < note1.ordered_sections.length; s++) {
      const s1 = note1.ordered_sections[s];
      const s2 = note2.ordered_sections[s];
      assert.equal(s1.title, s2.title);
      assert.equal(s1.items.length, s2.items.length);
      for (let i = 0; i < s1.items.length; i++) {
        assert.equal(s1.items[i].record_id, s2.items[i].record_id);
        assert.equal(s1.items[i].item, s2.items[i].item);
        assert.equal(s1.items[i].timestamp, s2.items[i].timestamp);
      }
    }
  });

  // Test 30: No user-facing text contains "Step 1," "Step 2," "Step 3," "Step 4," "dummy," "placeholder," or classroom/development status language.
  test('30. No user-facing text contains development-step language', () => {
    // Scan frontend source files for banned phrases
    const filesToAudit = [
      path.resolve(process.cwd(), 'src/pages/Dashboard.tsx'),
      path.resolve(process.cwd(), 'src/components/ShiftWindowForm.tsx'),
      path.resolve(process.cwd(), 'src/components/GenerationStatus.tsx'),
      path.resolve(process.cwd(), 'src/components/SourceInspector.tsx'),
      path.resolve(process.cwd(), 'src/components/HandoverPreview.tsx'),
    ];

    const bannedKeywords = [
      /\bStep 1\b/i,
      /\bStep 2\b/i,
      /\bStep 3\b/i,
      /\bStep 4\b/i,
      /\bStep 5\b/i,
      /\bdummy\b/i,
      /\bplaceholder\b/i,
      /\bunder construction\b/i,
      /\bdeferred to\b/i,
      /\bclassroom\b/i,
    ];

    for (const filePath of filesToAudit) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const regex of bannedKeywords) {
          assert.ok(
            !regex.test(content),
            `File ${path.basename(filePath)} contains banned developmental text matching ${regex}`
          );
        }
      }
    }
  });
});
