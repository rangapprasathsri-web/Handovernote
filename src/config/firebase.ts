import fs from 'fs';
import {
  initializeApp,
  getApps,
  getApp,
  cert,
  applicationDefault,
  type App,
  type AppOptions,
} from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let appInstance: App | null = null;
let dbInstance: Firestore | null = null;

interface ClientFirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

function loadClientFirebaseConfig(): ClientFirebaseConfig | null {
  for (const filename of ['firebase-config.json', 'firebase-applet-config.json']) {
    try {
      if (fs.existsSync(filename)) {
        const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

const clientConfig = loadClientFirebaseConfig();

// Clean up misconfigured GOOGLE_APPLICATION_CREDENTIALS if it is not an actual file on disk
// (e.g. if a user mistakenly supplied their Firebase App ID string instead of a file path)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.warn(
    `[Firebase] GOOGLE_APPLICATION_CREDENTIALS="${process.env.GOOGLE_APPLICATION_CREDENTIALS}" is not a valid file path on disk. Unsetting to avoid crash in GoogleAuth.`
  );
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

function sanitizeCollectionName(value: string | undefined, defaultName: string): string {
  if (!value || typeof value !== 'string') return defaultName;
  const trimmed = value.trim();
  // Check if someone accidentally provided a storage bucket URL or numeric sender ID
  if (trimmed.includes('.firebasestorage.app') || /^\d+$/.test(trimmed) || trimmed.length === 0) {
    return defaultName;
  }
  return trimmed;
}

export const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  clientConfig?.projectId ||
  process.env.GCLOUD_PROJECT ||
  'shift-handover-app';

export const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY ||
  clientConfig?.apiKey ||
  '';

export const FIREBASE_AUTH_DOMAIN =
  process.env.FIREBASE_AUTH_DOMAIN ||
  clientConfig?.authDomain ||
  '';

export const FIREBASE_HANDOVERS_COLLECTION =
  sanitizeCollectionName(process.env.FIREBASE_HANDOVERS_COLLECTION, 'handover_notes');

export const FIREBASE_SOURCE_CONFIGS_COLLECTION =
  sanitizeCollectionName(process.env.FIREBASE_SOURCE_CONFIGS_COLLECTION, 'source_configs');

export interface FirebaseValidationResult {
  valid: boolean;
  projectId: string;
  apiKeyStatus: {
    provided: boolean;
    maskedKey: string;
    validFormat: boolean;
    googleVerified: boolean;
    message: string;
  };
  firestoreStatus: {
    configured: boolean;
    enabled: boolean;
    databaseName: string;
    message: string;
  };
  collections: {
    handoversCollection: string;
    sourceConfigsCollection: string;
  };
  detectedConfig: {
    appId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
  };
  recommendations: string[];
}

export async function validateFirebaseCredentials(): Promise<FirebaseValidationResult> {
  const recommendations: string[] = [];
  const apiKey = FIREBASE_API_KEY;
  const projectId = FIREBASE_PROJECT_ID;

  let googleVerified = false;
  let apiKeyMessage = 'No API key provided';

  if (apiKey) {
    // Verify with Google API endpoint
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ continueUri: 'https://localhost', providerId: 'google.com' }),
      });
      const data = await res.json();
      if (res.status === 400 && data?.error?.message === 'API key not valid. Please pass a valid API key.') {
        googleVerified = false;
        apiKeyMessage = 'Invalid API key rejected by Google APIs';
      } else {
        googleVerified = true;
        apiKeyMessage = 'Verified valid Google Web API key';
      }
    } catch (err) {
      googleVerified = false;
      apiKeyMessage = `Network check failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    recommendations.push('Set FIREBASE_API_KEY with the apiKey from your Firebase config.');
  }

  // Check Firestore database connectivity/provisioning
  let firestoreEnabled = false;
  let firestoreMessage = '';

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const res = await fetch(firestoreUrl + (apiKey ? `?key=${apiKey}` : ''));
    if (res.status === 404) {
      firestoreEnabled = false;
      firestoreMessage = `Firestore Database not yet provisioned in project '${projectId}'.`;
      recommendations.push(
        `Open Firebase Console (https://console.firebase.google.com/project/${projectId}/firestore) and click "Create Database".`
      );
    } else if (res.status === 200) {
      firestoreEnabled = true;
      firestoreMessage = 'Cloud Firestore Database is active and reachable.';
    } else {
      const text = await res.text();
      if (text.includes('PERMISSION_DENIED') || text.includes('not been used in project')) {
        firestoreEnabled = false;
        firestoreMessage = `Firestore API not enabled for project '${projectId}'.`;
        recommendations.push(
          `Enable Cloud Firestore at https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${projectId}`
        );
      } else {
        firestoreEnabled = true;
        firestoreMessage = `Firestore endpoint responded with HTTP ${res.status}`;
      }
    }
  } catch (err) {
    firestoreMessage = `Error probing Firestore endpoint: ${err instanceof Error ? err.message : String(err)}`;
  }

  // Detect and inspect any accidentally cross-mapped fields
  const detectedConfig: Record<string, string | undefined> = {};
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.includes(':web:')) {
    detectedConfig.appId = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  if (process.env.FIREBASE_HANDOVERS_COLLECTION && process.env.FIREBASE_HANDOVERS_COLLECTION.includes('.firebasestorage.app')) {
    detectedConfig.storageBucket = process.env.FIREBASE_HANDOVERS_COLLECTION;
  }
  if (process.env.FIREBASE_SOURCE_CONFIGS_COLLECTION && /^\d+$/.test(process.env.FIREBASE_SOURCE_CONFIGS_COLLECTION)) {
    detectedConfig.messagingSenderId = process.env.FIREBASE_SOURCE_CONFIGS_COLLECTION;
  }

  return {
    valid: googleVerified && Boolean(projectId),
    projectId,
    apiKeyStatus: {
      provided: Boolean(apiKey),
      maskedKey: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'None',
      validFormat: /^AIzaSy[A-Za-z0-9_-]{33}$/.test(apiKey),
      googleVerified,
      message: apiKeyMessage,
    },
    firestoreStatus: {
      configured: Boolean(projectId),
      enabled: firestoreEnabled,
      databaseName: '(default)',
      message: firestoreMessage,
    },
    collections: {
      handoversCollection: FIREBASE_HANDOVERS_COLLECTION,
      sourceConfigsCollection: FIREBASE_SOURCE_CONFIGS_COLLECTION,
    },
    detectedConfig,
    recommendations,
  };
}

