import React from 'react';
import { ClipboardCheck, FileText, History } from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
  activeTab?: 'generator' | 'history';
  onTabChange?: (tab: 'generator' | 'history') => void;
  historyCount?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab = 'generator',
  onTabChange,
  historyCount,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Application Bar */}
      <header
        role="banner"
        className="bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs"
              aria-hidden="true"
            >
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Shift Handover Note Generator
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Operations
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onTabChange && (
              <nav className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
                <button
                  type="button"
                  id="tab-btn-generator"
                  onClick={() => onTabChange('generator')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    activeTab === 'generator'
                      ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generator</span>
                </button>
                <button
                  type="button"
                  id="tab-btn-history"
                  onClick={() => onTabChange('history')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History</span>
                  {typeof historyCount === 'number' && historyCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-mono">
                      {historyCount}
                    </span>
                  )}
                </button>
              </nav>
            )}

            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80"
              title="System operational"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              <span>Operational</span>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content Area */}
      <main role="main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        {children}
      </main>

      {/* Footer */}
      <footer role="contentinfo" className="border-t border-slate-200 bg-white/90 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Shift Handover Note Generator &bull; Operations Handover Management</span>
          <span className="font-mono text-[11px] text-slate-400">
            Deterministic Deduplication &bull; Precedence Classification &bull; ISO-8601 UTC
          </span>
        </div>
      </footer>
    </div>
  );
};
