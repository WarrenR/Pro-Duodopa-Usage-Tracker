/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {AlertCircle, RefreshCw, Clock, Droplets} from 'lucide-react';
import {format24HourTime, formatDDMMYYYY} from '../types/produodopa';

interface SyringeGraphicProps {
  remainingMl: number;
  capacityMl: number;
  consumedMl: number;
  percentageRemaining: number;
  hoursUntilEmpty: number | null;
  hoursElapsedSinceChange: number;
  lastSyringeChange: string;
  onChangeSyringe: () => void;
  isRunning: boolean;
}

export const SyringeGraphic: React.FC<SyringeGraphicProps> = ({
  remainingMl,
  capacityMl,
  consumedMl,
  percentageRemaining,
  hoursUntilEmpty,
  hoursElapsedSinceChange,
  lastSyringeChange,
  onChangeSyringe,
  isRunning,
}) => {
  const isOver24Hours = hoursElapsedSinceChange >= 24;
  const elapsedHoursInt = Math.floor(hoursElapsedSinceChange);
  const elapsedMinsInt = Math.floor((hoursElapsedSinceChange % 1) * 60);

  // Remaining time formatted
  let timeUntilEmptyStr = '--';
  if (hoursUntilEmpty !== null && isRunning) {
    const h = Math.floor(hoursUntilEmpty);
    const m = Math.round((hoursUntilEmpty % 1) * 60);
    timeUntilEmptyStr = `${h}h ${m}m`;
  } else if (!isRunning) {
    timeUntilEmptyStr = 'Pump stopped';
  } else {
    timeUntilEmptyStr = 'Empty';
  }

  // Liquid color based on level
  let liquidColor = 'from-sky-500 to-cyan-600';
  if (remainingMl <= 1.5) {
    liquidColor = 'from-rose-500 to-red-600';
  } else if (remainingMl <= 3.0) {
    liquidColor = 'from-amber-500 to-orange-600';
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Current Syringe (10 ml)
          </h2>
        </div>
        <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 tabular-nums">
          Changed: {formatDDMMYYYY(lastSyringeChange)} at {format24HourTime(lastSyringeChange)}
        </span>
      </div>

      {/* 24-Hour Overdue Warning Banner */}
      {isOver24Hours && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Syringe Overdue for Replacement!</span>
            <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300">
              Syringe has been in place for{' '}
              <strong className="underline tabular-nums">{elapsedHoursInt}h {elapsedMinsInt}m</strong> (exceeds recommended 24-hour single-use limit). Please change to a fresh 10 ml syringe.
            </p>
          </div>
        </div>
      )}

      {/* Syringe Visualizer & Readout */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Left: Precision Vector Syringe Diagram */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            {/* Vector Syringe Graphic */}
            <div className="relative flex flex-col items-center select-none">
              {/* Plunger Top Flange */}
              <div className="w-10 h-2 bg-slate-400 dark:bg-slate-500 rounded-sm shadow-xs" />
              {/* Plunger Rod */}
              <div className="w-2.5 h-6 bg-slate-300 dark:bg-slate-600 border-x border-slate-400 dark:border-slate-500" />

              {/* Syringe Barrel Top Flanges */}
              <div className="w-14 h-2.5 bg-slate-300 dark:bg-slate-600 rounded-sm border border-slate-400 dark:border-slate-500 flex justify-between px-1" />

              {/* Syringe Barrel Body */}
              <div className="relative w-11 h-44 bg-slate-100/90 dark:bg-slate-800/90 rounded-b-md border-x-2 border-b-2 border-slate-300 dark:border-slate-600 flex flex-col justify-end overflow-hidden shadow-inner">
                {/* Fluid Fill Level */}
                <div
                  className={`w-full bg-gradient-to-t ${liquidColor} transition-all duration-500 relative`}
                  style={{height: `${Math.min(100, Math.max(3, percentageRemaining))}%`}}
                >
                  {/* Meniscus / Rubber Stopper Line */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-700 dark:bg-slate-900 opacity-80" />
                  <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-white/40" />
                </div>

                {/* Graduation Scale Hash Marks (0 to 10 ml) */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-2 px-1 text-[8px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="w-2.5 border-b-2 border-slate-400 dark:border-slate-500" />
                    <span>10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="w-1.5 border-b border-slate-400 dark:border-slate-500" />
                    <span>8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="w-2 border-b-2 border-slate-400 dark:border-slate-500" />
                    <span>6</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="w-1.5 border-b border-slate-400 dark:border-slate-500" />
                    <span>4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="w-2 border-b-2 border-slate-400 dark:border-slate-500" />
                    <span>2</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="w-2.5 border-b-2 border-slate-400 dark:border-slate-500" />
                    <span>0</span>
                  </div>
                </div>
              </div>

              {/* Syringe Luer Nozzle Tip */}
              <div className="w-3.5 h-3 bg-slate-300 dark:bg-slate-600 rounded-b-xs border-x border-b border-slate-400 dark:border-slate-500" />
            </div>

            {/* Quick Level Summary next to graphic */}
            <div className="flex flex-col text-left space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Fluid Volume
              </span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {remainingMl.toFixed(1)} ml
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {percentageRemaining}% full
              </span>
            </div>
          </div>
          <span className="mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
            10 ml Standard CSCI Syringe
          </span>
        </div>

        {/* Right: Metrics & Details */}
        <div className="sm:col-span-7 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                Remaining Level
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {remainingMl.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  / 10 ml
                </span>
              </div>
              <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${liquidColor} transition-all duration-300`}
                  style={{width: `${Math.min(100, Math.max(0, percentageRemaining))}%`}}
                />
              </div>
              <span className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 block tabular-nums">
                {percentageRemaining}% capacity available
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                Time Until Empty
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {timeUntilEmptyStr}
                </span>
              </div>
              <span className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 block tabular-nums">
                Consumed: {consumedMl.toFixed(2)} ml
              </span>
            </div>
          </div>

          {/* Syringe Age Timer with 24-Hour Visual Cue */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isOver24Hours
                ? 'bg-rose-100/70 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 font-medium'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock
                className={`w-4 h-4 ${
                  isOver24Hours ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-500 dark:text-slate-400'
                }`}
              />
              <span className="text-xs font-semibold">
                Time Since Syringe Change:
              </span>
            </div>
            <span
              className={`font-mono font-bold text-sm tabular-nums ${
                isOver24Hours ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'
              }`}
            >
              {elapsedHoursInt}h {elapsedMinsInt}m
            </span>
          </div>

          {/* Change Syringe Action Button */}
          <button
            onClick={onChangeSyringe}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl font-medium text-sm text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Change Syringe (New 10 ml)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