/**
 * Initializes and returns the Firebase Admin App instance.
 * Uses Application Default Credentials (ADC) in production (Cloud Run)
 * and falls back to a service-account JSON path from GOOGLE_APPLICATION_CREDENTIALS for local development.
 */
export function getFirebaseApp(): App {
  if (appInstance) {
    return appInstance;
  }

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    appInstance = existingApps[0];
    return appInstance;
  }

  const appOptions: AppOptions = {
    projectId: FIREBASE_PROJECT_ID,
  };

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    // Under emulator, credentials are not required
  } else if (credPath && fs.existsSync(credPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      appOptions.credential = cert(serviceAccount);
    } catch (err) {
      console.warn('[Firebase] Failed to load credentials from file, falling back to applicationDefault:', err);
      try {
        appOptions.credential = applicationDefault();
      } catch {
        // Fallback for offline/test environments
      }
    }
  } else {
    try {
      appOptions.credential = applicationDefault();
    } catch {
      // Allow emulator or mock environment
    }
  }

  appInstance = initializeApp(appOptions);
  return appInstance;
}

/**
 * Returns the Firestore database instance initialized from the Firebase Admin app.
 */
export function getFirestoreDb(): Firestore {
  if (!dbInstance) {
    const app = getFirebaseApp();
    dbInstance = getFirestore(app);
    try {
      dbInstance.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Settings already locked or customized
    }
  }
  return dbInstance;
}

/**
 * Allows overriding or resetting Firestore instance for unit testing.
 */
export function setFirestoreDbForTesting(mockDb: Firestore | null): void {
  dbInstance = mockDb;
}
