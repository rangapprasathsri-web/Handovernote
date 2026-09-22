import React from 'react';

export interface MetricCardProps {
  id?: string;
  label: string;
  value: number | string;
  helperText?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'neutral';
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  label,
  value,
  helperText,
  variant = 'default',
  icon,
  onClick,
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
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={`p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-indigo-300 hover:shadow-sm group' : 'hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium uppercase tracking-wider ${onClick ? 'text-slate-500 group-hover:text-indigo-600' : 'text-slate-500'}`}>
          {label}
        </span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className={`text-2xl font-bold tracking-tight ${variantStyles[variant]}`}>
          {value}
        </span>
        {onClick && (
          <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            Audit &rarr;
          </span>
        )}
      </div>
      {helperText && <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
};
