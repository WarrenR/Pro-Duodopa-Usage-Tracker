/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {PWAInstallButton} from './PWAInstallButton';
import {FlaskConical, BarChart3, Settings as SettingsIcon} from 'lucide-react';

interface HeaderProps {
  activeTab: 'main' | 'history' | 'settings';
  onSelectTab: (tab: 'main' | 'history' | 'settings') => void;
  isRunning: boolean;
  isTestMode: boolean;
  onExitTestMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  isRunning,
  isTestMode,
  onExitTestMode,
}) => {
  const dayOfMonth = new Date().getDate();

  return (
    <>
      {/* Test Mode Banner when active */}
      {isTestMode && (
        <div className="bg-amber-500 text-amber-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-between border-b border-amber-600/30">
          <div className="flex items-center gap-2 max-w-6xl mx-auto w-full justify-between">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>TEST MODE ACTIVE</strong>: Viewing simulated clinical data. Real patient records are safely preserved.
              </span>
            </div>
            {onExitTestMode && (
              <button
                onClick={onExitTestMode}
                className="ml-3 px-2.5 py-0.5 rounded bg-amber-950 text-white hover:bg-amber-900 text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>Exit Test Mode</span>
              </button>
            )}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Brand wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                isTestMode ? 'bg-amber-500 text-amber-950 font-black' : 'bg-sky-600'
              }`}
            >
              <span className="font-bold text-base tracking-tighter">
                {isTestMode ? 'TEST' : 'PD'}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  Pro-Duodopa Tracker
                </span>
                {isTestMode && (
                  <span className="text-[10px] uppercase font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-800">
                    Test Mode
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Fos-levodopa / Fos-Carbidopa Infusion
              </span>
            </div>
          </div>

          {/* Zone 2: Compact Icon Nav Tabs */}
          <nav className="flex items-center gap-1.5 sm:gap-2.5" aria-label="Main Navigation">
            {/* 1. Calendar with current day-of-month number */}
            <button
              onClick={() => onSelectTab('main')}
              aria-label={`Today's Infusion (Day ${dayOfMonth})`}
              title={`Today's Infusion (Day ${dayOfMonth})`}
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'main'
                  ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 shadow-xs ring-2 ring-sky-400/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg
                  className="w-6 h-6 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="absolute top-[9.5px] left-0 right-0 text-center text-[10px] font-black font-mono leading-none tracking-tight">
                  {dayOfMonth}
                </span>
              </div>
            </button>

            {/* 2. Charting / Reporting icon */}
            <button
              onClick={() => onSelectTab('history')}
              aria-label="Historic Reports (90 Days)"
              title="Historic Reports (90 Days)"
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 shadow-xs ring-2 ring-sky-400/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
            </button>

            {/* 3. Settings cog wheel icon */}
            <button
              onClick={() => onSelectTab('settings')}
              aria-label="Settings"
              title="Settings"
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 shadow-xs ring-2 ring-sky-400/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              <SettingsIcon className="w-5 h-5 shrink-0" />
            </button>
          </nav>

          {/* Zone 3: Primary Action & Install Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick status pill */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isRunning
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              />
              <span>{isRunning ? 'Running' : 'Stopped'}</span>
            </div>

            <PWAInstallButton />
          </div>
        </div>
      </header>
    </>
  );
};
