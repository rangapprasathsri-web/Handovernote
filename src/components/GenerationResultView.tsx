import React from 'react';
import { GenerationResult } from '../models/generation.js';
import { HandoverPreview } from './HandoverPreview.js';
import { FileText, ArrowRight, CheckCircle2, Clock, Eye, ShieldAlert } from 'lucide-react';

interface GenerationResultViewProps {
  result: GenerationResult | null;
  onReset?: () => void;
}

export const GenerationResultView: React.FC<GenerationResultViewProps> = ({ result, onReset }) => {
  if (!result || !result.handover_note) {
    return (
      <div
        id="result-empty-guide"
        className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xs"
      >
        <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <FileText className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Shift Handover Summary
            </h3>
            <p className="text-xs text-slate-500">
              Operational consolidation across ticketing queues and incident response streams
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Configure your shift parameters on the left and click{' '}
            <strong className="text-slate-900 font-semibold">Create Handover Note</strong>. The system will
            ingest records, normalize timestamps, collapse duplicate updates, and organize all shift
            activity into four grounded sections:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                1. Completed
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Resolved tickets, closed incidents, and completed operational handoffs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center gap-2 text-blue-800 font-semibold text-xs">
                <Clock className="w-4 h-4 text-blue-600" aria-hidden="true" />
                2. In Progress
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Active investigations, work-in-progress incidents, and open tasks.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600" aria-hidden="true" />
                3. Blockers / Escalations
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Escalated issues, high-severity alerts, and blocked operational items.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center gap-2 text-purple-800 font-semibold text-xs">
                <Eye className="w-4 h-4 text-purple-600" aria-hidden="true" />
                4. Watch-list
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Active monitors, unassigned open tickets, and passive follow-ups.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-950">
          <span className="font-medium">Direct single-file PDF export available immediately after generation</span>
          <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return <HandoverPreview note={result.handover_note} onReset={onReset} />;
};
