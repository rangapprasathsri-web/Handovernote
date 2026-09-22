import React, { useState, useEffect, useCallback } from 'react';
import {
  Archive,
  Clock,
  Calendar,
  RefreshCw,
  FileDown,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Search,
  Database,
  Calculator,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { HandoverHistoryRecord } from '../models/history.js';
import { HandoverNote } from '../models/handover.js';
import {
  apiListHandoverHistory,
  apiDownloadHandoverPdf,
  apiGetHandoverById,
} from '../services/apiClient.js';
import { formatInTimezone } from '../utils/date.js';

export interface PastHandoversSectionProps {
  onSelectHandover: (note: HandoverNote) => void;
  activeFingerprint?: string;
  refreshTrigger?: number;
  onOpenAuditModal?: (note: HandoverNote) => void;
}

export const PastHandoversSection: React.FC<PastHandoversSectionProps> = ({
  onSelectHandover,
  activeFingerprint,
  refreshTrigger = 0,
  onOpenAuditModal,
}) => {
  const [historyItems, setHistoryItems] = useState<HandoverHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchPastHandovers = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      // Query Firestore collection 'handover_notes' through the API
      const data = await apiListHandoverHistory(1, 30, filterSource);
      setHistoryItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to fetch past handovers from Firestore collection'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filterSource]);

  useEffect(() => {
    fetchPastHandovers();
  }, [fetchPastHandovers, refreshTrigger]);

  const handleDownloadPdf = async (record: HandoverHistoryRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(record.id);
    try {
      let note = record.note;
      if (!note) {
        const fetched = await apiGetHandoverById(record.id);
        if (fetched) note = fetched;
      }
      if (note) {
        await apiDownloadHandoverPdf(note);
      }
    } catch (err) {
      console.error('Failed to download PDF for past handover:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSelect = async (record: HandoverHistoryRecord) => {
    let note = record.note;
    if (!note) {
      const fetched = await apiGetHandoverById(record.id);
      if (fetched) note = fetched;
    }
    if (note) {
      onSelectHandover(note);
      // Smooth scroll to the preview container
      const el = document.getElementById('handover-preview-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Filter items by search query
  const filteredItems = historyItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = item.title?.toLowerCase().includes(q);
    const overviewMatch = item.note?.overview?.toLowerCase().includes(q);
    const idMatch = item.id.toLowerCase().includes(q);
    const sourceMatch = item.sources?.some((s) => s.toLowerCase().includes(q));
    return titleMatch || overviewMatch || idMatch || sourceMatch;
  });

  return (
    <section
      id="past-handovers-section"
      aria-label="Past Handovers"
      className="glass-surface rounded-2xl p-6 sm:p-7 shadow-xs space-y-6"
    >
      {/* Header and metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100/80">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Archive className="w-4 h-4" aria-hidden="true" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Past Handovers
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Firestore: handover_notes</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chronological archive of shift handover notes stored in the Cloud Firestore collection.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            id="refresh-past-handovers-btn"
            onClick={() => fetchPastHandovers(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white/70 hover:bg-white border border-white/80 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Re-query Firestore 'handover_notes' collection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Syncing…' : 'Refresh'}</span>
          </button>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100/70 border border-slate-200/60 text-slate-600">
            {historyItems.length} {historyItems.length === 1 ? 'saved note' : 'saved notes'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="search-past-handovers-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past notes by summary, source, or record ID…"
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300/80 rounded-xl glass-input text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600"
          />
        </div>

        {/* Source Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Source:
          </span>
          {[
            { id: '', label: 'All' },
            { id: 'ticketing', label: 'Ticketing' },
            { id: 'incidents', label: 'Incidents' },
          ].map((src) => (
            <button
              key={src.id}
              type="button"
              onClick={() => setFilterSource(src.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterSource === src.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white/60 hover:bg-white/90 text-slate-700 border border-white/80'
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchPastHandovers(true)}
            className="underline font-semibold hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="glass-surface-subtle rounded-2xl p-5 border border-white/80 animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-40 bg-slate-200/70 rounded-md" />
                <div className="h-4 w-20 bg-slate-200/70 rounded-md" />
              </div>
              <div className="h-3 w-full bg-slate-200/50 rounded-md" />
              <div className="h-3 w-3/4 bg-slate-200/50 rounded-md" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-16 bg-slate-200/60 rounded-full" />
                <div className="h-6 w-16 bg-slate-200/60 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-10 px-4 glass-surface-subtle rounded-2xl border border-white/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">
            {searchQuery
              ? 'No matching past handovers found'
              : 'No saved handovers in Firestore yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? `No handovers matched "${searchQuery}". Clear your search query or reset the filter.`
              : 'When shift handover notes are generated, they are automatically persisted into Cloud Firestore collection "handover_notes" for instant auditing and historical reference.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
            >
              Clear search filter
            </button>
          )}
        </div>
      )}

      {/* Grid of Past Handover Cards */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((record) => {
            const note = record.note;
            const isActive = activeFingerprint && record.fingerprint === activeFingerprint;
            const isDownloading = downloadingId === record.id;

            // Formatted shift window times
            const tz = record.timezone || 'Asia/Kolkata';
            const formattedStart = record.shift_window?.shift_start
              ? formatInTimezone(record.shift_window.shift_start, tz, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—';
            const formattedEnd = record.shift_window?.shift_end
              ? formatInTimezone(record.shift_window.shift_end, tz, {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—';

            const criticalCount = note?.critical_handovers?.length || 0;
            const inProgressCount = note?.in_progress_items?.length || 0;
            const completedCount = note?.completed_items?.length || 0;
            const monitoringCount = note?.upcoming_shifts_and_monitoring?.length || 0;
            const totalItems = criticalCount + inProgressCount + completedCount + monitoringCount;

            return (
              <article
                key={record.id}
                id={`past-handover-card-${record.id}`}
                onClick={() => handleSelect(record)}
                className={`group glass-surface-subtle hover:bg-white/90 transition-all duration-200 rounded-2xl p-5 border flex flex-col justify-between gap-4 cursor-pointer relative shadow-2xs hover:shadow-xs ${
                  isActive
                    ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                    : 'border-white/80 hover:border-slate-300'
                }`}
              >
                {/* Top Row: Shift Window & Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 tracking-tight">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {formattedStart} &ndash; {formattedEnd}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-normal">
                        ({tz})
                      </span>
                    </div>
                    <span className="block text-[11px] font-mono text-slate-400">
                      ID: {record.id.slice(0, 18)}…
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-2xs">
                        <Eye className="w-3 h-3" />
                        <span>Active in Preview</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100/70 border border-slate-200/50">
                        fp: {record.fingerprint.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Title & Overview Excerpt */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-950 transition-colors line-clamp-1">
                    {record.title || 'Shift Handover Note'}
                  </h3>
                  {note?.overview && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {note.overview}
                    </p>
                  )}
                </div>

                {/* Sources & Breakdown Metric Badges */}
                <div className="pt-2 border-t border-slate-100/80 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {record.sources.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60"
                      >
                        {s}
                      </span>
                    ))}
                    <span className="text-[10px] font-medium text-slate-400 ml-auto">
                      {totalItems} total {totalItems === 1 ? 'record' : 'records'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {criticalCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-200/60">
                        {criticalCount} critical
                      </span>
                    )}
                    {inProgressCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200/60">
                        {inProgressCount} in-progress
                      </span>
                    )}
                    {completedCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                        {completedCount} completed
                      </span>
                    )}
                    {monitoringCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold border border-sky-200/60">
                        {monitoringCount} monitoring
                      </span>
                    )}
                    {totalItems === 0 && (
                      <span className="text-[11px] text-slate-400 italic">
                        0 events (Quiet Shift)
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelect(record)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    <span>Load into Preview</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {onOpenAuditModal && note && (
                      <button
                        type="button"
                        onClick={() => onOpenAuditModal(note)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
                        title="View formula and calculation audit breakdown"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDownloadPdf(record, e)}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white/70 hover:bg-white border border-white/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
                      title="Download PDF directly from stored record"
                    >
                      {isDownloading ? (
                        <div className="w-3 h-3 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
