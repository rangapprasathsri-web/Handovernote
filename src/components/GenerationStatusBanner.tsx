import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { GenerationWarning } from '../models/generation.js';

export interface GenerationStatusBannerProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string | null;
  errorDetails?: string[];
  warnings?: GenerationWarning[];
  hasExportError?: boolean;
  exportErrorMessage?: string | null;
}

export const GenerationStatusBanner: React.FC<GenerationStatusBannerProps> = ({
  status,
  errorMessage,
  errorDetails = [],
  warnings = [],
  hasExportError = false,
  exportErrorMessage,
}) => {
  if (hasExportError) {
    return (
      <div
        id="pdf-download-error-banner"
        role="alert"
        aria-live="assertive"
        className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 flex items-start gap-3 text-sm shadow-xs"
      >
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h4 className="font-semibold text-rose-900 text-sm">PDF Export Failed</h4>
          <p className="text-xs text-rose-700 mt-1 leading-relaxed">
            {exportErrorMessage || 'Unable to build single-file PDF document. The handover note remains fully available in your preview.'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'idle') {
    return null;
  }

  if (status === 'loading') {
    return (
      <div
        id="generation-status-loading"
        role="status"
        aria-live="polite"
        className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-900 flex items-center gap-3.5 text-sm shadow-xs"
      >
        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-indigo-950 text-sm">Preparing handover note…</h4>
          <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
            Ingesting records across source queues, normalizing timestamps, and deduplicating updates.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        id="generation-status-error"
        role="alert"
        aria-live="assertive"
        className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 flex flex-col gap-2 text-sm shadow-xs"
      >
        <div className="flex items-center gap-2.5 font-semibold text-rose-900">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
          <span>Handover note generation could not be completed</span>
        </div>
        <p className="text-xs text-rose-800">
          {errorMessage || 'Please verify the selected shift window and connected sources, then try again.'}
        </p>
        {errorDetails.length > 0 && (
          <ul className="list-disc list-inside text-xs text-rose-700 pl-4 space-y-0.5">
            {errorDetails.map((detail, idx) => (
              <li key={idx}>{detail}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // If there are partial source warnings during success
  if (warnings.length > 0) {
    return (
      <div
        id="source-retrieval-warning-banner"
        role="status"
        aria-live="polite"
        className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 flex items-start gap-3 text-sm shadow-xs"
      >
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 text-sm">Some source data could not be retrieved</h4>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            The handover note was created using all successfully retrieved source activity. Review the Generation details panel below to inspect specific source diagnostic notices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="generation-status-success"
      role="status"
      aria-live="polite"
      className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-900 flex items-center gap-3 text-sm shadow-xs"
    >
      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
      <div>
        <h4 className="font-semibold text-emerald-950 text-sm">Handover note generated</h4>
        <p className="text-xs text-emerald-700 mt-0.5">
          Activity reviewed and organized into four operational sections.
        </p>
      </div>
    </div>
  );
};
