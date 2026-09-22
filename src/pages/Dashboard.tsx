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
import { CalculationBreakdownModal } from '../components/CalculationBreakdownModal.js';
import {
  apiGenerateHandover,
  apiListSources,
  apiGetHistoryCount,
  ApiError,
} from '../services/apiClient.js';

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
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  const fetchHistoryCount = async () => {
    try {
      const count = await apiGetHistoryCount();
      setHistoryCount(count);
    } catch {
      // Non-critical
    }
  };

  useEffect(() => {
    // Attempt to load live sources from server, falling back to registered fixtures
    const fetchSources = async () => {
      try {
        const loadedSources = await apiListSources();
        if (Array.isArray(loadedSources) && loadedSources.length > 0) {
          setSources(loadedSources);
        }
      } catch {
        // Fallback to imported default config
      }
    };
    fetchSources();
    fetchHistoryCount();

    // Auto-generate seeded shift handover note so demo is instant and ready
    handleGenerate({
      shift_start: '2026-09-03T17:00:00+05:30',
      shift_end: '2026-09-03T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      sources: ['ticketing', 'incidents'],
    });
  }, []);

  const handleGenerate = async (request: GenerationRequest) => {
    setGenerationState('loading');
    setErrorMessage(null);
    setErrorDetails([]);

    try {
      const result = await apiGenerateHandover(request);
      setGenerationState('success');
      setGenerationResult(result);
      fetchHistoryCount();
    } catch (err) {
      setGenerationState('error');
      const apiErr = err as ApiError;
      const msg = apiErr instanceof Error ? apiErr.message : 'Unable to complete handover note generation';
      setErrorMessage(msg);
      setErrorDetails(
        Array.isArray(apiErr.details) && apiErr.details.length > 0
          ? apiErr.details
          : [msg]
      );
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
      onOpenCalcAudit={() => setIsAuditModalOpen(true)}
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

      {/* Global Calculation and Formula Audit Modal */}
      <CalculationBreakdownModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        note={generationResult?.handover_note || null}
      />
    </AppShell>
  );
};

