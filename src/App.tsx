/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useEffect} from 'react';
import {Header} from './components/Header';
import {MainTracker} from './components/MainTracker';
import {HistoricReports} from './components/HistoricReports';
import {SettingsPanel} from './components/SettingsPanel';
import {
  RateSettings,
  PumpState,
  LogEvent,
} from './types/produodopa';
import {
  isTestModeActive,
  loadCurrentSettings,
  saveCurrentSettings,
  loadCurrentPumpState,
  saveCurrentPumpState,
  loadCurrentEvents,
  saveCurrentEvents,
  switchMode,
  resetTestScenario,
  resetRealDataToFirstUse,
  generateDefaultRealPumpState,
  DEFAULT_SETTINGS,
} from './services/storage';

// Initialize real data for first-time use
function ensureInitialized(): boolean {
  const initializedKey = 'produodopa_real_initialized_v2';
  if (!localStorage.getItem(initializedKey)) {
    // First deployment: full syringe, no historic data, stopped state
    const realPumpState = generateDefaultRealPumpState();
    localStorage.setItem('produodopa_real_pump_state_v2', JSON.stringify(realPumpState));
    localStorage.setItem('produodopa_real_events_v2', JSON.stringify([]));
    localStorage.setItem('produodopa_real_settings_v2', JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(initializedKey, 'true');
    // Ensure test mode is off by default
    localStorage.setItem('produodopa_is_test_mode_v2', 'false');
    return false;
  }
  return isTestModeActive();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'main' | 'history' | 'settings'>('main');
  const [isTestMode, setIsTestMode] = useState<boolean>(() => ensureInitialized());
  const [settings, setSettings] = useState<RateSettings>(() => loadCurrentSettings(isTestModeActive()));
  const [pumpState, setPumpState] = useState<PumpState>(() => loadCurrentPumpState(isTestModeActive()));
  const [events, setEvents] = useState<LogEvent[]>(() => loadCurrentEvents(isTestModeActive()));

  // Periodic volume accumulation ticker when pump is running
  useEffect(() => {
    const interval = setInterval(() => {
      setPumpState((prevState) => {
        if (!prevState.isRunning) {
          return {
            ...prevState,
            lastTickTimestamp: new Date().toISOString(),
          };
        }

        const nowMs = Date.now();
        const lastTickMs = new Date(prevState.lastTickTimestamp).getTime();
        const deltaHours = Math.max(0, (nowMs - lastTickMs) / (3600 * 1000));

        // Volume increment = deltaHours * currentRate
        const deltaMl = deltaHours * prevState.currentRate;
        const newConsumed = Math.min(10.0, prevState.syringeInfusedVolume + deltaMl);

        const updated: PumpState = {
          ...prevState,
          syringeInfusedVolume: newConsumed,
          lastTickTimestamp: new Date(nowMs).toISOString(),
        };

        saveCurrentPumpState(updated, isTestMode);
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isTestMode]);

  // Mode toggle handler (Real Data vs Test Data)
  const handleToggleTestMode = (enableTest: boolean) => {
    const switched = switchMode(enableTest, pumpState, events, settings);
    setIsTestMode(enableTest);
    setPumpState(switched.newPumpState);
    setEvents(switched.newEvents);
    setSettings(switched.newSettings);
  };

  // Reset test scenario data handler
  const handleResetTestData = () => {
    const reset = resetTestScenario();
    setPumpState(reset.pumpState);
    setEvents(reset.events);
    setSettings(reset.settings);
  };

  // Reset real data to first-use baseline handler
  const handleResetRealData = () => {
    const reset = resetRealDataToFirstUse();
    setPumpState(reset.pumpState);
    setEvents(reset.events);
    setSettings(reset.settings);
  };

  // Save settings handler
  const handleSaveSettings = (newSettings: RateSettings) => {
    setSettings(newSettings);
    saveCurrentSettings(newSettings, isTestMode);

    // If current level corresponds to low/base/high, update current rate
    if (pumpState.currentLevel === 'low') {
      const updated = {...pumpState, currentRate: newSettings.lowRate};
      setPumpState(updated);
      saveCurrentPumpState(updated, isTestMode);
    } else if (pumpState.currentLevel === 'base') {
      const updated = {...pumpState, currentRate: newSettings.baseRate};
      setPumpState(updated);
      saveCurrentPumpState(updated, isTestMode);
    } else if (pumpState.currentLevel === 'high') {
      const updated = {...pumpState, currentRate: newSettings.highRate};
      setPumpState(updated);
      saveCurrentPumpState(updated, isTestMode);
    }
  };

  // Save pump state handler
  const handleUpdatePumpState = (newState: PumpState) => {
    setPumpState(newState);
    saveCurrentPumpState(newState, isTestMode);
  };

  // Add event handler
  const handleAddEvent = (event: LogEvent) => {
    const updated = [event, ...events];
    setEvents(updated);
    saveCurrentEvents(updated, isTestMode);
  };

  // Undo extra dose handler
  const handleUndoExtraDose = (eventIdToUndo: string) => {
    const undoEvent: LogEvent = {
      id: `evt_undo_${Date.now()}`,
      timestamp: new Date().toISOString(),
      effectiveTime: new Date().toISOString(),
      type: 'extra_dose_undone',
      details: {
        undoneEventId: eventIdToUndo,
        doseAmount: settings.extraDoseAmount,
      },
    };
    const updated = [undoEvent, ...events];
    setEvents(updated);
    saveCurrentEvents(updated, isTestMode);
  };

  // Import CSV data handler (full state reload from backup)
  const handleImportData = (
    newPumpState: PumpState,
    newSettings: RateSettings,
    newEvents: LogEvent[]
  ) => {
    setPumpState(newPumpState);
    setSettings(newSettings);
    setEvents(newEvents);
    saveCurrentPumpState(newPumpState, isTestMode);
    saveCurrentSettings(newSettings, isTestMode);
    saveCurrentEvents(newEvents, isTestMode);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Bar Header with Test Mode awareness */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isRunning={pumpState.isRunning}
        isTestMode={isTestMode}
        onExitTestMode={() => handleToggleTestMode(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-20">
        {activeTab === 'main' && (
          <MainTracker
            settings={settings}
            pumpState={pumpState}
            events={events}
            onUpdatePumpState={handleUpdatePumpState}
            onAddEvent={handleAddEvent}
            onUndoExtraDose={handleUndoExtraDose}
          />
        )}

        {activeTab === 'history' && (
          <HistoricReports
            settings={settings}
            pumpState={pumpState}
            events={events}
            onImportData={handleImportData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            isTestMode={isTestMode}
            onSaveSettings={handleSaveSettings}
            onToggleTestMode={handleToggleTestMode}
            onResetTestData={handleResetTestData}
            onResetRealData={handleResetRealData}
          />
        )}
      </main>

      {/* Footnote / Disclaimer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Pro-Duodopa (Fos-levodopa / Fos-Carbidopa) Continuous Infusion Tracker
          </span>
          <span className="font-mono text-[11px] tabular-nums">
            {isTestMode ? 'Simulated Test Mode Active' : 'Offline Local Storage Active'} · 24h Clinical Clock
          </span>
        </div>
      </footer>
    </div>
  );
}
