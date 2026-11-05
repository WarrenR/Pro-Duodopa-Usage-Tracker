/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useEffect, useCallback} from 'react';
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
  loadSettings,
  saveSettings,
  loadPumpState,
  savePumpState,
  loadAllEvents,
  saveAllEvents,
  addEvent,
  seedSampleDataIfEmpty,
  pruneOldRecords,
} from './services/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'main' | 'history' | 'settings'>('main');
  const [settings, setSettings] = useState<RateSettings>(() => loadSettings());
  const [pumpState, setPumpState] = useState<PumpState>(() => loadPumpState());
  const [events, setEvents] = useState<LogEvent[]>(() => {
    seedSampleDataIfEmpty();
    return loadAllEvents();
  });

  // On mount, ensure old records > 90 days are pruned
  useEffect(() => {
    pruneOldRecords();
  }, []);

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

        savePumpState(updated);
        return updated;
      });
    }, 5000); // sync every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Save settings handler
  const handleSaveSettings = (newSettings: RateSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);

    // If current level corresponds to low/base/high, update current rate
    if (pumpState.currentLevel === 'low') {
      const updated = {...pumpState, currentRate: newSettings.lowRate};
      setPumpState(updated);
      savePumpState(updated);
    } else if (pumpState.currentLevel === 'base') {
      const updated = {...pumpState, currentRate: newSettings.baseRate};
      setPumpState(updated);
      savePumpState(updated);
    } else if (pumpState.currentLevel === 'high') {
      const updated = {...pumpState, currentRate: newSettings.highRate};
      setPumpState(updated);
      savePumpState(updated);
    }
  };

  // Save pump state handler
  const handleUpdatePumpState = (newState: PumpState) => {
    setPumpState(newState);
    savePumpState(newState);
  };

  // Add event handler
  const handleAddEvent = (event: LogEvent) => {
    const updated = addEvent(event);
    setEvents(updated);
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
    const updated = addEvent(undoEvent);
    setEvents(updated);
  };

  // Reset sample data handler
  const handleResetData = () => {
    localStorage.clear();
    seedSampleDataIfEmpty();
    setSettings(loadSettings());
    setPumpState(loadPumpState());
    setEvents(loadAllEvents());
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isRunning={pumpState.isRunning}
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
          <HistoricReports settings={settings} events={events} />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onResetData={handleResetData}
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
            Offline Storage Active · 24h Clinical Clock
          </span>
        </div>
      </footer>
    </div>
  );
}
