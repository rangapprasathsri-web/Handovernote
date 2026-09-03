import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Globe,
  Database,
  CheckSquare,
  Square,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { COMMON_TIMEZONES, DEFAULT_SHIFT_WINDOW } from '../config/sources.js';
import { GenerationRequest } from '../models/generation.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { buildIsoWithTimezone, formatInTimezone } from '../utils/date.js';

interface ShiftWindowFormProps {
  availableSources: SourceConfig[];
  onSubmit: (request: GenerationRequest) => Promise<void>;
  isLoading: boolean;
}

export const ShiftWindowForm: React.FC<ShiftWindowFormProps> = ({
  availableSources,
  onSubmit,
  isLoading,
}) => {
  // Initial state uses the documented 2026-09-03 shift window
  const [shiftStartLocal, setShiftStartLocal] = useState('2026-09-03T17:00');
  const [shiftEndLocal, setShiftEndLocal] = useState('2026-09-03T20:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [selectedSources, setSelectedSources] = useState<string[]>([
    'ticketing',
    'incidents',
  ]);
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  // Compute timezone-aware ISO strings
  const shiftStartIso = buildIsoWithTimezone(shiftStartLocal, timezone);
  const shiftEndIso = buildIsoWithTimezone(shiftEndLocal, timezone);

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleApplyPreset = (type: 'documented' | 'current8h') => {
    if (type === 'documented') {
      setShiftStartLocal('2026-09-03T17:00');
      setShiftEndLocal('2026-09-03T20:00');
      setTimezone('Asia/Kolkata');
      setSelectedSources(['ticketing', 'incidents']);
      setClientErrors([]);
    } else {
      // Past 8 hours relative to reference date
      const end = new Date('2026-09-03T20:00:00+05:30');
      const start = new Date(end.getTime() - 8 * 60 * 60 * 1000);
      setShiftStartLocal('2026-09-03T12:00');
      setShiftEndLocal('2026-09-03T20:00');
      setTimezone('Asia/Kolkata');
      setSelectedSources(['ticketing', 'incidents']);
      setClientErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!shiftStartLocal) {
      errors.push('Shift start date & time is required');
    }
    if (!shiftEndLocal) {
      errors.push('Shift end date & time is required');
    }

    if (shiftStartIso && shiftEndIso) {
      const startTime = Date.parse(shiftStartIso);
      const endTime = Date.parse(shiftEndIso);
      if (endTime <= startTime) {
        errors.push('Shift end time must be chronologically after shift start time');
      }
    }

    if (selectedSources.length === 0) {
      errors.push('At least one source must be selected');
    }

    setClientErrors(errors);

    if (errors.length > 0) {
      return;
    }

    const payload: GenerationRequest = {
      shift_start: shiftStartIso,
      shift_end: shiftEndIso,
      timezone,
      sources: selectedSources,
    };

    await onSubmit(payload);
  };

  return (
    <form
      id="shift-generation-form"
      onSubmit={handleSubmit}
      className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs flex flex-col gap-6"
    >
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
            Shift Window Configuration
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Specify the operational window and participating sources for the handover note.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            id="preset-documented-btn"
            onClick={() => handleApplyPreset('documented')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors"
            title="Reset to documented 2026-09-03 shift window"
          >
            Seeded Shift Window
          </button>
        </div>
      </div>

      {clientErrors.length > 0 && (
        <div
          id="client-validation-error-box"
          className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex flex-col gap-1"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Please correct the following errors:</span>
          </div>
          <ul className="list-disc list-inside text-xs pl-5 space-y-0.5 text-red-600">
            {clientErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Date & Time Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shift Start */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="shift-start-input"
            className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            Shift Start
          </label>
          <input
            id="shift-start-input"
            type="datetime-local"
            value={shiftStartLocal}
            onChange={(e) => {
              setShiftStartLocal(e.target.value);
              setClientErrors([]);
            }}
            required
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-900 focus:border-stone-900 bg-stone-50/40 text-stone-900"
          />
          <span className="text-[11px] text-stone-500 font-mono truncate" title={shiftStartIso}>
            ISO: {shiftStartIso || '—'}
          </span>
        </div>

        {/* Shift End */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="shift-end-input"
            className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            Shift End
          </label>
          <input
            id="shift-end-input"
            type="datetime-local"
            value={shiftEndLocal}
            onChange={(e) => {
              setShiftEndLocal(e.target.value);
              setClientErrors([]);
            }}
            required
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-900 focus:border-stone-900 bg-stone-50/40 text-stone-900"
          />
          <span className="text-[11px] text-stone-500 font-mono truncate" title={shiftEndIso}>
            ISO: {shiftEndIso || '—'}
          </span>
        </div>
      </div>

      {/* Timezone Selector */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="timezone-select"
          className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5"
        >
          <Globe className="w-3.5 h-3.5 text-stone-400" />
          Operating Timezone
        </label>
        <select
          id="timezone-select"
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            setClientErrors([]);
          }}
          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-900 focus:border-stone-900 bg-stone-50/40 text-stone-900"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-stone-500">
          Timestamps from all source records will be normalized relative to this shift timezone.
        </p>
      </div>

      {/* Sources Selection */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-stone-400" />
            Ingestion Sources ({selectedSources.length} selected)
          </label>
          <span className="text-xs text-stone-500">Connected Operational Systems</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="sources-selection-container">
          {availableSources.map((source) => {
            const isChecked = selectedSources.includes(source.id);
            return (
              <div
                key={source.id}
                id={`source-card-${source.id}`}
                onClick={() => toggleSource(source.id)}
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all select-none ${
                  isChecked
                    ? 'border-stone-900 bg-stone-900/[0.03] text-stone-900'
                    : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                }`}
              >
                <div className="pt-0.5">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-stone-900" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900 truncate">
                      {source.name}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                      {source.id}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 leading-snug line-clamp-2">
                    {source.description || source.path}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Action */}
      <div className="pt-2 flex items-center justify-between gap-4">
        <div className="text-xs text-stone-500 hidden sm:block">
          Ingests activity across configured sources, collapses duplicates, and generates a structured handover note.
        </div>
        <button
          id="generate-handover-btn"
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating Handover Note...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Create Handover Note</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
