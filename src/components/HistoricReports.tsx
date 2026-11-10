/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useRef} from 'react';
import {
  RateSettings,
  PumpState,
  LogEvent,
  format24HourTime,
  formatDDMMYYYY,
} from '../types/produodopa';
import {
  getHistoricDayRecords,
  exportToCSV,
  parseImportCSV,
  CSVImportResult,
} from '../services/storage';
import {
  Calendar,
  Download,
  Upload,
  Clock,
  Droplets,
  Activity,
  PlusCircle,
  FileText,
  Power,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  X,
} from 'lucide-react';

interface HistoricReportsProps {
  settings: RateSettings;
  pumpState: PumpState;
  events: LogEvent[];
  onImportData?: (newPumpState: PumpState, newSettings: RateSettings, newEvents: LogEvent[]) => void;
}

export const HistoricReports: React.FC<HistoricReportsProps> = ({
  settings,
  pumpState,
  events,
  onImportData,
}) => {
  // Compute historic records (EXCLUDES CURRENT DAY, max 90 days)
  const dayRecords = getHistoricDayRecords(events, settings);

  // Selected day for log view (defaults to most recent completed day)
  const [selectedDayKey, setSelectedDayKey] = useState<string>(
    dayRecords.length > 0 ? dayRecords[0].dateKey : ''
  );

  // File input ref for CSV import
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<CSVImportResult | null>(null);
  const [importToast, setImportToast] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Handle CSV file selection
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseImportCSV(text);
      if (!result.success) {
        setImportError(result.error || 'Failed to parse CSV file.');
        setTimeout(() => setImportError(null), 6000);
      } else {
        setPendingImport(result);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read the selected CSV file.');
      setTimeout(() => setImportError(null), 6000);
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  };

  // Confirm and apply import
  const confirmImport = () => {
    if (!pendingImport || !pendingImport.pumpState || !pendingImport.settings || !pendingImport.events) {
      return;
    }

    if (onImportData) {
      onImportData(pendingImport.pumpState, pendingImport.settings, pendingImport.events);
    }

    setImportToast(
      `Data successfully imported! Restored ${pendingImport.events.length} log events and current pump state.`
    );
    setPendingImport(null);
    setTimeout(() => setImportToast(null), 6000);
  };

  // Selected day record
  const selectedDayRecord =
    dayRecords.find((d) => d.dateKey === selectedDayKey) || dayRecords[0] || null;

  return (
    <div className="space-y-6">
      {/* Hidden file input for CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,text/csv"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Import Success Banner */}
      {importToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 p-4 rounded-xl flex items-center justify-between text-xs sm:text-sm shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{importToast}</span>
          </div>
          <button
            onClick={() => setImportToast(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Import Error Banner */}
      {importError && (
        <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 p-4 rounded-xl flex items-center justify-between text-xs sm:text-sm shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium">{importError}</span>
          </div>
          <button
            onClick={() => setImportError(null)}
            className="text-rose-700 hover:text-rose-900 dark:text-rose-300 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CSV Import Confirmation Modal */}
      {pendingImport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm CSV Data Import
                </h3>
              </div>
              <button
                onClick={() => setPendingImport(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              A valid Pro-Duodopa backup file has been parsed. Importing will reload the saved therapy state, syringe volume, cannula age, and log records onto this device.
            </p>

            {/* Import Summary Details */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Events in backup:</span>
                <strong className="text-slate-900 dark:text-white font-mono">
                  {pendingImport.events?.length || 0} records (max 90 days)
                </strong>
              </div>
              {pendingImport.pumpState && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Pump State:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {pendingImport.pumpState.isRunning ? 'RUNNING' : 'STOPPED'} ({pendingImport.pumpState.currentRate.toFixed(2)} ml/h)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Syringe Level:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {(10 - pendingImport.pumpState.syringeInfusedVolume).toFixed(2)} ml remaining
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Cannula Insertion:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {formatDDMMYYYY(pendingImport.pumpState.lastCannulaChange)}
                    </strong>
                  </div>
                </>
              )}
              {pendingImport.summary?.exportTimestamp && (
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Backup Date:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono">
                    {formatDDMMYYYY(pendingImport.summary.exportTimestamp)} at {format24HourTime(pendingImport.summary.exportTimestamp)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm transition cursor-pointer"
              >
                Confirm Import & Restore State
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Export / Import CSV */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Data Log
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Previous 90 days audit history (excludes today) · Days archive at midnight (00:00)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Import CSV Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center gap-2 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              title="Load a previously exported CSV file to restore log and state on this device"
            >
              <Upload className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Import CSV</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={() => exportToCSV(pumpState, settings, events, dayRecords)}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="Export all logs up to 90 days and current state data to a CSV file"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Day Clinical Log Table & Breakdown */}
      {selectedDayRecord ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daily Log for {selectedDayRecord.dateStr}</span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Detailed timeline of rates, extra doses, notes, and cannula/syringe changes
              </span>
            </div>

            {/* Day Selector Quick Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                Select Date:
              </label>
              <select
                value={selectedDayRecord.dateKey}
                onChange={(e) => setSelectedDayKey(e.target.value)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:border-sky-500 cursor-pointer"
              >
                {dayRecords.map((d) => (
                  <option key={d.dateKey} value={d.dateKey}>
                    {d.dateStr} ({d.totalInfusedMl.toFixed(2)} ml)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Daily metrics summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Total Infused:</span>
              <strong className="font-mono text-base text-slate-900 dark:text-white tabular-nums">
                {selectedDayRecord.totalInfusedMl.toFixed(2)} ml
              </strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Avg Rate Per Hour:</span>
              <strong className="font-mono text-base text-sky-600 dark:text-sky-400 tabular-nums">
                {selectedDayRecord.averageRatePerHour.toFixed(3)} ml/h
              </strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Extra Doses:</span>
              <strong className="font-mono text-base text-slate-900 dark:text-white tabular-nums">
                {selectedDayRecord.extraDoseCount} ({selectedDayRecord.extraDosesMl.toFixed(2)} ml)
              </strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Logged Events:</span>
              <strong className="font-mono text-base text-slate-900 dark:text-white tabular-nums">
                {selectedDayRecord.events.length} entries
              </strong>
            </div>
          </div>

          {/* Events List for Selected Day */}
          {selectedDayRecord.events.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-6 text-center">
              Continuous basal infusion running at baseline rate ({settings.baseRate.toFixed(2)} ml/h). No manual dose alterations or ad hoc notes recorded on this date.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              {selectedDayRecord.events.map((ev) => {
                const timeStr = format24HourTime(ev.effectiveTime || ev.timestamp);
                return (
                  <div key={ev.id} className="p-3.5 bg-white dark:bg-slate-900 flex items-start justify-between gap-4 text-xs">
                    <div className="flex items-start gap-3">
                      <span className="font-mono font-bold text-slate-600 dark:text-slate-400 tabular-nums shrink-0 mt-0.5">
                        {timeStr}
                      </span>
                      <div className="space-y-1">
                        {ev.type === 'rate_change' && (
                          <div className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                            <span className="text-slate-600 dark:text-slate-400">Infusion rate adjusted to</span>
                            <strong className="uppercase text-sky-600 dark:text-sky-400 font-bold">{ev.details.rateLevel}</strong>
                            <span className="font-mono font-bold">({ev.details.rateValue?.toFixed(2)} ml/h)</span>
                          </div>
                        )}
                        {ev.type === 'extra_dose' && (
                          <div className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Extra dose administered: {ev.details.doseAmount?.toFixed(2)} ml</span>
                          </div>
                        )}
                        {ev.type === 'syringe_change' && (
                          <div className="text-sky-700 dark:text-sky-300 font-medium flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Syringe changed (10.0 ml fresh syringe)</span>
                          </div>
                        )}
                        {ev.type === 'cannula_change' && (
                          <div className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5" />
                            <span>Cannula changed & site rotated (Day 1)</span>
                          </div>
                        )}
                        {ev.type === 'pump_start' && (
                          <div className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                            <Power className="w-3.5 h-3.5" />
                            <span>Pump started / resumed flow</span>
                          </div>
                        )}
                        {ev.type === 'pump_stop' && (
                          <div className="text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                            <Power className="w-3.5 h-3.5" />
                            <span>Pump stopped / paused flow</span>
                          </div>
                        )}
                        {ev.type === 'symptom_note' && (
                          <div className="space-y-1">
                            {ev.details.onOffStatus && (
                              <span
                                className={`inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  ev.details.onOffStatus === 'ON'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {ev.details.onOffStatus} Period
                              </span>
                            )}
                            <span className="text-slate-700 dark:text-slate-300">
                              {ev.details.noteText}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Completed Historic Days Yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Historic reporting archives completed days at midnight (00:00). Today's live events are available under the <strong>Today's Infusion</strong> tab and will archive here automatically tomorrow.
          </p>
          <p className="text-xs text-sky-600 dark:text-sky-400 font-medium pt-1">
            Tip: You can switch to <strong>Test Mode</strong> in Settings to explore historical logs with simulated clinical data.
          </p>
        </div>
      )}
    </div>
  );
};
