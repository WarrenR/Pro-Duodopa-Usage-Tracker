/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState} from 'react';
import {RateSettings} from '../types/produodopa';
import {DEFAULT_SETTINGS} from '../services/storage';
import {Sliders, Save, RotateCcw, Check, Info, ShieldCheck} from 'lucide-react';

interface SettingsPanelProps {
  settings: RateSettings;
  onSaveSettings: (newSettings: RateSettings) => void;
  onResetData: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSaveSettings,
  onResetData,
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
