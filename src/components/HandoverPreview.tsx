import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { HandoverNote, HANDOVER_SECTIONS_ORDER } from '../models/handover.js';
import { MetricCard } from './MetricCard.js';
import { HandoverSection } from './HandoverSection.js';
import { SourceHealthPanel } from './SourceHealthPanel.js';
import { DownloadActions } from './DownloadActions.js';

export interface HandoverPreviewProps {
  note: HandoverNote;
  onReset?: () => void;
}

export const HandoverPreview: React.FC<HandoverPreviewProps> = ({ note, onReset }) => {
  const [exportError, setExportError] = useState<string | null>(null);

  const isEmptyShift = note.metrics.records_represented === 0;
  const hasSourceFailures =
    note.metrics.sources_with_warnings > 0 ||
    note.source_stats.some((s) => s.status === 'error' || (s.warnings && s.warnings.length > 0));

  return (
    <div id="handover-preview-container" className="space-y-6">
      {/* Top Document Header & Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                Handover preview
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Verification: {note.fingerprint}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Shift Handover Note
            </h2>

            {/* Shift date range & source tags */}
            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2.5 mt-3 text-xs sm:text-sm text-slate-600">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
                {note.shift_start} &rarr; {note.shift_end}
              </span>
              <span className="text-slate-300" aria-hidden="true">&bull;</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono font-medium text-slate-700">
                {note.timezone}
              </span>
              <span className="text-slate-300" aria-hidden="true">&bull;</span>
              <span className="text-xs text-slate-500">
                Sources: {note.source_display_names.join(', ') || note.sources.join(', ')}
              </span>
            </div>
          </div>

          {/* Download and reset actions */}
          <div className="self-start lg:self-auto">
            <DownloadActions
              note={note}
              onReset={onReset}
              onExportFailure={(err) => setExportError(err)}
            />
          </div>
        </div>

        {/* Export Failure Warning Banner */}
        {exportError && (
          <div
            id="pdf-download-error-banner"
            role="alert"
            className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm">PDF Export Failed</p>
              <p className="mt-0.5 text-rose-700 leading-relaxed">{exportError}</p>
            </div>
          </div>
        )}

        {/* Non-blocking Partial Source Warning Banner */}
        {hasSourceFailures && (
          <div
            id="source-retrieval-warning-banner"
            role="status"
            className="mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm">Some source data could not be retrieved</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                The note includes all available sources. You can inspect detailed warning logs in the
                Generation details panel below.
              </p>
            </div>
          </div>
        )}

        {/* Activity Overview Summary */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Operational Overview
          </span>
          <p className="text-slate-800 text-sm leading-relaxed font-medium">
            {note.overview}
          </p>
        </div>

        {/* Summary Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5">
          <MetricCard
            id="metric-events-in-shift"
            label="Events in shift"
            value={note.metrics.events_in_shift}
            variant="primary"
          />
          <MetricCard
            id="metric-records-represented"
            label="Records represented"
            value={note.metrics.records_represented}
            variant="default"
          />
          <MetricCard
            id="metric-updates-consolidated"
            label="Updates consolidated"
            value={note.metrics.updates_consolidated}
            variant="neutral"
          />
          <MetricCard
            id="metric-source-warnings"
            label="Source warnings"
            value={note.metrics.sources_with_warnings}
            variant={note.metrics.sources_with_warnings > 0 ? 'warning' : 'default'}
          />
        </div>
      </div>

      {/* Quiet / Empty Shift Notice when 0 events in shift */}
      {isEmptyShift && (
        <div
          id="empty-shift-notice"
          className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center shadow-xs"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <CheckCircle2 className="w-6 h-6 text-slate-400" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No activity recorded for this shift
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            No source events matched the selected shift window. The handover note is ready with all four sections available.
          </p>
        </div>
      )}

      {/* Four Grounded Handover Sections in Strict Order */}
      <div className="space-y-5">
        {HANDOVER_SECTIONS_ORDER.map((sectionTitle) => {
          const items = note.sections[sectionTitle] || [];
          return (
            <HandoverSection
              key={sectionTitle}
              title={sectionTitle}
              items={items}
            />
          );
        })}
      </div>

      {/* Collapsible Generation details / Source health panel */}
      <SourceHealthPanel
        sourceStats={note.source_stats}
        warnings={note.warnings}
        fingerprint={note.fingerprint}
        generatedAt={note.generated_at}
      />
    </div>
  );
};
