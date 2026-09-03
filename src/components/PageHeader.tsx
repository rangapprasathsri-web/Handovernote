import React from 'react';

export interface PageHeaderProps {
  title?: string;
  description?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title = 'Create a shift handover note',
  description = 'Bring together the activity from your shift and prepare one clear handover for the team taking over.',
}) => {
  return (
    <div className="flex flex-col gap-1.5 pb-1">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
        {description}
      </p>
    </div>
  );
};
