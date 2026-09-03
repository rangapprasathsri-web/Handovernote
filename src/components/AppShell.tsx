import React from 'react';
import {
  FileText,
  History,
  ArrowLeft,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
  activeTab?: 'generator' | 'history';
  onTabChange?: (tab: 'generator' | 'history') => void;
  historyCount?: number;
  onNavigateToLanding?: () => void;
  currentUser?: {
    name: string;
    email: string;
    role: string;
    team?: string;
  } | null;
  onSignOut?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab = 'generator',
  onTabChange,
  historyCount,
  onNavigateToLanding,
  currentUser,
  onSignOut,
}) => {
  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 antialiased">
      {/* Top Application Bar */}
      <header
        role="banner"
        className="bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Left: Brand & Landing Link */}
          <div className="flex items-center gap-3">
            {onNavigateToLanding && (
              <button
                type="button"
                onClick={onNavigateToLanding}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 pr-2 border-r border-slate-200 cursor-pointer transition-colors"
                title="Return to ShiftFlow product landing page"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">ShiftFlow.com</span>
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs"
                aria-hidden="true"
              >
                SF
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 tracking-tight">
                  ShiftFlow
                </span>
                <span className="text-slate-300 font-light hidden sm:inline">/</span>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Operations Handover
                </span>
              </div>
            </div>
          </div>

          {/* Center/Right Nav: Tabs & User Profile */}
          <div className="flex items-center gap-3">
            {onTabChange && (
              <nav className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
                <button
                  type="button"
                  id="tab-btn-generator"
                  onClick={() => onTabChange('generator')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    activeTab === 'generator'
                      ? 'bg-white text-blue-700 font-semibold shadow-2xs'
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
                      ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History</span>
                  {typeof historyCount === 'number' && historyCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-mono">
                      {historyCount}
                    </span>
                  )}
                </button>
              </nav>
            )}

            {/* User Profile Pill or Status */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {currentUser.role}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-xs font-bold">
                  {currentUser.name.charAt(0)}
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                title="System operational"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                <span>Operational</span>
              </div>
            )}
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
          <span>ShiftFlow &bull; Structured handovers for operational teams</span>
          <span className="font-mono text-[11px] text-slate-400">
            Deterministic Deduplication &bull; Precedence Classification &bull; ISO-8601 UTC
          </span>
        </div>
      </footer>
    </div>
  );
};
