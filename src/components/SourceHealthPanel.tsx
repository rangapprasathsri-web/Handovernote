import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Database, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { SourceStats, GenerationWarning } from '../models/generation.js';

export interface SourceHealthPanelProps {
  sourceStats: SourceStats[];
  warnings: GenerationWarning[];
  fingerprint?: string;
  generatedAt?: string;
}

export const SourceHealthPanel: React.FC<SourceHealthPanelProps> = ({
  sourceStats,
  warnings,
  fingerprint,
  generatedAt,
}) => {
  const hasWarnings = warnings.length > 0 || sourceStats.some((s) => s.status === 'error' || s.warnings?.length > 0);
  // Auto-expand if warnings exist so it's discoverable, collapsed by default if healthy
  const [isOpen, setIsOpen] = useState(hasWarnings);

  return (
    <div
      id="generation-details-panel"
      className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden"
    >
      <button
        type="button"
        id="toggle-generation-details-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="generation-details-content"
        className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition-colors text-left cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-900">Generation details</span>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Source system health and record counts
          </span>
          {hasWarnings && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3 h-3" />
              {warnings.length} warning{warnings.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
          <span>{isOpen ? 'Hide details' : 'Show details'}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
          )}
        </div>
      </button>

      {isOpen && (
        <div id="generation-details-content" className="p-5 border-t border-slate-200 space-y-6">
          {/* Source health table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
              Source Systems Overview
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                  <tr>
                    <th scope="col" className="p-3">Source Name</th>
                    <th scope="col" className="p-3">Status</th>
                    <th scope="col" className="p-3">Fetched</th>
                    <th scope="col" className="p-3">Included</th>
                    <th scope="col" className="p-3">Outside Window</th>
                    <th scope="col" className="p-3">Skipped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sourceStats.map((source) => {
                    const isError = source.status === 'error';
                    const isHealthy = source.status === 'ok' || source.status === 'success';

                    return (
                      <tr key={source.source_id || source.source} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">
                          {source.source_name || source.source}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isError
                                ? 'bg-rose-100 text-rose-800'
                                : isHealthy
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isHealthy ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <ShieldAlert className="w-3 h-3" />
                            )}
                            {isError ? 'Unavailable' : isHealthy ? 'Healthy' : source.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {source.fetched_count ?? source.fetched ?? 0}
                        </td>
                        <td className="p-3 font-mono font-semibold text-emerald-700">
                          {source.included_count ?? source.included ?? 0}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {source.excluded_out_of_window_count ?? source.excluded ?? 0}
                        </td>
                        <td className="p-3 font-mono text-amber-700">
                          {source.skipped_malformed_count ?? source.skipped ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warnings List */}
          {warnings.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Operational Warnings ({warnings.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{w.code}</span>
                        {w.source && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                            {w.source}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-amber-800 font-sans leading-relaxed">{w.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification Metadata */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            {fingerprint && (
              <div>
                Content Verification Hash:{' '}
                <span className="font-mono text-slate-700 font-medium">{fingerprint}</span>
              </div>
            )}
            {generatedAt && (
              <div>
                Generated at:{' '}
                <span className="font-mono text-slate-700">{generatedAt}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
