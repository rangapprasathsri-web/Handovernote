import React from 'react';
import { Database, CheckSquare, Square } from 'lucide-react';
import { SourceConfig } from '../models/sourceConfig.js';

export interface SourceSelectorProps {
  availableSources: SourceConfig[];
  selectedSources: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  errorMessage?: string | null;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  availableSources,
  selectedSources,
  onChange,
  disabled = false,
  errorMessage,
}) => {
  const toggleSource = (sourceId: string) => {
    if (disabled) return;
    if (selectedSources.includes(sourceId)) {
      onChange(selectedSources.filter((id) => id !== sourceId));
    } else {
      onChange([...selectedSources, sourceId]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, sourceId: string) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleSource(sourceId);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          id="source-selector-label"
          className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
        >
          <Database className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span>Source systems ({selectedSources.length} selected)</span>
        </label>
        <span className="text-xs text-slate-500">Connected queues</span>
      </div>

      <div
        role="group"
        aria-labelledby="source-selector-label"
        aria-describedby={errorMessage ? 'source-selector-error' : undefined}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {availableSources.map((source) => {
          const isChecked = selectedSources.includes(source.id);
          return (
            <div
              key={source.id}
              id={`source-card-${source.id}`}
              role="checkbox"
              aria-checked={isChecked}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => handleKeyDown(e, source.id)}
              onClick={() => toggleSource(source.id)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all select-none cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                isChecked
                  ? 'border-indigo-600 bg-indigo-50/40 text-slate-900 ring-1 ring-indigo-600/30'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="pt-0.5" aria-hidden="true">
                {isChecked ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {source.name}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {source.id}
                  </span>
                </div>
                {source.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                    {source.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <p id="source-selector-error" role="alert" className="text-xs text-rose-600 mt-1">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
