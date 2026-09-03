import React, { useState, useEffect } from 'react';
import { Database, FileCode, CheckCircle, ChevronDown, ChevronRight, Tag, User, AlertOctagon } from 'lucide-react';
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
      className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col gap-4"
    >
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-stone-600" />
          <h3 className="text-sm font-semibold text-stone-900">
            Seeded Source Fixtures & Data Contract Explorer
          </h3>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
            Source Contracts
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>{isExpanded ? 'Collapse' : 'Expand Fixtures'}</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-stone-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-4 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2">
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSourceId(s.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  selectedSourceId === s.id
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {s.name} ({s.id})
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-stone-400 font-mono">
              Loading source records...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-stone-500 flex items-center justify-between">
                <span>
                  Showing seeded fixture records from <code>data/{selectedSourceId}.json</code>:
                </span>
                <span className="font-mono text-[11px] text-stone-600">
                  {previewData.length} records sampled
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
                      className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/50 flex flex-col justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-stone-900">{id}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-stone-200 text-stone-700">
                            {status}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">{timestamp}</span>
                      </div>

                      <p className="font-medium text-stone-800 line-clamp-2 leading-relaxed">
                        {title}
                      </p>

                      <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60 text-[11px] text-stone-500">
                        {priority && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-stone-400" />
                            {priority}
                          </span>
                        )}
                        {severity && (
                          <span className="text-amber-700 font-mono">
                            sev: {severity}
                          </span>
                        )}
                        {owner ? (
                          <span className="flex items-center gap-1 ml-auto text-stone-600 truncate max-w-[140px]">
                            <User className="w-3 h-3 text-stone-400" />
                            {owner.split('@')[0]}
                          </span>
                        ) : (
                          <span className="ml-auto text-stone-400 italic">unassigned</span>
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
