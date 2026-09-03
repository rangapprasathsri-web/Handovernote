import React, { useState } from 'react';
import {
  FileDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldAlert,
  ListTodo,
  Eye,
  ChevronDown,
  ChevronUp,
  Layers,
  Database,
  Info,
  Check,
  FileText,
} from 'lucide-react';
import { HandoverNote, HandoverSectionTitle, HANDOVER_SECTIONS_ORDER } from '../models/handover.js';
import { generateHandoverFilename } from '../services/pdfService.js';

interface HandoverPreviewProps {
  note: HandoverNote;
  onReset?: () => void;
}

export const HandoverPreview: React.FC<HandoverPreviewProps> = ({ note, onReset }) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      const response = await fetch('/api/handover/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details?.[0] || errorData.error || `HTTP ${response.status}: Failed to generate PDF`
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = generateHandoverFilename(note);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('PDF export error:', msg);
      setDownloadError(msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const sectionConfig: Record<
    HandoverSectionTitle,
    { icon: React.ReactNode; colorBadge: string; borderAccent: string; label: string }
  > = {
    'Completed': {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      colorBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      borderAccent: 'border-l-emerald-500',
      label: '1. Completed',
    },
    'In Progress': {
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      colorBadge: 'bg-blue-50 text-blue-800 border-blue-200',
      borderAccent: 'border-l-blue-500',
      label: '2. In Progress',
    },
    'Blockers / Escalations': {
      icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
      colorBadge: 'bg-rose-50 text-rose-800 border-rose-200',
      borderAccent: 'border-l-rose-500',
      label: '3. Blockers / Escalations',
    },
    'Watch-list': {
      icon: <Eye className="w-5 h-5 text-amber-600" />,
      colorBadge: 'bg-amber-50 text-amber-800 border-amber-200',
      borderAccent: 'border-l-amber-500',
      label: '4. Watch-list',
    },
  };

  const hasSourceFailures =
    note.metrics.sources_with_warnings > 0 ||
    note.source_stats.some((s) => s.status === 'error' || (s.warnings && s.warnings.length > 0));

  const isEmptyShift = note.metrics.records_represented === 0;

  return (
    <div id="handover-preview-container" className="space-y-6">
      {/* Top Action & Document Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <FileText className="w-3.5 h-3.5" />
                Handover Preview
              </span>
              <span className="text-xs text-slate-500">
                Fingerprint: <code className="font-mono">{note.fingerprint}</code>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Shift Handover Note
            </h2>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">
                {note.shift_start} &rarr; {note.shift_end}
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono text-slate-700">
                {note.timezone}
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-xs text-slate-500">
                Sources: {note.source_display_names.join(', ') || note.sources.join(', ')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onReset && (
              <button
                id="btn-create-another-note"
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                Create Another Note
              </button>
            )}

            <button
              id="btn-download-pdf"
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating PDF...
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Downloaded PDF
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* PDF Download Error Banner */}
        {downloadError && (
          <div
            id="pdf-download-error-banner"
            className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">PDF Export Failed</p>
              <p className="mt-0.5 text-rose-700">{downloadError}</p>
            </div>
          </div>
        )}

        {/* Non-blocking Source Retrieval Warning Banner */}
        {hasSourceFailures && (
          <div
            id="source-retrieval-warning-banner"
            className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Some source data could not be retrieved</p>
              <p className="mt-0.5 text-amber-800">
                The note was generated from the available sources. You can inspect detailed warning logs in the
                Generation Details section below.
              </p>
            </div>
          </div>
        )}

        {/* Activity Overview Summary */}
        <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Info className="w-4 h-4 text-slate-400" />
            Activity Overview
          </div>
          <p className="text-slate-800 text-sm leading-relaxed font-medium">
            {note.overview}
          </p>
        </div>

        {/* Metric Summary Counter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="block text-xs font-medium text-slate-500">Records Reviewed</span>
            <span className="text-xl font-bold text-slate-900">{note.metrics.records_reviewed}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="block text-xs font-medium text-slate-500">Events in Shift</span>
            <span className="text-xl font-bold text-indigo-600">{note.metrics.events_in_shift}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="block text-xs font-medium text-slate-500">Records Represented</span>
            <span className="text-xl font-bold text-slate-900">{note.metrics.records_represented}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="block text-xs font-medium text-slate-500">Updates Consolidated</span>
            <span className="text-xl font-bold text-slate-700">{note.metrics.updates_consolidated}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="block text-xs font-medium text-slate-500">Sources with Warnings</span>
            <span
              className={`text-xl font-bold ${
                note.metrics.sources_with_warnings > 0 ? 'text-amber-600' : 'text-slate-700'
              }`}
            >
              {note.metrics.sources_with_warnings}
            </span>
          </div>
        </div>
      </div>

      {/* Empty Shift Window Notice */}
      {isEmptyShift && (
        <div
          id="empty-shift-notice"
          className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <ListTodo className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No activity recorded for this shift</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
            No source events matched the selected shift window. The handover note is ready with empty sections.
          </p>
        </div>
      )}

      {/* Four Grounded Handover Sections in Fixed Order */}
      <div className="space-y-6">
        {HANDOVER_SECTIONS_ORDER.map((sectionTitle) => {
          const cfg = sectionConfig[sectionTitle];
          const items = note.sections[sectionTitle] || [];

          return (
            <div
              key={sectionTitle}
              id={`section-${sectionTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-6 py-4 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {cfg.icon}
                  <h3 className="text-base font-bold text-slate-900">{cfg.label}</h3>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.colorBadge}`}
                >
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Section Items */}
              <div className="divide-y divide-slate-100 p-2 sm:p-4">
                {items.length === 0 ? (
                  <div className="py-6 px-4 text-center text-sm font-medium italic text-slate-500">
                    Nothing to report.
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={`${item.source_system}-${item.record_id}`}
                      className={`p-4 rounded-lg hover:bg-slate-50/80 transition-colors border-l-4 ${cfg.borderAccent} mb-2 last:mb-0 bg-white border border-slate-100`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm sm:text-base">
                            {item.record_id}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {item.source_system}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 uppercase tracking-wide">
                            {item.status}
                          </span>
                          {item.severity && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 uppercase">
                              {item.severity}
                            </span>
                          )}
                          {item.priority && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 uppercase">
                              {item.priority}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 font-mono">
                          {item.timestamp}
                        </div>
                      </div>

                      {/* Grounded item narrative text */}
                      <p className="text-slate-800 text-sm leading-relaxed">
                        {item.item}
                      </p>

                      {/* Attribution and consolidated updates */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <span>
                          Source: <strong className="text-slate-700 font-medium">{item.source}</strong>
                        </span>
                        {item.owner && (
                          <>
                            <span>&bull;</span>
                            <span>
                              Owner: <span className="text-slate-700 font-medium">{item.owner}</span>
                            </span>
                          </>
                        )}
                        {item.evidence_event_count > 1 && (
                          <>
                            <span>&bull;</span>
                            <span className="inline-flex items-center gap-1 text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              <Layers className="w-3 h-3" />
                              {item.evidence_event_count} updates consolidated
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapsible Generation Details & Diagnostics */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/75 hover:bg-slate-100/80 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-800">Generation Details</span>
            <span className="text-xs text-slate-500">
              (Source health, record statistics, and diagnostics)
            </span>
          </div>
          {showDiagnostics ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showDiagnostics && (
          <div className="p-6 space-y-6 border-t border-slate-200">
            {/* Source Health Table */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Source Systems Health
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 font-semibold text-slate-900 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Source Name</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Fetched</th>
                      <th className="p-2.5">Included</th>
                      <th className="p-2.5">Excluded</th>
                      <th className="p-2.5">Skipped</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {note.source_stats.map((s) => (
                      <tr key={s.source_id || s.source} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-medium text-slate-900">{s.source_name || s.source}</td>
                        <td className="p-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              s.status === 'error'
                                ? 'bg-rose-100 text-rose-800'
                                : s.status === 'skipped'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono">{s.fetched_count ?? s.fetched}</td>
                        <td className="p-2.5 font-mono text-emerald-700 font-semibold">
                          {s.included_count ?? s.included}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">
                          {s.excluded_out_of_window_count ?? s.excluded}
                        </td>
                        <td className="p-2.5 font-mono text-amber-700">
                          {s.skipped_malformed_count ?? s.skipped}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warnings Log */}
            {note.warnings.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Diagnostics & Warnings Log ({note.warnings.length})
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                  {note.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
                    >
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold uppercase ${
                          w.level === 'error'
                            ? 'bg-rose-100 text-rose-800'
                            : w.level === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {w.code}
                      </span>
                      <div className="flex-1 font-mono text-[11px] leading-relaxed">
                        {w.message}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {w.timestamp.slice(11, 19)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON Data Contract View Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowJsonRaw(!showJsonRaw)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
              >
                {showJsonRaw ? 'Hide Raw Handover JSON' : 'Show Raw Handover JSON'}
              </button>

              {showJsonRaw && (
                <div className="mt-3">
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono max-h-80 overflow-y-auto">
                    {JSON.stringify(note, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
