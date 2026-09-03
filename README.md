# Shift Handover Note Generator

A resilient, deterministic operations tool for converting work-shift activity across ticketing queues and incident streams into a clean, four-section handover note with single-file PDF export.

---

## 1. Overview & Core Capabilities

Operational handovers between on-call shifts often suffer from fragmented communication, missed status updates, and disorganized ticket logs. The **Shift Handover Note Generator** solves this by:

- **Ingesting Multi-Source Operational Activity**: Loads records from ticketing systems and incident response streams.
- **Normalizing Timestamps**: Converts disparate source timezone formats into canonical UTC instants while projecting display times into the active shift timezone.
- **Filtering by Shift Interval**: Enforces a strict half-open interval `[shift_start, shift_end)`.
- **Deterministic Deduplication**: Consolidates multiple event updates to the same underlying record into a single item with progression history.
- **Four-Section Precedence Classification**: Automatically categorizes records into *Completed*, *In Progress*, *Blockers / Escalations*, and *Watch-list*.
- **Professional Note Preview**: Presents grounded summaries with source attribution, update counts, and key metrics.
- **Single-File PDF Export**: Produces an export-ready, print-formatted PDF document named after the shift interval.

---

## 2. End-to-End User Workflow

The application user interface presents a clear, production-grade operations console:

```
Choose shift window  ──▶  Create Handover Note  ──▶  Review Preview  ──▶  Download PDF
```

1. **Choose Shift Window**:
   - Set **Shift Start** and **Shift End** datetime bounds.
   - Select the operational **Timezone** (e.g. `Asia/Kolkata`, `UTC`, `America/New_York`).
   - Select active **Ingestion Sources** (`ticketing`, `incidents`).
2. **Create Handover Note**:
   - Click **Create Handover Note** to trigger ingestion, validation, filtering, deduplication, and section classification.
3. **Review Preview**:
   - Inspect the generated note, operational overview, metric cards, and four classified sections.
   - Expand the **Generation Details** drawer to audit source health, record conservation counts, and diagnostic warnings.
4. **Download PDF**:
   - Click **Download PDF** to export a formatted single-file PDF document ready for archive, email, or ticketing attachments.

---

## 3. Data Processing Pipeline

The full pipeline executes deterministically from raw input to formatted output:

```
1. Fetch Source Events
   └── Reads raw records from configured source adapters
2. Normalize Timestamps
   └── Validates ISO-8601 strings with explicit offsets, maps to UTC epoch
3. Filter by Shift Window
   └── Applies half-open interval [shift_start, shift_end)
4. Deduplicate Records
   └── Groups by (source, record_id), sorts chronologically, captures latest state
5. Classify into Four Sections
   └── Applies strict precedence: Blockers/Escalations → Completed → In Progress → Watch-list
6. Preview & Diagnostics
   └── Renders interactive Handover Preview with source health and content fingerprint
7. Export Single-File PDF
   └── Generates vector-formatted PDF document with page numbering and metadata
```

---

## 4. Deduplication Rules

Real operational shifts often involve multiple status updates to the same ticket or incident (e.g. `OPS-4821` updated at 17:45 and 19:42).

The deduplication engine applies deterministic rules:
1. **Grouping Key**: Records are partitioned strictly by `(source, record_id)`. Matching record IDs from distinct sources (e.g. `ticketing:OPS-1` vs `incidents:OPS-1`) remain distinct.
2. **Chronological Ordering**: Events for each record are sorted by normalized timestamp ascending. If timestamps are equal, stable secondary sorting preserves ordering.
3. **Latest State Extraction**:
   - The record's final status, summary, and severity are taken from the latest update.
   - The first update timestamp is recorded as `first_timestamp`, and the latest as `latest_timestamp`.
4. **Progression History**:
   - When a record has multiple updates (e.g. `open` &rarr; `in_progress` &rarr; `resolved`), the status progression is recorded and summarized (e.g. `"2 updates consolidated"`).
5. **Deterministic Content Fingerprint**: A 32-bit FNV-1a hash of the canonical record stream guarantees reproducible note verification.

---

## 5. Classification Rules & Precedence Order

Every deduplicated record is assigned to exactly one of the four required sections:

