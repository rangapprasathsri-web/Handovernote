import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { GenerationStatus } from '../components/GenerationStatus.js';
import { GenerationResultView } from '../components/GenerationResultView.js';
import { ShiftWindowForm } from '../components/ShiftWindowForm.js';
import { SourceInspector } from '../components/SourceInspector.js';
import { REGISTERED_SOURCES } from '../config/sources.js';
import { GenerationRequest, GenerationResult } from '../models/generation.js';
import { SourceConfig } from '../models/sourceConfig.js';

export const Dashboard: React.FC = () => {
  const [sources, setSources] = useState<SourceConfig[]>(REGISTERED_SOURCES);
  const [generationState, setGenerationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    // Attempt to load live sources from server
    const fetchSources = async () => {
      try {
        const res = await fetch('/api/sources');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.sources) && data.sources.length > 0) {
            setSources(data.sources);
          }
        }
      } catch {
        // Fallback to imported default config
      }
    };
    fetchSources();
  }, []);

  const handleGenerate = async (request: GenerationRequest) => {
    setGenerationState('loading');
    setErrorMessage(null);
    setErrorDetails([]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        setGenerationState('error');
        setErrorMessage(data.error || 'Request validation error');
        setErrorDetails(Array.isArray(data.details) ? data.details : [data.error || 'Unknown error']);
        setGenerationResult(null);
        return;
      }

      setGenerationState('success');
      setGenerationResult(data as GenerationResult);
    } catch (err) {
      setGenerationState('error');
      const msg = err instanceof Error ? err.message : 'Network error communicating with server';
      setErrorMessage(msg);
      setErrorDetails([msg]);
      setGenerationResult(null);
    }
  };

  const handleReset = () => {
    setGenerationResult(null);
    setGenerationState('idle');
    setErrorMessage(null);
    setErrorDetails([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Application Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight leading-none">
                Shift Handover Note Generator
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Deterministic operational note generation & single-file PDF export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Status / Notice Banner */}
        <GenerationStatus
          status={generationState}
          errorMessage={errorMessage}
          errorDetails={errorDetails}
          warnings={generationResult?.warnings}
        />

        {/* Dynamic Workflow: When result exists, show full-width Handover Preview */}
        {generationResult?.handover_note ? (
          <div className="flex flex-col gap-6">
            <GenerationResultView result={generationResult} onReset={handleReset} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Controls (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <ShiftWindowForm
                availableSources={sources}
                onSubmit={handleGenerate}
                isLoading={generationState === 'loading'}
              />
            </div>

            {/* Right Column: Handover Overview (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <GenerationResultView result={generationResult} onReset={handleReset} />
            </div>
          </div>
        )}

        {/* Secondary Section: Source Data & Schema Contract Explorer */}
        <SourceInspector sources={sources} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Shift Handover Note Generator • Production Operations Console</span>
          <span className="font-mono text-[11px]">
            Deterministic Deduplication &bull; Precedence Classification &bull; ISO-8601 UTC
          </span>
        </div>
      </footer>
    </div>
  );
};
