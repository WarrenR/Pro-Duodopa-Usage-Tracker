/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {Activity, RefreshCw, Calendar, CheckCircle2, AlertTriangle, AlertOctagon} from 'lucide-react';
import {format24HourTime, formatDDMMYYYY} from '../types/produodopa';
import {calculateCannulaStatus} from '../services/storage';

interface CannulaGraphicProps {
  lastCannulaChange: string;
  onChangeCannula: () => void;
}

export const CannulaGraphic: React.FC<CannulaGraphicProps> = ({
  lastCannulaChange,
  onChangeCannula,
}) => {
  const status = calculateCannulaStatus(lastCannulaChange);
  const elapsedDays = Math.floor(status.elapsedHours / 24);
  const elapsedHoursRemainder = Math.floor(status.elapsedHours % 24);

  // Status badges & color scheme
  // visual GREEN day one, ORANGE day 2, RED day 3
  const badgeConfig = {
    green: {
      border: 'border-emerald-300 dark:border-emerald-800',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-800 dark:text-emerald-200',
      badgeBg: 'bg-emerald-600 text-white',
      icon: CheckCircle2,
      label: 'Day 1: Optimal',
      tip: 'Cannula is fresh. Subcutaneous absorption is optimal.',
    },
    orange: {
      border: 'border-amber-300 dark:border-amber-800',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-900 dark:text-amber-200',
      badgeBg: 'bg-amber-500 text-white',
      icon: AlertTriangle,
      label: 'Day 2: Active',
      tip: 'Cannula is in active use. Prepare site for upcoming rotation.',
    },
    red: {
      border: 'border-rose-400 dark:border-rose-800',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      text: 'text-rose-900 dark:text-rose-200',
      badgeBg: 'bg-rose-600 text-white',
      icon: AlertOctagon,
      label: 'Day 3: Replacement Due',
      tip: 'Cannula has reached day 3. Replace cannula and rotate infusion site to avoid tissue irritation.',
    },
  }[status.colorLevel];

  const IconComp = badgeConfig.icon;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm space-y-4 transition-colors ${badgeConfig.bg} ${badgeConfig.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Infusion Cannula Age
          </h2>
        </div>
        <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400 tabular-nums">
          Inserted: {formatDDMMYYYY(lastCannulaChange)} at {format24HourTime(lastCannulaChange)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Left: Vector Subcutaneous Cannula Diagram */}
        <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="relative w-28 h-28 flex items-center justify-center select-none">
            <svg
              viewBox="0 0 100 100"
              className="w-24 h-24 drop-shadow-xs"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Adhesive base patch */}
              <circle
                cx="50"
                cy="32"
                r="26"
                className="fill-slate-200 dark:fill-slate-700/70 stroke-slate-300 dark:stroke-slate-600"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx="50"
                cy="32"
                r="18"
                className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600"
                strokeWidth="1.5"
              />

              {/* Cannula Hub / Center Septum (color-coded by age) */}
              <circle
                cx="50"
                cy="32"
                r="10"
                className={
                  status.colorLevel === 'green'
                    ? 'fill-emerald-500/20 stroke-emerald-600'
                    : status.colorLevel === 'orange'
                    ? 'fill-amber-500/20 stroke-amber-600'
                    : 'fill-rose-500/20 stroke-rose-600'
                }
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="32"
                r="4"
                className={
                  status.colorLevel === 'green'
                    ? 'fill-emerald-600'
                    : status.colorLevel === 'orange'
                    ? 'fill-amber-600'
                    : 'fill-rose-600'
                }
              />

              {/* Flexible infusion line tubing curving downwards */}
              <path
                d="M50 38 C50 65, 30 65, 30 82"
                className="stroke-slate-400 dark:stroke-slate-400"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Luer connector at tube end */}
              <rect
                x="26"
                y="82"
                width="8"
                height="10"
                rx="1"
                className="fill-slate-300 dark:fill-slate-600 stroke-slate-400 dark:stroke-slate-500"
                strokeWidth="1"
              />
              <line
                x1="24"
                y1="85"
                x2="36"
                y2="85"
                className="stroke-slate-500"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <span className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Subcutaneous Set
          </span>
        </div>

        {/* Right: Aging Status Progression & Button */}
        <div className="sm:col-span-8 space-y-3">
          {/* Day 1 - 2 - 3 visual indicator steps */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
              Cannula Aging by Day:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* Day 1 (GREEN) */}
              <div
                className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                  status.dayNumber === 1
                    ? 'bg-emerald-600 text-white font-bold shadow-xs border-emerald-700'
                    : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 opacity-70'
                }`}
              >
                <span className="text-xs font-bold block">Day 1</span>
                <span className="text-[10px] uppercase tracking-wide">Green</span>
              </div>

              {/* Day 2 (ORANGE) */}
              <div
                className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                  status.dayNumber === 2
                    ? 'bg-amber-500 text-white font-bold shadow-xs border-amber-600'
                    : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 opacity-70'
                }`}
              >
                <span className="text-xs font-bold block">Day 2</span>
                <span className="text-[10px] uppercase tracking-wide">Orange</span>
              </div>

              {/* Day 3 (RED) */}
              <div
                className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                  status.dayNumber >= 3
                    ? 'bg-rose-600 text-white font-bold shadow-xs border-rose-700'
                    : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 opacity-70'
                }`}
              >
                <span className="text-xs font-bold block">Day 3</span>
                <span className="text-[10px] uppercase tracking-wide">Red</span>
              </div>
            </div>
          </div>

          {/* Detailed Age Text & Description */}
          <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <IconComp className="w-4 h-4 shrink-0" />
                <span className={badgeConfig.text}>{badgeConfig.label}</span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                {elapsedDays}d {elapsedHoursRemainder}h in use
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {badgeConfig.tip}
            </p>
          </div>

          {/* Change Cannula Button */}
          <button
            onClick={onChangeCannula}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl font-medium text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.99] border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Change Cannula (New Site Inserted)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