| Precedence | Section | Qualifying Criteria |
| :--- | :--- | :--- |
| **1 (Highest)** | **Blockers / Escalations** | Explicit blocker status (`blocked`, `escalated`, `critical`, `outage`), **OR** `p1` / `critical` severity, **OR** unassigned high-severity items. |
| **2** | **Completed** | Resolved or closed statuses (`resolved`, `closed`, `completed`, `done`, `fixed`). |
| **3** | **In Progress** | Actively progressing work (`in_progress`, `investigating`, `verifying`, `mitigating`, `pending_deploy`, `deploying`). |
| **4 (Lowest)** | **Watch-list** | Unresolved non-blocking items requiring handover awareness (`monitoring`, `open`, `queued`, `follow_up`, `watch`). |

### Grounded Item Formatting
- Every item begins with its record identifier (e.g. `OPS-4821 - Customer reported login failures...`).
- Clear source attribution: `Source: TICKETING | OPS-4821 | 2026-09-03T19:42:00+05:30 | Status: in_progress | Owner: rajesh@example.com`.
- Consolidated update badge indicating when multiple updates were merged.
- Empty sections display: *"Nothing to report."*

---

## 6. Timezone Handling & Window Bounds

1. **Half-Open Interval Rule**:
   $$\text{shift\_start} \le \text{event\_timestamp} < \text{shift\_end}$$
   - **Inclusive Lower Bound**: Events occurring at exactly `shift_start` are **included**.
   - **Exclusive Upper Bound**: Events occurring at exactly `shift_end` are **excluded**.
2. **Canonical UTC Normalization**: All timestamps are validated for explicit timezone offsets (`Z` or `±HH:MM`) and compared in UTC milliseconds.
3. **Timezone Projection**: Dates and timestamps in the UI and PDF are formatted using the target shift timezone (e.g. `Asia/Kolkata`).
4. **Invalid Timestamps**: Naive timestamps lacking offset (e.g. `2026-09-03 17:00`) or unparseable formats are skipped, logged, and increment the `skipped_malformed_count` metric.

---

## 7. Setup & Running Instructions

### Prerequisites
- Node.js 20+ (with npm)

### Development Server
```bash
npm install
npm run dev
```
The server binds to `http://0.0.0.0:3000` (port 3000 is required).

### Production Build & Launch
```bash
npm run build
npm start
```
`npm run build` bundles the frontend into `dist/` and the backend server into `dist/server.cjs` with sourcemaps.

### Automated Test Suite
```bash
npm test
```
Runs all 53 automated unit and integration tests across 6 suites, covering:
- Request boundary & timezone validation
- Source adapter ingestion & malformed record handling
- Normalized event contracts
- Deduplication & latest state extraction
- Four-section classification & precedence hierarchy
- Empty shift & partial source failure handling
- Single-file PDF generation and text wrapping
- Deterministic regeneration verification
- UI terminology compliance

### Type Checking & Linting
```bash
npm run lint
```

---

## 8. Supported Source Formats & Configuration

Source adapters are defined in `src/sources/`:

### 1. Ticketing Adapter (`src/sources/ticketingAdapter.ts`)
Expected JSON format:
```json
{
  "ticket_id": "OPS-4821",
  "created_at": "2026-09-03T17:45:00+05:30",
  "subject": "Customer login failure on APAC cluster",
  "ticket_status": "in_progress",
  "urgency": "high",
  "assignee": "alex@ops.internal",
  "notes": "Traffic routed through secondary failover gateway"
}
```

### 2. Incident Adapter (`src/sources/incidentsAdapter.ts`)
Expected JSON format:
```json
{
  "incident_id": "INC-9101",
  "reported_at": "2026-09-03T17:35:00+05:30",
  "headline": "Database connection pool exhausted",
  "incident_state": "investigating",
  "severity_level": "p1",
  "incident_commander": "sarah@ops.internal",
  "impact_summary": "API latency elevated across billing endpoints"
}
```

### Adding a New Source
1. Implement the `SourceAdapter` interface in `src/sources/`:
   ```typescript
   export interface SourceAdapter<TRaw = unknown> {
     source_id: string;
     display_name: string;
     load_records(config: SourceConfig): Promise<TRaw[]>;
     normalize_record(raw: TRaw, targetTimezone?: string): NormalizedEvent;
   }
   ```
2. Register the adapter in `src/sources/registry.ts`.
3. Add the source entry to `src/config/sources.ts`.
