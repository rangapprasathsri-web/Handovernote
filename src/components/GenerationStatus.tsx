import React from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { GenerationWarning } from '../models/generation.js';

interface GenerationStatusProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string | null;
  errorDetails?: string[];
  warnings?: GenerationWarning[];
}

export const GenerationStatus: React.FC<GenerationStatusProps> = ({
  status,
  errorMessage,
  errorDetails = [],
  warnings = [],
}) => {
  if (status === 'idle') {
    return (
      <div
        id="generation-status-idle"
        className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-600 flex items-start gap-3 text-sm"
      >
        <Info className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-stone-800 text-sm">Ready to Generate</h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure your shift parameters on the left and click <strong>Create Handover Note</strong> to ingest activity and generate the structured handover document.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div
        id="generation-status-loading"
        className="p-5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 flex items-center gap-3.5 text-sm"
      >
        <Loader2 className="w-5 h-5 text-stone-800 animate-spin shrink-0" />
        <div>
          <h4 className="font-semibold text-stone-900 text-sm">Processing Shift Activity</h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Ingesting records, normalizing timestamps, deduplicating updates, and sectioning items...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        id="generation-status-error"
        className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 flex flex-col gap-2 text-sm"
      >
        <div className="flex items-center gap-2.5 font-semibold text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>Generation Request Failed: {errorMessage || 'Validation Error'}</span>
        </div>
        {errorDetails.length > 0 && (
          <ul className="list-disc list-inside text-xs text-red-700 pl-4 space-y-1">
            {errorDetails.map((detail, idx) => (
              <li key={idx}>{detail}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div
      id="generation-status-success"
      className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 flex flex-col gap-2 text-sm"
    >
      <div className="flex items-center gap-2.5 font-semibold text-emerald-800">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <span>Handover Note Generated Successfully</span>
      </div>
      <p className="text-xs text-emerald-700">
        All activity records within the shift window were processed, deduplicated, and organized into four operational sections.
      </p>
    </div>
  );
};
