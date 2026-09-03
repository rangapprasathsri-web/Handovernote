import fs from 'fs';
import path from 'path';
import {
  FIREBASE_SOURCE_CONFIGS_COLLECTION,
  getFirestoreDb,
} from '../src/config/firebase.js';

function findFixturePath(candidates: string[]): string {
  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(process.cwd(), candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  throw new Error(`Could not find fixture file from candidates: ${candidates.join(', ')}`);
}

export async function seedFirestore(): Promise<void> {
  console.log('[SeedFirestore] Initializing Firestore seed...');

  const db = getFirestoreDb();

  // 1. Resolve JSON Fixture Paths
  const ticketingPath = findFixturePath([
    'public/data/ticketing_seed.json',
    'data/ticketing.json',
    'data/ticketing_seed.json',
  ]);
  const incidentsPath = findFixturePath([
    'public/data/incidents_seed.json',
    'data/incidents.json',
    'data/incidents_seed.json',
  ]);

  console.log(`[SeedFirestore] Loading ticketing from: ${ticketingPath}`);
  console.log(`[SeedFirestore] Loading incidents from: ${incidentsPath}`);

  const ticketingRecords = JSON.parse(fs.readFileSync(ticketingPath, 'utf8')) as Array<
    Record<string, unknown>
  >;
  const incidentRecords = JSON.parse(fs.readFileSync(incidentsPath, 'utf8')) as Array<
    Record<string, unknown>
  >;

  // 2. Seed ticketing_events collection
  console.log(`[SeedFirestore] Seeding ${ticketingRecords.length} records into 'ticketing_events'...`);
  const ticketingCol = db.collection('ticketing_events');
  for (const record of ticketingRecords) {
    const docId = String(record.ticket_id || record.record_id || record.id);
    await ticketingCol.doc(docId).set({
      ...record,
      source: 'ticketing',
      record_id: docId,
    });
  }
  console.log(`[SeedFirestore] Successfully seeded 'ticketing_events' (${ticketingRecords.length} documents)`);

  // 3. Seed incident_events collection
  console.log(`[SeedFirestore] Seeding ${incidentRecords.length} records into 'incident_events'...`);
  const incidentsCol = db.collection('incident_events');
  for (const record of incidentRecords) {
    const docId = String(record.incident_id || record.record_id || record.id);
    await incidentsCol.doc(docId).set({
      ...record,
      source: 'incidents',
      record_id: docId,
    });
  }
  console.log(`[SeedFirestore] Successfully seeded 'incident_events' (${incidentRecords.length} documents)`);

  // 4. Register dynamic Firestore sources in source_configs collection
  console.log(
    `[SeedFirestore] Registering dynamic source configs in '${FIREBASE_SOURCE_CONFIGS_COLLECTION}'...`
  );
  const configsCol = db.collection(FIREBASE_SOURCE_CONFIGS_COLLECTION);

  const ticketingSourceConfig = {
    id: 'ticketing_firestore',
    name: 'Ticketing System (Firestore)',
    type: 'firestore',
    collection: 'ticketing_events',
    enabled: true,
    description: 'Live operations ticketing events stored in Firestore (OPS queue)',
  };

  const incidentsSourceConfig = {
    id: 'incidents_firestore',
    name: 'Incident Management (Firestore)',
    type: 'firestore',
    collection: 'incident_events',
    enabled: true,
    description: 'Live operations incident records stored in Firestore (INC queue)',
  };

  await configsCol.doc('ticketing_firestore').set(ticketingSourceConfig);
  await configsCol.doc('incidents_firestore').set(incidentsSourceConfig);

  console.log(
    `[SeedFirestore] Registered sources: 'ticketing_firestore' and 'incidents_firestore'`
  );
  console.log('[SeedFirestore] Firestore seeding completed successfully.');
}

// Execute directly when run as CLI script
if (process.argv[1] && (process.argv[1].endsWith('seedFirestore.ts') || process.argv[1].endsWith('seedFirestore.js'))) {
  seedFirestore()
    .then(() => {
      console.log('[SeedFirestore] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SeedFirestore] Error seeding Firestore:', err);
      process.exit(1);
    });
}
