import React from 'react';

export interface MetricCardProps {
  id?: string;
  label: string;
  value: number | string;
  helperText?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'neutral';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  label,
  value,
  helperText,
  variant = 'default',
  icon,
}) => {
  const variantStyles = {
    default: 'text-slate-900',
    primary: 'text-indigo-600',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    neutral: 'text-slate-700',
  };

  return (
    <div
      id={id}
      className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold tracking-tight ${variantStyles[variant]}`}>
          {value}
        </span>
      </div>
      {helperText && <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
};
