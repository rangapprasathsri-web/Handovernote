import React from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import { HandoverItem as HandoverItemModel, HandoverSectionTitle } from '../models/handover.js';
import { HandoverItem } from './HandoverItem.js';
import { EmptySectionState } from './EmptySectionState.js';

export interface HandoverSectionProps {
  title: HandoverSectionTitle;
  items: HandoverItemModel[];
}

interface SectionConfig {
  numberLabel: string;
  icon: React.ReactNode;
  badgeClass: string;
  borderAccent: string;
  containerId: string;
}

const SECTION_CONFIGS: Record<HandoverSectionTitle, SectionConfig> = {
  'Completed': {
    numberLabel: '1. Completed',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    borderAccent: 'border-l-emerald-500',
    containerId: 'section-completed',
  },
  'In Progress': {
    numberLabel: '2. In Progress',
    icon: <Clock className="w-4 h-4 text-blue-600" aria-hidden="true" />,
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    borderAccent: 'border-l-blue-500',
    containerId: 'section-in-progress',
  },
  'Blockers / Escalations': {
    numberLabel: '3. Blockers / Escalations',
    icon: <ShieldAlert className="w-4 h-4 text-rose-600" aria-hidden="true" />,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    borderAccent: 'border-l-rose-500',
    containerId: 'section-blockers---escalations',
  },
  'Watch-list': {
    numberLabel: '4. Watch-list',
    icon: <Eye className="w-4 h-4 text-purple-600" aria-hidden="true" />,
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    borderAccent: 'border-l-purple-500',
    containerId: 'section-watch-list',
  },
};

export const HandoverSection: React.FC<HandoverSectionProps> = ({ title, items }) => {
  const config = SECTION_CONFIGS[title];

  return (
    <section
      id={config.containerId}
      aria-label={title}
      className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden"
    >
      {/* Section Header */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {config.icon}
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {config.numberLabel}
          </h3>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass}`}
        >
          {items.length} {items.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Section Content */}
      <div className="p-4 flex flex-col gap-3">
        {items.length === 0 ? (
          <EmptySectionState
            id={`empty-${config.containerId}`}
            title="Nothing to report."
            message="No records in this section for the selected shift."
          />
        ) : (
          items.map((item) => (
            <HandoverItem
              key={`${item.source_system}-${item.record_id}`}
              item={item}
              borderAccentColor={config.borderAccent}
            />
          ))
        )}
      </div>
    </section>
  );
};
