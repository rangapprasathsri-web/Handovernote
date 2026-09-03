import React, { useState, useEffect } from 'react';
import { Database, ChevronDown, ChevronRight, Tag, User } from 'lucide-react';
import { SourceConfig } from '../models/sourceConfig.js';

interface SourceInspectorProps {
  sources: SourceConfig[];
}

export const SourceInspector: React.FC<SourceInspectorProps> = ({ sources }) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>('ticketing');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const fetchPreview = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/sources/${selectedSourceId}/preview`);
        if (res.ok) {
          const json = await res.json();
          setPreviewData(json.sample || []);
        }
      } catch (err) {
        console.error('Failed to load source preview', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreview();
  }, [selectedSourceId, isExpanded]);

  return (
    <div
      id="source-fixtures-inspector"
      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col gap-4"
    >
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">
            Connected Source Queues &amp; Activity Feeds
          </h3>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
            Ingestion streams
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{isExpanded ? 'Hide feeds' : 'Inspect feeds'}</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSourceId(s.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  selectedSourceId === s.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400 font-mono">
              Loading source activity records...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>
                  Recent events from <strong>{sources.find(s => s.id === selectedSourceId)?.name || selectedSourceId}</strong>
                </span>
                <span className="font-mono text-[11px] text-slate-600">
                  {previewData.length} records available
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {previewData.map((item, idx) => {
                  const id = item.ticket_id || item.incident_id || `rec-${idx}`;
                  const title = item.subject || item.headline || item.summary || 'Record';
                  const timestamp = item.created_at || item.reported_at || item.timestamp;
                  const status = item.ticket_status || item.incident_state || item.status;
                  const priority = item.urgency || item.priority;
                  const severity = item.severity_level || item.severity;
                  const owner = item.assignee || item.incident_commander;

                  return (
                    <div
                      key={id + idx}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900">{id}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
                            {status}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">{timestamp}</span>
                      </div>

                      <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed">
                        {title}
                      </p>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                        {priority && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {priority}
                          </span>
                        )}
                        {severity && (
                          <span className="text-amber-700 font-mono">
                            sev: {severity}
                          </span>
                        )}
                        {owner ? (
                          <span className="flex items-center gap-1 ml-auto text-slate-600 truncate max-w-[140px]">
                            <User className="w-3 h-3 text-slate-400" />
                            {owner.split('@')[0]}
                          </span>
                        ) : (
                          <span className="ml-auto text-slate-400 italic">unassigned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
