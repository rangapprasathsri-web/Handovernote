import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  ArrowLeft,
  Search,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Layers,
  History,
} from 'lucide-react';
import { HandoverHistoryRecord } from '../models/history.js';
import { HandoverNote } from '../models/handover.js';
import { HandoverPreview } from './HandoverPreview.js';
import { DownloadActions } from './DownloadActions.js';

export interface HandoverHistoryViewProps {
  onBackToGenerator?: () => void;
}

export const HandoverHistoryView: React.FC<HandoverHistoryViewProps> = ({
  onBackToGenerator,
}) => {
  const [historyItems, setHistoryItems] = useState<HandoverHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<HandoverNote | null>(null);
  const [filterSource, setFilterSource] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (filterSource.trim()) {
        params.set('source', filterSource.trim());
      }

      const res = await fetch(`/api/handovers?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load history (HTTP ${res.status})`);
      }
      const data = await res.json();
      setHistoryItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error fetching handover history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, filterSource]);

  const handleReopenNote = async (record: HandoverHistoryRecord) => {
    if (record.note) {
      setSelectedNote(record.note);
      return;
    }

    try {
      const res = await fetch(`/api/handovers/${record.id}`);
      if (!res.ok) throw new Error('Failed to fetch handover details');
      const note = await res.json();
      setSelectedNote(note);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load selected handover');
    }
  };

  // If a note is currently open, show full HandoverPreview with back navigation
  if (selectedNote) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            id="btn-back-to-history-list"
            onClick={() => setSelectedNote(null)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to history list</span>
          </button>

          <span className="text-xs font-mono text-slate-500">
            Archived note &bull; Fingerprint: {selectedNote.fingerprint.slice(0, 16)}...
          </span>
        </div>

        {/* Reuse HandoverPreview component directly */}
        <HandoverPreview note={selectedNote} onReset={() => setSelectedNote(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70 mb-2">
              <History className="w-3.5 h-3.5" />
              <span>Operations Archive</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Shift Handover History
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Browse previously generated shift handovers, review archived operational items, or re-download official PDF records.
            </p>
          </div>

          {onBackToGenerator && (
            <button
              type="button"
              id="btn-new-handover"
              onClick={onBackToGenerator}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <span>+ Create new handover</span>
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="filter-history-source"
              placeholder="Filter by source (e.g. ticketing, incidents)..."
              value={filterSource}
              onChange={(e) => {
                setFilterSource(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchHistory()}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Refresh
          </button>

          <span className="text-xs text-slate-500 ml-auto">
            {total} {total === 1 ? 'handover archived' : 'handovers archived'}
          </span>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to load handover history</p>
            <p className="mt-0.5 text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-7 h-7 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading archived shift handovers...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && historyItems.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No handover history records found</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Shift handovers generated through the pipeline are automatically archived here with deterministic content fingerprints.
          </p>
          {onBackToGenerator && (
            <button
              type="button"
              onClick={onBackToGenerator}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer mt-2"
            >
              <span>Go to Handover Generator</span>
            </button>
          )}
        </div>
      )}

      {/* Items list */}
      {!isLoading && historyItems.length > 0 && (
        <div className="space-y-4">
          {historyItems.map((record) => {
            const shiftStart = record.shift_window?.shift_start || record.note?.shift_start || 'N/A';
            const shiftEnd = record.shift_window?.shift_end || record.note?.shift_end || 'N/A';
            const timezone = record.timezone || record.note?.timezone || 'Asia/Kolkata';
            const sources = record.sources || record.note?.sources || [];
            const recordCount =
              record.note?.metrics?.records_represented ??
              (record.note?.sections
                ? Object.values(record.note.sections).reduce(
                    (acc: number, s) => acc + (Array.isArray(s) ? s.length : 0),
                    0
                  )
                : 0);
            const genTime = record.generated_at ? new Date(record.generated_at).toLocaleString() : 'Recent';

            return (
              <div
                key={record.id}
                id={`history-item-${record.id}`}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-base text-slate-900">
                      {record.title || 'Shift Handover Note'}
                    </span>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {timezone}
                    </span>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                      {recordCount} {recordCount === 1 ? 'record' : 'records'}
                    </span>
                  </div>

                  {/* Window details */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {shiftStart} &rarr; {shiftEnd}
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Generated {genTime}
                    </span>
                  </div>

                  {/* Source tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-slate-500 mr-1">Sources:</span>
                    {sources.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {s}
                      </span>
                    ))}
                    <span className="text-[11px] text-slate-400 font-mono ml-2">
                      Fp: {record.fingerprint ? record.fingerprint.slice(0, 8) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Actions: Reopen Note and DownloadActions */}
                <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <button
                    type="button"
                    id={`btn-reopen-${record.id}`}
                    onClick={() => handleReopenNote(record)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reopen note</span>
                  </button>

                  {/* Reuse DownloadActions directly */}
                  <DownloadActions note={record.note} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
