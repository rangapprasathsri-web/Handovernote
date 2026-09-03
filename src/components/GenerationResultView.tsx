import React from 'react';
import { GenerationResult } from '../models/generation.js';
import { HandoverPreview } from './HandoverPreview.js';
import { FileText, ArrowRight, ShieldCheck, CheckCircle2, Clock, Eye, AlertOctagon } from 'lucide-react';

interface GenerationResultViewProps {
  result: GenerationResult | null;
  onReset?: () => void;
}

export const GenerationResultView: React.FC<GenerationResultViewProps> = ({ result, onReset }) => {
  if (!result || !result.handover_note) {
    return (
      <div
        id="result-placeholder-empty"
        className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 flex flex-col gap-6 shadow-xs"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Structured Handover Note</h3>
            <p className="text-xs text-slate-500">
              Deterministic operational consolidation across ticketing and incidents
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Configure your shift window parameters on the left and click{' '}
            <strong className="text-slate-800 font-medium">Create Handover Note</strong>. The system will
            ingest records, normalize timestamps, collapse duplicate updates, and organize all shift
            activity into four grounded sections:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                1. Completed
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Resolved tickets, closed incidents, and fully completed operational tasks.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs">
                <Clock className="w-4 h-4" />
                2. In Progress
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Active investigations, work-in-progress deployments, and pending tasks.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs">
                <AlertOctagon className="w-4 h-4" />
                3. Blockers / Escalations
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Escalated issues, P1/critical incidents, and blocked operational items.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs">
                <Eye className="w-4 h-4" />
                4. Watch-list
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Active monitors, unassigned open tickets, and low-priority items to follow up.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
          <span className="font-medium">Direct Single-File PDF Export available upon generation</span>
          <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
        </div>
      </div>
    );
  }

  return <HandoverPreview note={result.handover_note} onReset={onReset} />;
};
