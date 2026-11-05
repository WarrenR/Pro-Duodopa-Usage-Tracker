/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState} from 'react';
import {RateSettings} from '../types/produodopa';
import {DEFAULT_SETTINGS} from '../services/storage';
import {
  Sliders,
  Save,
  RotateCcw,
  Check,
  ShieldCheck,
  FlaskConical,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface SettingsPanelProps {
  settings: RateSettings;
  isTestMode: boolean;
  onSaveSettings: (newSettings: RateSettings) => void;
  onToggleTestMode: (enabled: boolean) => void;
  onResetTestData: () => void;
  onResetRealData: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  isTestMode,
  onSaveSettings,
  onToggleTestMode,
  onResetTestData,
  onResetRealData,
}) => {
  const [lowRate, setLowRate] = useState<string>(settings.lowRate.toString());
  const [baseRate, setBaseRate] = useState<string>(settings.baseRate.toString());
  const [highRate, setHighRate] = useState<string>(settings.highRate.toString());
  const [extraDoseAmount, setExtraDoseAmount] = useState<string>(
    settings.extraDoseAmount.toString()
  );
  // Wait period in 1-hour increments, min 2, max 8
  const [extraDoseWaitHours, setExtraDoseWaitHours] = useState<number>(
    settings.extraDoseWaitHours
  );

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [modeSuccess, setModeSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const low = Math.max(0.01, parseFloat(lowRate) || DEFAULT_SETTINGS.lowRate);
    const base = Math.max(0.01, parseFloat(baseRate) || DEFAULT_SETTINGS.baseRate);
    const high = Math.max(0.01, parseFloat(highRate) || DEFAULT_SETTINGS.highRate);
    const dose = Math.max(0.01, parseFloat(extraDoseAmount) || DEFAULT_SETTINGS.extraDoseAmount);
    const wait = Math.min(8, Math.max(2, Math.round(extraDoseWaitHours)));

    const newSettings: RateSettings = {
      lowRate: Math.round(low * 100) / 100,
      baseRate: Math.round(base * 100) / 100,
      highRate: Math.round(high * 100) / 100,
      extraDoseAmount: Math.round(dose * 100) / 100,
      extraDoseWaitHours: wait,
    };

    onSaveSettings(newSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    const confirmReset = window.confirm(
      'Reset all infusion rates and extra dose settings back to clinical default values?'
    );
    if (!confirmReset) return;

    setLowRate(DEFAULT_SETTINGS.lowRate.toString());
    setBaseRate(DEFAULT_SETTINGS.baseRate.toString());
    setHighRate(DEFAULT_SETTINGS.highRate.toString());
    setExtraDoseAmount(DEFAULT_SETTINGS.extraDoseAmount.toString());
    setExtraDoseWaitHours(DEFAULT_SETTINGS.extraDoseWaitHours);

    onSaveSettings(DEFAULT_SETTINGS);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleModeToggle = (enableTest: boolean) => {
    if (enableTest) {
      const confirmEnter = window.confirm(
        'Switch to Test Mode: Your current real patient data will be saved. The app will switch to simulated test data so you can test and explore charts and logs. Continue?'
      );
      if (!confirmEnter) return;
      onToggleTestMode(true);
      setModeSuccess('Switched to Test Mode with simulated clinical data.');
    } else {
      const confirmExit = window.confirm(
        'Exit Test Mode: The app will resume with your real patient data. Continue?'
      );
      if (!confirmExit) return;
      onToggleTestMode(false);
      setModeSuccess('Exited Test Mode. Resumed with real patient data.');
    }
    setTimeout(() => setModeSuccess(null), 4000);
  };

  const handleResetReal = () => {
    const confirmClean = window.confirm(
      'Reset Real Data to First Use: This will set a full syringe (10.0 ml), clear all logs, and place the pump in a "Stopped" state. Proceed?'
    );
    if (!confirmClean) return;
    onResetRealData();
    setModeSuccess('Real data reset to deployment state: full syringe, 0 logs, stopped state.');
    setTimeout(() => setModeSuccess(null), 4000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Test Mode Switch Panel */}
      <div
        className={`rounded-2xl border p-6 shadow-sm space-y-4 transition-colors ${
          isTestMode
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical
              className={`w-5 h-5 ${
                isTestMode ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
              }`}
            />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Application Mode (Real Data vs Test Mode)
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Switch between real patient therapy records and simulated clinical test data
              </span>
            </div>
          </div>

          {/* Current State Badge */}
          <span
            className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
              isTestMode
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}
          >
            {isTestMode ? 'Test Mode (Simulated Data)' : 'Real Patient Mode'}
          </span>
        </div>

        {/* Test Mode Explanation */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {isTestMode
            ? 'Test Mode is currently ACTIVE. The app is loaded with simulated historical logs, cannula aging, and rate changes for training and demonstration. When you switch out of test mode, your real patient data will safely resume exactly where it was.'
            : 'The app is currently tracking REAL patient data. Switching to Test Mode will update and save your real data, then load simulated test logs so you can explore charts and features without altering real therapy history.'}
        </p>

        {/* Mode Toggle Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {isTestMode ? (
            <button
              onClick={() => handleModeToggle(false)}
              className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Exit Test Mode & Resume Real Data</span>
            </button>
          ) : (
            <button
              onClick={() => handleModeToggle(true)}
              className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-sm text-amber-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Switch to Test Mode (Simulated Data)</span>
            </button>
          )}

          {isTestMode && (
            <button
              onClick={onResetTestData}
              className="min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer"
              title="Reset the simulated test scenario data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Sample Test Scenario</span>
            </button>
          )}

          {!isTestMode && (
            <button
              onClick={handleResetReal}
              className="min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              title="Clear all real logs and restart with a clean deployment state"
            >
              <span>Reset Real Data to First Use</span>
            </button>
          )}
        </div>

        {modeSuccess && (
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{modeSuccess}</span>
          </div>
        )}
      </div>

      {/* Therapy Settings & Rates */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Therapy Settings & Infusion Rates
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure rates for Pro-Duodopa (Fos-levodopa/Fos-Carbidopa) subcutaneous pump as prescribed by your neurologist or PD nurse specialist.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rate Levels Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Infusion Rate Levels [Low, Base, High] (ml/h)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Low Rate */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Low Rate
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0.05"
                    max="2.00"
                    value={lowRate}
                    onChange={(e) => setLowRate(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-base font-bold text-center focus:border-sky-500"
                  />
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    ml/h
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  e.g., Nighttime or rest flow
                </span>
              </div>

              {/* Base Rate */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Base Rate
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0.05"
                    max="2.00"
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-base font-bold text-center focus:border-sky-500"
                  />
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    ml/h
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Standard daytime continuous rate
                </span>
              </div>

              {/* High Rate */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  High Rate
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0.05"
                    max="2.00"
                    value={highRate}
                    onChange={(e) => setHighRate(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-base font-bold text-center focus:border-sky-500"
                  />
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    ml/h
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Elevated demand / morning mobility
                </span>
              </div>
            </div>
          </div>

          {/* Extra Dose Settings */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Extra Dose (Rescue Bolus) Configuration
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dose Amount */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Dose Amount (ml)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0.05"
                    max="1.00"
                    value={extraDoseAmount}
                    onChange={(e) => setExtraDoseAmount(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-base font-bold text-center focus:border-sky-500"
                  />
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    ml
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Default: 0.17 ml (as prescribed)
                </span>
              </div>

              {/* Wait Period in 1-hour increments (min 2, max 8) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Wait Period Before Next Extra Dose
                  </label>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                    {extraDoseWaitHours} Hours
                  </span>
                </div>

                {/* 1-Hour increments buttons (2h, 3h, 4h, 5h, 6h, 7h, 8h) */}
                <div className="grid grid-cols-7 gap-1 pt-1">
                  {[2, 3, 4, 5, 6, 7, 8].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtraDoseWaitHours(h)}
                      className={`min-h-[44px] py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        extraDoseWaitHours === h
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Minimum: 2 hours · Maximum: 8 hours (in 1-hour increments)
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-sky-600 hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Therapy Settings</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="w-full sm:w-auto min-h-[48px] px-4 py-2.5 rounded-xl font-medium text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Clinical Defaults</span>
            </button>
          </div>

          {savedSuccess && (
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>Therapy settings updated and saved to local storage.</span>
            </div>
          )}
        </form>
      </div>

      {/* Offline & Data Security Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Offline Privacy & Local Storage Guarantee
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          All your Parkinson's medication logs, syringe changes, cannula rotations, and notes are stored strictly on this device in browser local storage. No medical data is transmitted to external servers. The app operates 100% offline.
        </p>
      </div>
    </div>
  );
};
