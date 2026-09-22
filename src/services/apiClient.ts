import { GenerationRequest, GenerationResult } from '../models/generation.js';
import { HandoverNote } from '../models/handover.js';
import { HandoverHistoryListResponse, HandoverHistoryRecord } from '../models/history.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { REGISTERED_SOURCES } from '../config/sources.js';
import {
  generateHandoverClient,
  saveClientHistory,
  getClientHistory,
  getClientHistoryById,
  getClientHistoryCount,
  getClientSourcePreview,
  downloadHandoverPdfClient,
} from './clientFallbackService.js';

export interface ApiError extends Error {
  details?: string[];
}

/**
 * Checks whether an HTTP response is valid JSON.
 */
function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json');
}

/**
 * Resilient Handover Generation.
 *
 * Tries the server-side API first. If deployed on a static host (like Vercel,
 * Netlify, or GitHub Pages) where `/api/generate` returns 404 / HTML ("The page could not be found"),
 * or if there is a network interruption, it seamlessly falls back to the client-side
 * generation pipeline with identical mathematical results.
 */
export async function apiGenerateHandover(
  request: GenerationRequest
): Promise<GenerationResult> {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (isJsonResponse(response)) {
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.error || 'Generation failed') as ApiError;
        error.details = Array.isArray(data.details) ? data.details : [data.error || 'Validation error'];
        throw error;
      }
      if (data.note) {
        saveClientHistory(data.note);
      }
      return data as GenerationResult;
    }

    // Backend returned non-JSON (e.g. Vercel 404 HTML: "The page could not be found")
    console.info(
      `[ShiftFlow ApiClient] Backend returned HTTP ${response.status} with non-JSON content. Running in-browser generation pipeline.`
    );
    return await generateHandoverClient(request);
  } catch (err: unknown) {
    // If it's a structured validation error from our server, bubble it up to display to the user
    const apiErr = err as ApiError;
    if (apiErr && apiErr.details && Array.isArray(apiErr.details) && apiErr.message !== 'Failed to fetch') {
      throw apiErr;
    }

    // Fall back to client generator
    console.info(
      '[ShiftFlow ApiClient] Network unreachable or endpoint unavailable. Seamlessly generating handover note via client pipeline:',
      err
    );
    return await generateHandoverClient(request);
  }
}

/**
 * Resilient sources loader.
 */
export async function apiListSources(): Promise<SourceConfig[]> {
  try {
    const response = await fetch('/api/sources');
    if (isJsonResponse(response)) {
      const data = await response.json();
      if (Array.isArray(data.sources) && data.sources.length > 0) {
        return data.sources;
      }
    }
  } catch {
    // Fall back to registered sources
  }
  return REGISTERED_SOURCES;
}

/**
 * Resilient source preview loader.
 */
export async function apiGetSourcePreview(sourceId: string) {
  try {
    const response = await fetch(`/api/sources/${sourceId}/preview`);
    if (isJsonResponse(response)) {
      return await response.json();
    }
  } catch {
    // Fall back to client preview
  }
  return getClientSourcePreview(sourceId);
}

/**
 * Resilient handover history loader.
 */
export async function apiListHandoverHistory(
  page: number = 1,
  limit: number = 20,
  filterSource?: string
): Promise<HandoverHistoryListResponse> {
  try {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filterSource && filterSource.trim()) {
      params.set('source', filterSource.trim());
    }

    const response = await fetch(`/api/handovers?${params.toString()}`);
    if (isJsonResponse(response)) {
      const data = await response.json();
      if (Array.isArray(data.items)) {
        return data as HandoverHistoryListResponse;
      }
    }
  } catch {
    // Network or static deployment: use localStorage history
  }

  return getClientHistory({ page, limit, source: filterSource });
}

/**
 * Resilient single handover history fetcher.
 */
export async function apiGetHandoverById(id: string): Promise<HandoverNote | null> {
  try {
    const response = await fetch(`/api/handovers/${id}`);
    if (isJsonResponse(response)) {
      return (await response.json()) as HandoverNote;
    }
  } catch {
    // Fall back to client history
  }
  return getClientHistoryById(id);
}

/**
 * Gets total history count.
 */
export async function apiGetHistoryCount(): Promise<number> {
  try {
    const response = await fetch('/api/handovers?limit=1');
    if (isJsonResponse(response)) {
      const data = await response.json();
      if (typeof data.total === 'number') {
        return data.total;
      }
    }
  } catch {
    // Fallback
  }
  return getClientHistoryCount();
}

/**
 * Resilient PDF download.
 * Tries server PDF generator; if unavailable, generates PDF in-browser using pdf-lib.
 */
export async function apiDownloadHandoverPdf(note: HandoverNote): Promise<void> {
  try {
    const response = await fetch('/api/handover/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/pdf')) {
        const blob = await response.blob();
        if (blob.size > 0) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `shift-handover-${note.shift_start.split('T')[0] || 'note'}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          return;
        }
      }
    }
  } catch {
    // Fall back to client PDF generation
  }

  // Generate directly in browser using pdf-lib
  await downloadHandoverPdfClient(note);
}
