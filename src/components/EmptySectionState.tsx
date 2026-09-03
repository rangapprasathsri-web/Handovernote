import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface EmptySectionStateProps {
  id?: string;
  title?: string;
  message?: string;
}

export const EmptySectionState: React.FC<EmptySectionStateProps> = ({
  id,
  title = 'Nothing to report',
  message = 'No records in this section for the selected shift.',
}) => {
  return (
    <div
      id={id}
      className="py-6 px-4 text-center rounded-lg bg-slate-50/60 border border-slate-200/60 my-2 flex flex-col items-center justify-center gap-1"
    >
      <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
        <CheckCircle2 className="w-4 h-4 text-slate-400" />
        <span>{title}</span>
      </div>
      <p className="text-xs text-slate-500 max-w-sm">{message}</p>
    </div>
  );
};
