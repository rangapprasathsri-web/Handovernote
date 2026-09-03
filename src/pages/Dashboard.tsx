import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/AppShell.js';
import { PageHeader } from '../components/PageHeader.js';
import { GenerationStatus } from '../components/GenerationStatus.js';
import { GenerationResultView } from '../components/GenerationResultView.js';
import { ShiftWindowForm } from '../components/ShiftWindowForm.js';
import { SourceInspector } from '../components/SourceInspector.js';
import { HandoverHistoryView } from '../components/HandoverHistoryView.js';
import { REGISTERED_SOURCES } from '../config/sources.js';
import { GenerationRequest, GenerationResult } from '../models/generation.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { UserProfile } from './LoginPage.js';

export interface DashboardProps {
  onNavigateToLanding?: () => void;
  currentUser?: UserProfile | null;
  onSignOut?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToLanding,
  currentUser,
  onSignOut,
}) => {
  const [sources, setSources] = useState<SourceConfig[]>(REGISTERED_SOURCES);
  const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [generationState, setGenerationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  const fetchHistoryCount = async () => {
    try {
      const res = await fetch('/api/handovers?limit=1');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.total === 'number') {
          setHistoryCount(data.total);
        }
      }
    } catch {
      // Non-critical
    }
  };

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
    fetchHistoryCount();
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
      fetchHistoryCount();
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
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      historyCount={historyCount}
      onNavigateToLanding={onNavigateToLanding}
      currentUser={currentUser}
      onSignOut={onSignOut}
    >
      {activeTab === 'history' ? (
        <HandoverHistoryView onBackToGenerator={() => setActiveTab('generator')} />
      ) : (
        <>
          {/* Page Title & Context Header */}
          {!generationResult?.handover_note && (
            <PageHeader
              title="Create a shift handover note"
              description="Bring together ticket updates, incident activity, and operational tasks from your shift window into a structured, single-file handover."
            />
          )}

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
        </>
      )}
    </AppShell>
  );
};

