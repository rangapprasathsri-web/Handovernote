import React, { useState } from 'react';
import { FileDown, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { HandoverNote } from '../models/handover.js';
import { generateHandoverFilename } from '../services/pdfService.js';

export interface DownloadActionsProps {
  note: HandoverNote | null;
  onReset?: () => void;
  onExportFailure?: (errorMsg: string) => void;
}

export const DownloadActions: React.FC<DownloadActionsProps> = ({
  note,
  onReset,
  onExportFailure,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!note) return;

    setIsExporting(true);
    setExportError(null);
    setIsSuccess(false);

    try {
      const response = await fetch('/api/handover/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.details?.[0] || errorData.error || `Server returned HTTP ${response.status}`;
        throw new Error(msg);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Received empty PDF document from server');
      }

      const url = window.URL.createObjectURL(blob);
      const filename = generateHandoverFilename(note);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create PDF export';
      setExportError(msg);
      if (onExportFailure) {
        onExportFailure(msg);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {exportError && (
        <div
          id="export-error-inline"
          className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg flex items-center gap-1.5"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Export failed: {exportError}</span>
        </div>
      )}

      {onReset && (
        <button
          id="btn-create-another-note"
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-xs cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>Create another note</span>
        </button>
      )}

      <button
        id="btn-download-pdf"
        type="button"
        onClick={handleDownload}
        disabled={!note || isExporting}
        aria-busy={isExporting}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span>Preparing PDF document...</span>
          </>
        ) : isSuccess ? (
          <>
            <Check className="w-4 h-4 text-emerald-300" />
            <span>PDF downloaded</span>
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            <span>Download PDF</span>
          </>
        )}
      </button>
    </div>
  );
};
