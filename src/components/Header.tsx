/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {PWAInstallButton} from './PWAInstallButton';
import {Power} from 'lucide-react';

interface HeaderProps {
  activeTab: 'main' | 'history' | 'settings';
  onSelectTab: (tab: 'main' | 'history' | 'settings') => void;
  isRunning: boolean;
}

export const Header: React.FC<HeaderProps> = ({activeTab, onSelectTab, isRunning}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
            <span className="font-bold text-base tracking-tighter">PD</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              Pro-Duodopa Tracker
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Fos-levodopa / Fos-Carbidopa Infusion
            </span>
          </div>
        </div>

        {/* Zone 2: Nav Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('main')}
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'main'
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Today's Infusion
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Historic Reports (90 Days)
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Settings
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
  );
};
