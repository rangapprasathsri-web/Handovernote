import React from 'react';
import { Layers, User } from 'lucide-react';
import { HandoverItem as HandoverItemModel } from '../models/handover.js';

export interface HandoverItemProps {
  item: HandoverItemModel;
  borderAccentColor?: string;
}

export const HandoverItem: React.FC<HandoverItemProps> = ({
  item,
  borderAccentColor = 'border-l-indigo-500',
}) => {
  // Format readable timestamp if available
  let displayTime = item.timestamp;
  try {
    const match = item.timestamp.match(/T(\d{2}:\d{2})/);
    if (match) {
      const tzMatch = item.timestamp.match(/(Z|[+-]\d{2}:\d{2})$/);
      const tzSuffix = tzMatch ? (tzMatch[1] === '+05:30' ? ' IST' : tzMatch[1] === 'Z' ? ' UTC' : ` ${tzMatch[1]}`) : '';
      displayTime = `${match[1]}${tzSuffix}`;
    }
  } catch {
    displayTime = item.timestamp;
  }

  // Capitalize or clean source display name
  const sourceName = item.source_system
    ? item.source_system.charAt(0).toUpperCase() + item.source_system.slice(1)
    : item.source;

  return (
    <article
      id={`handover-item-${item.source_system}-${item.record_id}`}
      className={`p-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors border-l-4 ${borderAccentColor} shadow-xs`}
    >
      {/* Narrative description (Visually dominant) */}
      <p className="text-slate-900 text-sm font-medium leading-relaxed break-words">
        {item.item}
      </p>

      {/* Compact evidence metadata row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
        <span className="font-semibold text-slate-900 tracking-tight">
          {sourceName}
        </span>
        <span className="text-slate-300" aria-hidden="true">&bull;</span>
        <span className="font-mono font-medium text-slate-800">
          {item.record_id}
        </span>
        <span className="text-slate-300" aria-hidden="true">&bull;</span>
        <span className="font-mono text-slate-600">
          {displayTime}
        </span>
        <span className="text-slate-300" aria-hidden="true">&bull;</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">
          {item.status.replace(/_/g, ' ')}
        </span>

        {item.severity && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
            {item.severity}
          </span>
        )}

        {item.priority && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
            {item.priority}
          </span>
        )}

        {item.owner && (
          <span className="inline-flex items-center gap-1 text-slate-600 ml-auto">
            <User className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[140px] sm:max-w-xs">{item.owner}</span>
          </span>
        )}

        {item.evidence_event_count > 1 && (
          <span className="inline-flex items-center gap-1 text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[11px]">
            <Layers className="w-3 h-3" />
            {item.evidence_event_count} updates consolidated
          </span>
        )}
      </div>
    </article>
  );
};
