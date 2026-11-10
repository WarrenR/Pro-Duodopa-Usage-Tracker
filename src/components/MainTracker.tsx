/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useEffect} from 'react';
import {
  RateSettings,
  PumpState,
  LogEvent,
  RateLevel,
  OnOffStatus,
  format24HourTime,
  formatDDMMYYYY,
} from '../types/produodopa';
import {SyringeGraphic} from './SyringeGraphic';
import {CannulaGraphic} from './CannulaGraphic';
import {
  calculateSyringeStatus,
  getTodayExtraDoses,
} from '../services/storage';
import {
  Play,
  Square,
  PlusCircle,
  Undo2,
  FileText,
  Clock,
  Gauge,
  CheckCircle,
  Sliders,
  AlertCircle,
} from 'lucide-react';

interface MainTrackerProps {
  settings: RateSettings;
  pumpState: PumpState;
  events: LogEvent[];
  onUpdatePumpState: (newState: PumpState) => void;
  onAddEvent: (event: LogEvent) => void;
  onUndoExtraDose: (eventId: string) => void;
}

export const MainTracker: React.FC<MainTrackerProps> = ({
  settings,
  pumpState,
  events,
  onUpdatePumpState,
  onAddEvent,
  onUndoExtraDose,
}) => {
  // Current time ticker (every second) to keep syringe level, cooldowns, and elapsed times dynamic
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Note form state
  const [noteText, setNoteText] = useState('');
  const [onOffStatus, setOnOffStatus] = useState<OnOffStatus>(null); // 'ON', 'OFF', or null
  // Default note time is current 24-hour time HH:mm
  const [noteTimeStr, setNoteTimeStr] = useState<string>(format24HourTime(new Date()));
  const [noteSaveSuccess, setNoteSaveSuccess] = useState(false);

  // Undo confirmation toast
  const [undoToast, setUndoToast] = useState<string | null>(null);

  // Today's extra doses summary
  const todayExtra = getTodayExtraDoses(events);

  // Syringe calculation
  const syringeStatus = calculateSyringeStatus(pumpState);

  // Check wait period for next extra dose
  let waitMinutesRemaining = 0;
  if (todayExtra.lastDoseTime) {
    const elapsedMinutes = (now.getTime() - todayExtra.lastDoseTime.getTime()) / (60 * 1000);
    const requiredWaitMinutes = settings.extraDoseWaitHours * 60;
    if (elapsedMinutes < requiredWaitMinutes) {
      waitMinutesRemaining = Math.ceil(requiredWaitMinutes - elapsedMinutes);
    }
  }

  // Handle rate level change
  const handleSelectRateLevel = (level: RateLevel) => {
    let newRate = pumpState.currentRate;
    if (level === 'low') newRate = settings.lowRate;
    if (level === 'base') newRate = settings.baseRate;
    if (level === 'high') newRate = settings.highRate;

    const updatedState: PumpState = {
      ...pumpState,
      currentLevel: level,
      currentRate: newRate,
      lastTickTimestamp: new Date().toISOString(),
    };
    onUpdatePumpState(updatedState);

    onAddEvent({
      id: `evt_rate_${Date.now()}`,
      timestamp: new Date().toISOString(),
      effectiveTime: new Date().toISOString(),
      type: 'rate_change',
      details: {
        rateLevel: level,
        rateValue: newRate,
        previousRateLevel: pumpState.currentLevel,
        previousRateValue: pumpState.currentRate,
      },
    });
  };

  // Handle pump toggle (Start/Stop)
  const handleTogglePump = () => {
    const nextIsRunning = !pumpState.isRunning;
    const nowIso = new Date().toISOString();

    const updatedState: PumpState = {
      ...pumpState,
      isRunning: nextIsRunning,
      lastStateChange: nowIso,
      lastTickTimestamp: nowIso,
    };
    onUpdatePumpState(updatedState);

    onAddEvent({
      id: `evt_pump_${Date.now()}`,
      timestamp: nowIso,
      effectiveTime: nowIso,
      type: nextIsRunning ? 'pump_start' : 'pump_stop',
      details: {
        rateValue: pumpState.currentRate,
        rateLevel: pumpState.currentLevel,
      },
    });
  };

  // Handle Extra Dose record
  const handleTakeExtraDose = () => {
    const nowIso = new Date().toISOString();
    const doseAmount = settings.extraDoseAmount;

    // Immediately record event
    const eventId = `evt_dose_${Date.now()}`;
    onAddEvent({
      id: eventId,
      timestamp: nowIso,
      effectiveTime: nowIso,
      type: 'extra_dose',
      details: {
        doseAmount,
      },
    });

    // Deduct dose from syringe
    const updatedState: PumpState = {
      ...pumpState,
      syringeInfusedVolume: pumpState.syringeInfusedVolume + doseAmount,
      lastTickTimestamp: nowIso,
    };
    onUpdatePumpState(updatedState);

    setUndoToast(`Extra dose of ${doseAmount} ml recorded. Undo is available.`);
    setTimeout(() => setUndoToast(null), 8000);
  };

  // Handle Undo Extra Dose
  const handleUndo = () => {
    if (!todayExtra.lastActiveEventId) return;
    const eventIdToUndo = todayExtra.lastActiveEventId;

    // Refund syringe volume
    const refundedVolume = Math.max(0, pumpState.syringeInfusedVolume - settings.extraDoseAmount);
    const updatedState: PumpState = {
      ...pumpState,
      syringeInfusedVolume: refundedVolume,
      lastTickTimestamp: new Date().toISOString(),
    };
    onUpdatePumpState(updatedState);

    onUndoExtraDose(eventIdToUndo);
    setUndoToast('Extra dose was successfully undone and volume refunded.');
    setTimeout(() => setUndoToast(null), 4000);
  };

  // Handle Syringe Change
  const handleChangeSyringe = () => {
    const confirmChange = window.confirm(
      'Confirm Syringe Change: This resets syringe volume to a full 10.0 ml and resets the 24-hour elapsed timer. Proceed?'
    );
    if (!confirmChange) return;

    const nowIso = new Date().toISOString();
    const updatedState: PumpState = {
      ...pumpState,
      lastSyringeChange: nowIso,
      syringeInfusedVolume: 0,
      lastTickTimestamp: nowIso,
    };
    onUpdatePumpState(updatedState);

    onAddEvent({
      id: `evt_syr_${Date.now()}`,
      timestamp: nowIso,
      effectiveTime: nowIso,
      type: 'syringe_change',
      details: {
        syringeCapacity: 10,
      },
    });
  };

  // Handle Cannula Change
  const handleChangeCannula = () => {
    const confirmChange = window.confirm(
      'Confirm Cannula Change: This records a new infusion cannula insertion and resets aging back to Day 1 (Green). Proceed?'
    );
    if (!confirmChange) return;

    const nowIso = new Date().toISOString();
    const updatedState: PumpState = {
      ...pumpState,
      lastCannulaChange: nowIso,
      lastTickTimestamp: nowIso,
    };
    onUpdatePumpState(updatedState);

    onAddEvent({
      id: `evt_can_${Date.now()}`,
      timestamp: nowIso,
      effectiveTime: nowIso,
      type: 'cannula_change',
      details: {
        cannulaDay: 1,
      },
    });
  };

  // Handle Note & ON/OFF submission
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() && onOffStatus === null) {
      return;
    }

    // Build effective timestamp from noteTimeStr (HH:mm)
    const effectiveDate = new Date();
    if (noteTimeStr && noteTimeStr.includes(':')) {
      const [h, m] = noteTimeStr.split(':').map((num) => parseInt(num, 10));
      if (!isNaN(h) && !isNaN(m)) {
        effectiveDate.setHours(h, m, 0, 0);
      }
    }

    const nowIso = new Date().toISOString();
    onAddEvent({
      id: `evt_note_${Date.now()}`,
      timestamp: nowIso,
      effectiveTime: effectiveDate.toISOString(),
      type: 'symptom_note',
      details: {
        noteText: noteText.trim().slice(0, 342),
        onOffStatus,
      },
    });

    setNoteText('');
    setOnOffStatus(null);
    setNoteTimeStr(format24HourTime(new Date()));
    setNoteSaveSuccess(true);
    setTimeout(() => setNoteSaveSuccess(false), 3000);
  };

  // Toggle ON/OFF state with ability to deselect
  const toggleOnOff = (status: 'ON' | 'OFF') => {
    if (onOffStatus === status) {
      setOnOffStatus(null); // deselect
    } else {
      setOnOffStatus(status);
    }
  };

  // Filter today's events for the feed
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEvents = events.filter((e) => new Date(e.timestamp) >= startOfToday);

  return (
    <div className="space-y-6">
      {/* Undo Notification Banner */}
      {undoToast && (
        <div className="bg-sky-50 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 p-3.5 rounded-xl flex items-center justify-between text-sm shadow-sm animate-fade-in">
          <span>{undoToast}</span>
          {todayExtra.lastActiveEventId && (
            <button
              onClick={handleUndo}
              className="ml-3 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo Now
            </button>
          )}
        </div>
      )}

      {/* Unified Single Current State Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Pump Operational State & Infusion Rate
            </h1>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {formatDDMMYYYY(now)} · {format24HourTime(now)}
          </span>
        </div>

        {/* Single Element: Current Rate & Running/Stopped Status */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            pumpState.isRunning
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left/Middle: Current Level with Running/Stopped span centred underneath, and Infusion Rate on same line */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
              {/* Current Level with status badge centred underneath */}
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Current Level
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight block">
                  {pumpState.currentLevel} Rate
                </span>
                {/* Centred under Current Level */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-2xs mt-1.5 ${
                    pumpState.isRunning
                      ? 'bg-white dark:bg-slate-900/90 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-900/90 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      pumpState.isRunning ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                    }`}
                  />
                  {pumpState.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>

              {/* Infusion Rate on the same line as Current Level, NO text label "Infusion Rate" */}
              <div className="flex items-baseline">
                <span
                  className={`text-2xl sm:text-3xl font-mono font-black tracking-tight tabular-nums ${
                    pumpState.isRunning
                      ? 'text-sky-700 dark:text-sky-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {pumpState.currentRate.toFixed(2)}
                </span>
                <span className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  ml/h
                </span>
                {!pumpState.isRunning && (
                  <span className="ml-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    (Paused)
                  </span>
                )}
              </div>
            </div>

            {/* Right: Start / Stop Toggle Button */}
            <div className="flex items-center">
              <button
                onClick={handleTogglePump}
                className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer whitespace-nowrap w-full sm:w-auto ${
                  pumpState.isRunning
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {pumpState.isRunning ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Pump (Pause Infusion)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Pump (Resume Infusion)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Change Infusion Rate Level: Low, Base, High */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Change Infusion Rate Level:
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Tap to switch
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Low Rate */}
            <button
              onClick={() => handleSelectRateLevel('low')}
              className={`min-h-[52px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                pumpState.currentLevel === 'low'
                  ? 'bg-sky-600 text-white font-bold border-sky-700 shadow-sm ring-2 ring-sky-300 dark:ring-sky-900'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <span className="text-xs uppercase tracking-wide">Low</span>
              <span className="font-mono text-sm font-bold tabular-nums">
                {settings.lowRate.toFixed(2)} ml/h
              </span>
            </button>

            {/* Base Rate */}
            <button
              onClick={() => handleSelectRateLevel('base')}
              className={`min-h-[52px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                pumpState.currentLevel === 'base'
                  ? 'bg-sky-600 text-white font-bold border-sky-700 shadow-sm ring-2 ring-sky-300 dark:ring-sky-900'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <span className="text-xs uppercase tracking-wide">Base</span>
              <span className="font-mono text-sm font-bold tabular-nums">
                {settings.baseRate.toFixed(2)} ml/h
              </span>
            </button>

            {/* High Rate */}
            <button
              onClick={() => handleSelectRateLevel('high')}
              className={`min-h-[52px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                pumpState.currentLevel === 'high'
                  ? 'bg-sky-600 text-white font-bold border-sky-700 shadow-sm ring-2 ring-sky-300 dark:ring-sky-900'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <span className="text-xs uppercase tracking-wide">High</span>
              <span className="font-mono text-sm font-bold tabular-nums">
                {settings.highRate.toFixed(2)} ml/h
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Extra Dose Panel (High-Priority Parkinson's Rescue Feature) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Extra Dose (Rescue Bolus)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Configured Dose: <strong className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">{settings.extraDoseAmount.toFixed(2)} ml</strong>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Wait: <strong className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">{settings.extraDoseWaitHours}h</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Today's Count Readout */}
          <div className="md:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Extra Doses Taken Today
              </span>
              <span className="text-3xl font-mono font-black text-slate-900 dark:text-white tabular-nums">
                {todayExtra.count}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Total extra volume: {todayExtra.totalVolume.toFixed(2)} ml
              </span>
            </div>
            {todayExtra.lastDoseTime && (
              <div className="text-right">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Last Bolus at
                </span>
                <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {format24HourTime(todayExtra.lastDoseTime)}
                </span>
              </div>
            )}
          </div>

          {/* Action Button & Wait Cooldown */}
          <div className="md:col-span-7 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleTakeExtraDose}
              disabled={!pumpState.isRunning}
              className={`min-h-[52px] flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                pumpState.isRunning
                  ? 'bg-sky-600 hover:bg-sky-700 active:scale-[0.99]'
                  : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              <span>Record Extra Dose ({settings.extraDoseAmount.toFixed(2)} ml)</span>
            </button>

            {/* Undo Function (accidental input protection) */}
            {todayExtra.lastActiveEventId && (
              <button
                onClick={handleUndo}
                className="min-h-[52px] px-4 py-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="Undo last extra dose in case of accidental touch"
              >
                <Undo2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Undo Last Dose</span>
              </button>
            )}
          </div>
        </div>

        {/* Wait Cooldown Indicator */}
        {waitMinutesRemaining > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/80">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              Next extra dose should be possible in{' '}
              <strong className="font-mono tabular-nums">
                {Math.floor(waitMinutesRemaining / 60)}h {waitMinutesRemaining % 60}m
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Syringe & Cannula Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SyringeGraphic
          remainingMl={syringeStatus.remainingMl}
          capacityMl={syringeStatus.capacity}
          consumedMl={syringeStatus.consumedMl}
          percentageRemaining={syringeStatus.percentageRemaining}
          hoursUntilEmpty={syringeStatus.hoursUntilEmpty}
          hoursElapsedSinceChange={syringeStatus.hoursElapsedSinceChange}
          lastSyringeChange={pumpState.lastSyringeChange}
          onChangeSyringe={handleChangeSyringe}
          isRunning={pumpState.isRunning}
        />

        <CannulaGraphic
          lastCannulaChange={pumpState.lastCannulaChange}
          onChangeCannula={handleChangeCannula}
        />
      </div>

      {/* Notes & ON/OFF Period Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Add Note & Symptom ON / OFF State
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Character limit: 342
          </span>
        </div>

        <form onSubmit={handleSaveNote} className="space-y-4">
          {/* Note Textarea with live character counter */}
          <div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 342))}
              placeholder="Record feelings, tremor, walking, rigidity, or meal timing..."
              rows={3}
              className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:border-sky-500 resize-none transition-colors"
            />
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-400">
                Optional descriptive note for your clinical record
              </span>
              <span
                className={`font-mono tabular-nums ${
                  noteText.length >= 320
                    ? 'text-rose-600 font-bold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {noteText.length} / 342 characters
              </span>
            </div>
          </div>

          {/* ON/OFF Period Selection & Time Adjustment */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* ON / OFF Selectors (allow one or none, and deselect) */}
            <div className="md:col-span-6 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Symptom Period (Select one or none, tap again to deselect):
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleOnOff('ON')}
                  className={`min-h-[44px] flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    onOffStatus === 'ON'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {onOffStatus === 'ON' ? '✓ ON Period' : 'ON (Good Mobility)'}
                </button>

                <button
                  type="button"
                  onClick={() => toggleOnOff('OFF')}
                  className={`min-h-[44px] flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    onOffStatus === 'OFF'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {onOffStatus === 'OFF' ? '✓ OFF Period' : 'OFF (Stiff / Slow)'}
                </button>

                {onOffStatus !== null && (
                  <button
                    type="button"
                    onClick={() => setOnOffStatus(null)}
                    className="min-h-[44px] px-2.5 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent hover:border-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Time of Record (defaults to current time, adjustable to earlier) */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Time (24h format):
              </label>
              <input
                type="time"
                value={noteTimeStr}
                onChange={(e) => setNoteTimeStr(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:border-sky-500"
              />
            </div>

            {/* Submit Button */}
            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={!noteText.trim() && onOffStatus === null}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
              >
                Save Entry
              </button>
            </div>
          </div>

          {noteSaveSuccess && (
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle className="w-4 h-4" />
              Note and symptom record saved to today's log.
            </div>
          )}
        </form>
      </div>

      {/* Today's Activity Log Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Today's Live Log Feed (Since Midnight 00:00)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {todayEvents.length} events today
          </span>
        </div>

        {todayEvents.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic py-3 text-center">
            No events recorded yet today. Infusion is ongoing at {pumpState.currentRate.toFixed(2)} ml/h.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
            {todayEvents.map((ev) => {
              const timeStr = format24HourTime(ev.effectiveTime || ev.timestamp);
              return (
                <div key={ev.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
                      {timeStr}
                    </span>
                    <div>
                      {ev.type === 'rate_change' && (
                        <span className="text-slate-800 dark:text-slate-200">
                          Rate changed to <strong className="uppercase">{ev.details.rateLevel}</strong> ({ev.details.rateValue?.toFixed(2)} ml/h)
                        </span>
                      )}
                      {ev.type === 'extra_dose' && (
                        <span className="text-sky-700 dark:text-sky-300 font-semibold">
                          Extra dose of {ev.details.doseAmount?.toFixed(2)} ml taken
                        </span>
                      )}
                      {ev.type === 'extra_dose_undone' && (
                        <span className="text-rose-600 dark:text-rose-400 italic">
                          Extra dose undone
                        </span>
                      )}
                      {ev.type === 'pump_start' && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Pump started ({ev.details.rateValue?.toFixed(2)} ml/h)
                        </span>
                      )}
                      {ev.type === 'pump_stop' && (
                        <span className="text-rose-700 dark:text-rose-400 font-semibold">
                          Pump stopped
                        </span>
                      )}
                      {ev.type === 'syringe_change' && (
                        <span className="text-sky-600 dark:text-sky-400 font-semibold">
                          Syringe replaced (10 ml fresh)
                        </span>
                      )}
                      {ev.type === 'cannula_change' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Cannula replaced (Day 1 reset)
                        </span>
                      )}
                      {ev.type === 'symptom_note' && (
                        <div className="space-y-0.5">
                          {ev.details.onOffStatus && (
                            <span
                              className={`inline-block mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                ev.details.onOffStatus === 'ON'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {ev.details.onOffStatus}
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
    </div>
  );
};
