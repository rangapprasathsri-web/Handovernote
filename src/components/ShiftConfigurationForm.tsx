import React, { useState } from 'react';
import { Calendar, Clock, Globe, Play, AlertCircle, RotateCcw } from 'lucide-react';
import { COMMON_TIMEZONES } from '../config/sources.js';
import { GenerationRequest } from '../models/generation.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { buildIsoWithTimezone } from '../utils/date.js';
import { SourceSelector } from './SourceSelector.js';

export interface ShiftConfigurationFormProps {
  availableSources: SourceConfig[];
  onSubmit: (request: GenerationRequest) => Promise<void>;
  isLoading: boolean;
}

interface FieldErrors {
  shiftStart?: string;
  shiftEnd?: string;
  sources?: string;
  dateRange?: string;
}

export const ShiftConfigurationForm: React.FC<ShiftConfigurationFormProps> = ({
  availableSources,
  onSubmit,
  isLoading,
}) => {
  // Default values set to documented 2026-09-03 shift
  const [shiftStartLocal, setShiftStartLocal] = useState('2026-09-03T17:00');
  const [shiftEndLocal, setShiftEndLocal] = useState('2026-09-03T20:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [selectedSources, setSelectedSources] = useState<string[]>(['ticketing', 'incidents']);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Real-time timezone-aware ISO projection strings
  const shiftStartIso = buildIsoWithTimezone(shiftStartLocal, timezone);
  const shiftEndIso = buildIsoWithTimezone(shiftEndLocal, timezone);

  const handleApplyPreset = (preset: 'documented' | 'past8h') => {
    if (preset === 'documented') {
      setShiftStartLocal('2026-09-03T17:00');
      setShiftEndLocal('2026-09-03T20:00');
      setTimezone('Asia/Kolkata');
      setSelectedSources(['ticketing', 'incidents']);
      setFieldErrors({});
    } else {
      setShiftStartLocal('2026-09-03T12:00');
      setShiftEndLocal('2026-09-03T20:00');
      setTimezone('Asia/Kolkata');
      setSelectedSources(['ticketing', 'incidents']);
      setFieldErrors({});
    }
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    if (!shiftStartLocal) {
      errors.shiftStart = 'Shift start date and time is required.';
    }

    if (!shiftEndLocal) {
      errors.shiftEnd = 'Shift end date and time is required.';
    }

    if (shiftStartLocal && shiftEndLocal && shiftStartIso && shiftEndIso) {
      const startTime = Date.parse(shiftStartIso);
      const endTime = Date.parse(shiftEndIso);

      if (isNaN(startTime)) {
        errors.shiftStart = 'Invalid date format.';
      }
      if (isNaN(endTime)) {
        errors.shiftEnd = 'Invalid date format.';
      }

      if (!isNaN(startTime) && !isNaN(endTime)) {
        if (endTime < startTime) {
          errors.dateRange = 'Shift end time must be chronologically after shift start time.';
        } else if (endTime === startTime) {
          errors.dateRange = 'Shift end time cannot be equal to shift start time.';
        }
      }
    }

    if (selectedSources.length === 0) {
      errors.sources = 'Select at least one source system to inspect shift activity.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    if (!validateForm()) {
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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Shift window &amp; sources
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the time window and source queues to include in this handover.
          </p>
        </div>

        {/* Quick window preset buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            id="preset-documented-btn"
            onClick={() => handleApplyPreset('documented')}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Reset to 2026-09-03 17:00 to 20:00 IST window"
          >
            Seeded Shift Window
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('past8h')}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            8-Hour Window
          </button>
        </div>
      </div>

      <form
        id="shift-generation-form"
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 flex flex-col gap-6"
      >
        {/* Date range error banner if chronological issue */}
        {fieldErrors.dateRange && (
          <div
            id="client-validation-error-box"
            role="alert"
            className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            <span className="font-medium">{fieldErrors.dateRange}</span>
          </div>
        )}

        {/* Two-column date & time grid on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Shift Start */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="shift-start-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Shift Start</span>
            </label>
            <input
              id="shift-start-input"
              type="datetime-local"
              value={shiftStartLocal}
              onChange={(e) => {
                setShiftStartLocal(e.target.value);
                if (fieldErrors.shiftStart || fieldErrors.dateRange) {
                  setFieldErrors((prev) => ({ ...prev, shiftStart: undefined, dateRange: undefined }));
                }
              }}
              disabled={isLoading}
              aria-invalid={Boolean(fieldErrors.shiftStart || fieldErrors.dateRange)}
              aria-describedby={
                fieldErrors.shiftStart ? 'shift-start-error' : 'shift-start-helper'
              }
              className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-slate-50/50 text-slate-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                fieldErrors.shiftStart || fieldErrors.dateRange
                  ? 'border-rose-400 bg-rose-50/30'
                  : 'border-slate-300 hover:border-slate-400'
              } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            {fieldErrors.shiftStart ? (
              <p id="shift-start-error" role="alert" className="text-xs text-rose-600 font-medium">
                {fieldErrors.shiftStart}
              </p>
            ) : (
              <span id="shift-start-helper" className="text-[11px] text-slate-500 font-mono truncate" title={shiftStartIso}>
                Inclusive start: {shiftStartIso || '—'}
              </span>
            )}
          </div>

          {/* Shift End */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="shift-end-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Shift End</span>
            </label>
            <input
              id="shift-end-input"
              type="datetime-local"
              value={shiftEndLocal}
              onChange={(e) => {
                setShiftEndLocal(e.target.value);
                if (fieldErrors.shiftEnd || fieldErrors.dateRange) {
                  setFieldErrors((prev) => ({ ...prev, shiftEnd: undefined, dateRange: undefined }));
                }
              }}
              disabled={isLoading}
              aria-invalid={Boolean(fieldErrors.shiftEnd || fieldErrors.dateRange)}
              aria-describedby={
                fieldErrors.shiftEnd ? 'shift-end-error' : 'shift-end-helper'
              }
              className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-slate-50/50 text-slate-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                fieldErrors.shiftEnd || fieldErrors.dateRange
                  ? 'border-rose-400 bg-rose-50/30'
                  : 'border-slate-300 hover:border-slate-400'
              } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            {fieldErrors.shiftEnd ? (
              <p id="shift-end-error" role="alert" className="text-xs text-rose-600 font-medium">
                {fieldErrors.shiftEnd}
              </p>
            ) : (
              <span id="shift-end-helper" className="text-[11px] text-slate-500 font-mono truncate" title={shiftEndIso}>
                Exclusive end bound: {shiftEndIso || '—'}
              </span>
            )}
          </div>
        </div>

        {/* Operating Timezone Selector */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="timezone-select"
            className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Operating Timezone</span>
          </label>
          <select
            id="timezone-select"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={isLoading}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 text-slate-900 hover:border-slate-400 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Source record timestamps are normalized to UTC for filtering and formatted in this timezone for review.
          </p>
        </div>

        {/* Connected Source Systems Selection */}
        <SourceSelector
          availableSources={availableSources}
          selectedSources={selectedSources}
          onChange={(newSelected) => {
            setSelectedSources(newSelected);
            if (fieldErrors.sources) {
              setFieldErrors((prev) => ({ ...prev, sources: undefined }));
            }
          }}
          disabled={isLoading}
          errorMessage={fieldErrors.sources}
        />

        {/* Form Submission Action */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Applies half-open shift window [start, end) and precedence classification.
          </span>
          <button
            id="generate-handover-btn"
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                <span>Preparing handover note…</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" aria-hidden="true" />
                <span>Create Handover Note</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
