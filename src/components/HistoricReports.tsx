/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  RateSettings,
  LogEvent,
  DayUsageRecord,
  WeekUsageRecord,
  format24HourTime,
  formatDDMMYYYY,
} from '../types/produodopa';
import {
  getHistoricDayRecords,
  getHistoricWeekRecords,
  exportToCSV,
} from '../services/storage';
import {
  Calendar,
  BarChart3,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  Droplets,
  Layers,
  Check,
} from 'lucide-react';

interface HistoricReportsProps {
  settings: RateSettings;
  events: LogEvent[];
}

export const HistoricReports: React.FC<HistoricReportsProps> = ({
  settings,
  events,
}) => {
  // View mode: day-by-day or week-by-week
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Compute historic records (EXCLUDES CURRENT DAY, max 90 days)
  const dayRecords = getHistoricDayRecords(events, settings);
  const weekRecords = getHistoricWeekRecords(dayRecords);

  // Selected day for log view (defaults to most recent completed day, dayRecords[0])
  const [selectedDayKey, setSelectedDayKey] = useState<string>(
    dayRecords.length > 0 ? dayRecords[0].dateKey : ''
  );

  // Selected week index
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);

  // Sharing status
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Canvas ref for chart sharing
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Selected day record
  const selectedDayRecord =
    dayRecords.find((d) => d.dateKey === selectedDayKey) || dayRecords[0] || null;

  // Selected week record
  const selectedWeekRecord = weekRecords[selectedWeekIndex] || weekRecords[0] || null;

  // Window of days to display in the day chart (last 14 completed days)
  const chartDays = dayRecords.slice(0, 14).reverse();
  const chartWeeks = weekRecords.slice(0, 8).reverse();

  // Render chart on canvas for high-DPI image sharing & export
  const renderChartToCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 650;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Header branding
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, width, 12);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('Pro-Duodopa Infusion Therapy Log', 50, 60);

    ctx.fillStyle = '#64748b';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const sub =
      viewMode === 'day'
        ? `Day-by-Day Historical Usage (Past 14 Days) · Clinical 90-Day Record`
        : `Week-by-Week Historical Usage (Weeks Starting Sunday) · Clinical 90-Day Record`;
    ctx.fillText(sub, 50, 90);

    // Summary Metric strip in image
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillRect(50, 115, width - 100, 80);
    ctx.strokeRect(50, 115, width - 100, 80);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('AVERAGE RATE PER HOUR', 75, 145);
    ctx.fillText('TOTAL VOLUME INFUSED', 380, 145);
    ctx.fillText('EXTRA DOSES ADMINISTERED', 700, 145);
    ctx.fillText('RECORD RETENTION', 980, 145);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "SF Mono", Menlo, monospace';

    if (viewMode === 'day' && selectedDayRecord) {
      ctx.fillText(`${selectedDayRecord.averageRatePerHour.toFixed(3)} ml/h`, 75, 175);
      ctx.fillText(`${selectedDayRecord.totalInfusedMl.toFixed(2)} ml`, 380, 175);
      ctx.fillText(`${selectedDayRecord.extraDoseCount} doses`, 700, 175);
      ctx.fillText(`90 Days Max`, 980, 175);
    } else if (selectedWeekRecord) {
      ctx.fillText(`${selectedWeekRecord.averageRatePerHour.toFixed(3)} ml/h`, 75, 175);
      ctx.fillText(`${selectedWeekRecord.totalInfusedMl.toFixed(2)} ml`, 380, 175);
      ctx.fillText(`${selectedWeekRecord.totalExtraDoses} doses`, 700, 175);
      ctx.fillText(`90 Days Max`, 980, 175);
    }

    // Chart plotting area
    const plotX = 80;
    const plotY = 240;
    const plotW = width - 160;
    const plotH = 310;

    // Draw grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = plotY + (plotH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW, y);
      ctx.stroke();
    }

    // Determine max value
    const maxVal =
      viewMode === 'day'
        ? Math.max(...chartDays.map((d) => d.totalInfusedMl), 10) * 1.15
        : Math.max(...chartWeeks.map((w) => w.totalInfusedMl), 70) * 1.15;

    // Y-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = plotY + (plotH / 5) * (5 - i);
      const val = (maxVal / 5) * i;
      ctx.fillText(`${val.toFixed(1)} ml`, plotX - 10, y + 4);
    }

    // Plot bars
    ctx.textAlign = 'center';
    if (viewMode === 'day') {
      const barSlot = plotW / chartDays.length;
      const barW = Math.max(20, barSlot * 0.55);

      chartDays.forEach((d, idx) => {
        const x = plotX + idx * barSlot + barSlot / 2;
        const baselineH = (d.baselineInfusedMl / maxVal) * plotH;
        const extraH = (d.extraDosesMl / maxVal) * plotH;

        // Baseline bar (Blue)
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(x - barW / 2, plotY + plotH - baselineH, barW, baselineH);

        // Extra dose bar (Amber)
        if (extraH > 0) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(x - barW / 2, plotY + plotH - baselineH - extraH, barW, extraH);
        }

        // Total label on top
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "SF Mono", Menlo, monospace';
        ctx.fillText(`${d.totalInfusedMl.toFixed(1)}`, x, plotY + plotH - baselineH - extraH - 8);

        // Date label below
        ctx.fillStyle = '#475569';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const dateShort = d.dateStr.slice(0, 5); // DD/MM
        ctx.fillText(dateShort, x, plotY + plotH + 20);
      });
    } else {
      const barSlot = plotW / chartWeeks.length;
      const barW = Math.max(30, barSlot * 0.6);

      chartWeeks.forEach((w, idx) => {
        const x = plotX + idx * barSlot + barSlot / 2;
        const totalH = (w.totalInfusedMl / maxVal) * plotH;

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(x - barW / 2, plotY + plotH - totalH, barW, totalH);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "SF Mono", Menlo, monospace';
        ctx.fillText(`${w.totalInfusedMl.toFixed(1)} ml`, x, plotY + plotH - totalH - 8);

        ctx.fillStyle = '#475569';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(`Sun ${w.startDateStr.slice(0, 5)}`, x, plotY + plotH + 20);
      });
    }

    // Legend & Footer
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(plotX, height - 40, 16, 12);
    ctx.fillStyle = '#334155';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('Continuous Infusion (Baseline)', plotX + 24, height - 30);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(plotX + 240, height - 40, 16, 12);
    ctx.fillStyle = '#334155';
    ctx.fillText('Extra Dose Bolus', plotX + 264, height - 30);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('Generated by Pro-Duodopa Tracker · Parkinson\'s CSCI Therapy', width - 50, height - 30);
  };

  // Trigger share as image
  const handleShareChartImage = async () => {
    const canvas = document.createElement('canvas');
    renderChartToCanvas(canvas);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `ProDuodopa_Chart_${formatDDMMYYYY(new Date()).replace(/\//g, '_')}.png`, {
        type: 'image/png',
      });

      // Try native Web Share API
      if (navigator.canShare && navigator.canShare({files: [file]})) {
        try {
          await navigator.share({
            title: 'Pro-Duodopa Therapy Chart',
            text: 'Historical infusion report for Parkinson\'s therapy.',
            files: [file],
          });
          setShareFeedback('Shared successfully via device!');
          setTimeout(() => setShareFeedback(null), 3000);
          return;
        } catch {
          // Fall back to download
        }
      }

      // Fallback: download PNG image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ProDuodopa_Chart_${formatDDMMYYYY(new Date()).replace(/\//g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShareFeedback('Chart image saved to downloads!');
      setTimeout(() => setShareFeedback(null), 3000);
    }, 'image/png');
  };

  // Calculate maximum for CSS responsive chart bars
  const dayMaxVal = Math.max(...chartDays.map((d) => d.totalInfusedMl), 10) * 1.1;
  const weekMaxVal = Math.max(...chartWeeks.map((w) => w.totalInfusedMl), 70) * 1.1;

  return (
    <div className="space-y-6">
      {/* Top Controls: Mode Switcher, Export CSV, Share Image */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Historic Usage & Clinical Reporting
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Excludes today · 90-day rolling clinical retention window
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Share as Image Button */}
            <button
              onClick={handleShareChartImage}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              title="Export high-resolution chart image for clinical consultation or sharing"
            >
              <Share2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Share Chart Image</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={() => exportToCSV(events, dayRecords)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="Download all logs and event timestamps in CSV format"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {shareFeedback && (
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4" />
            {shareFeedback}
          </div>
        )}

        {/* View Mode Tabs (Day-by-Day vs Week-by-Week) */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reporting Mode:
            </span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('day')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Day-by-Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Week-by-Week (Sunday Start)
              </button>
            </div>
          </div>

          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
            {dayRecords.length} completed days on record
          </span>
        </div>
      </div>

      {/* Average Rate Per Hour & Key Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average Rate Per Hour */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            Average Rate Per Hour
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-sky-600 dark:text-sky-400 tabular-nums">
              {viewMode === 'day'
                ? (selectedDayRecord?.averageRatePerHour.toFixed(3) || '0.000')
                : (selectedWeekRecord?.averageRatePerHour.toFixed(3) || '0.000')}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              ml/h
            </span>
          </div>
          <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 block truncate">
            {viewMode === 'day'
              ? `For ${selectedDayRecord?.dateStr || 'selected day'}`
              : `${selectedWeekRecord?.weekLabel || 'selected week'}`}
          </span>
        </div>

        {/* Metric 2: Total Volume Infused */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            Total Infused Volume
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {viewMode === 'day'
                ? (selectedDayRecord?.totalInfusedMl.toFixed(2) || '0.00')
                : (selectedWeekRecord?.totalInfusedMl.toFixed(2) || '0.00')}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              ml
            </span>
          </div>
          <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 block">
            {viewMode === 'day'
              ? `Baseline: ${selectedDayRecord?.baselineInfusedMl.toFixed(2)} ml`
              : `Daily average: ${selectedWeekRecord?.dailyAverageMl.toFixed(2)} ml/day`}
          </span>
        </div>

        {/* Metric 3: Extra Doses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            Extra Doses Administered
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {viewMode === 'day'
                ? (selectedDayRecord?.extraDoseCount || 0)
                : (selectedWeekRecord?.totalExtraDoses || 0)}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              doses
            </span>
          </div>
          <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 block">
            {viewMode === 'day'
              ? `Extra volume: ${selectedDayRecord?.extraDosesMl.toFixed(2)} ml`
              : `Across ${selectedWeekRecord?.days.length || 0} completed days`}
          </span>
        </div>

        {/* Metric 4: Record Range */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            Retention Boundary
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              90 Days
            </span>
          </div>
          <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 block">
            Auto-pruning active
          </span>
        </div>
      </div>

      {/* Main Interactive Chart Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {viewMode === 'day'
                ? 'Day-by-Day Usage Chart (Past 14 Completed Days)'
                : 'Week-by-Week Usage Chart (Week Starting Sunday)'}
            </h2>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-sky-600" />
              <span className="text-slate-600 dark:text-slate-400">Continuous Baseline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-400">Extra Dose</span>
            </div>
          </div>
        </div>

        {/* Chart Visual Container */}
        {viewMode === 'day' ? (
          <div className="pt-6 pb-2">
            <div className="h-64 flex items-end gap-2 sm:gap-3 border-b border-slate-200 dark:border-slate-800 px-2 overflow-x-auto">
              {chartDays.map((d) => {
                const isSelected = d.dateKey === selectedDayKey;
                const baselinePercent = Math.min(100, (d.baselineInfusedMl / dayMaxVal) * 100);
                const extraPercent = Math.min(100, (d.extraDosesMl / dayMaxVal) * 100);

                return (
                  <button
                    key={d.dateKey}
                    onClick={() => setSelectedDayKey(d.dateKey)}
                    className="flex-1 min-w-[36px] flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {/* Hover/Selected Total label */}
                    <span
                      className={`text-[10px] font-mono font-bold mb-1 tabular-nums transition-opacity ${
                        isSelected ? 'text-sky-600 dark:text-sky-400 opacity-100' : 'text-slate-400 opacity-80 group-hover:opacity-100'
                      }`}
                    >
                      {d.totalInfusedMl.toFixed(1)}
                    </span>

                    {/* Stacked bar */}
                    <div
                      className={`w-full max-w-[38px] rounded-t-md flex flex-col justify-end overflow-hidden transition-all ${
                        isSelected
                          ? 'ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-900 shadow-md'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      {extraPercent > 0 && (
                        <div
                          className="w-full bg-amber-500"
                          style={{height: `${extraPercent}%`}}
                          title={`Extra doses: ${d.extraDosesMl.toFixed(2)} ml (${d.extraDoseCount} boluses)`}
                        />
                      )}
                      <div
                        className="w-full bg-sky-600"
                        style={{height: `${baselinePercent}%`}}
                        title={`Baseline continuous: ${d.baselineInfusedMl.toFixed(2)} ml`}
                      />
                    </div>

                    {/* Date label */}
                    <span
                      className={`mt-2 text-[10px] font-mono tabular-nums whitespace-nowrap ${
                        isSelected
                          ? 'font-bold text-sky-700 dark:text-sky-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {d.dateStr.slice(0, 5)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Tap any date bar to view its full clinical log below.
            </p>
          </div>
        ) : (
          <div className="pt-6 pb-2">
            <div className="h-64 flex items-end gap-3 sm:gap-4 border-b border-slate-200 dark:border-slate-800 px-2 overflow-x-auto">
              {chartWeeks.map((w, idx) => {
                const isSelected = idx === selectedWeekIndex;
                const totalPercent = Math.min(100, (w.totalInfusedMl / weekMaxVal) * 100);

                return (
                  <button
                    key={w.startDateStr}
                    onClick={() => setSelectedWeekIndex(idx)}
                    className="flex-1 min-w-[50px] flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    <span
                      className={`text-[10px] font-mono font-bold mb-1 tabular-nums transition-opacity ${
                        isSelected ? 'text-sky-600 dark:text-sky-400 opacity-100' : 'text-slate-400 opacity-80 group-hover:opacity-100'
                      }`}
                    >
                      {w.totalInfusedMl.toFixed(1)} ml
                    </span>

                    <div
                      className={`w-full max-w-[48px] rounded-t-md bg-sky-600 transition-all ${
                        isSelected
                          ? 'ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-900 shadow-md'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{height: `${totalPercent}%`}}
                      title={`${w.weekLabel}: ${w.totalInfusedMl.toFixed(2)} ml`}
                    />

                    <span
                      className={`mt-2 text-[10px] font-mono tabular-nums whitespace-nowrap ${
                        isSelected
                          ? 'font-bold text-sky-700 dark:text-sky-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Sun {w.startDateStr.slice(0, 5)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Weeks strictly begin on Sunday in compliance with clinical scheduling.
            </p>
          </div>
        )}
      </div>

      {/* Selected Day Clinical Log Table & Breakdown */}
      {selectedDayRecord && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Day Log for {selectedDayRecord.dateStr}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed timeline of rates, extra doses, notes, and cannula/syringe changes
                </span>
              </div>
            </div>

            {/* Day Selector Quick Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                Select Date:
              </label>
              <select
                value={selectedDayRecord.dateKey}
                onChange={(e) => setSelectedDayKey(e.target.value)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:border-sky-500"
              >
                {dayRecords.map((d) => (
                  <option key={d.dateKey} value={d.dateKey}>
                    {d.dateStr} ({d.totalInfusedMl.toFixed(2)} ml)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Daily metrics summary pill strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Total Infused:</span>
              <strong className="font-mono text-sm text-slate-900 dark:text-white tabular-nums">
                {selectedDayRecord.totalInfusedMl.toFixed(2)} ml
              </strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Avg Rate Per Hour:</span>
              <strong className="font-mono text-sm text-sky-600 dark:text-sky-400 tabular-nums">
                {selectedDayRecord.averageRatePerHour.toFixed(3)} ml/h
              </strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Extra Doses:</span>
              <strong className="font-mono text-sm text-slate-900 dark:text-white tabular-nums">
                {selectedDayRecord.extraDoseCount} ({selectedDayRecord.extraDosesMl.toFixed(2)} ml)
              </strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Logged Events:</span>
              <strong className="font-mono text-sm text-slate-900 dark:text-white tabular-nums">
                {selectedDayRecord.events.length} entries
              </strong>
            </div>
          </div>

          {/* Events List for Selected Day */}
          {selectedDayRecord.events.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-4 text-center">
              Continuous basal infusion running at baseline rate ({settings.baseRate.toFixed(2)} ml/h). No manual dose alterations or ad hoc notes recorded on this date.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              {selectedDayRecord.events.map((ev) => {
                const timeStr = format24HourTime(ev.effectiveTime || ev.timestamp);
                return (
                  <div key={ev.id} className="p-3 bg-white dark:bg-slate-900 flex items-start justify-between gap-4 text-xs">
                    <div className="flex items-start gap-3">
                      <span className="font-mono font-bold text-slate-600 dark:text-slate-400 tabular-nums shrink-0 mt-0.5">
                        {timeStr}
                      </span>
                      <div className="space-y-0.5">
                        {ev.type === 'rate_change' && (
                          <div className="text-slate-900 dark:text-white font-medium">
                            Infusion rate adjusted to{' '}
                            <strong className="uppercase text-sky-600 dark:text-sky-400">{ev.details.rateLevel}</strong> ({ev.details.rateValue?.toFixed(2)} ml/h)
                          </div>
                        )}
                        {ev.type === 'extra_dose' && (
                          <div className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Extra dose administered: {ev.details.doseAmount?.toFixed(2)} ml</span>
                          </div>
                        )}
                        {ev.type === 'syringe_change' && (
                          <div className="text-sky-700 dark:text-sky-300 font-medium">
                            Syringe changed (10.0 ml fresh syringe)
                          </div>
                        )}
                        {ev.type === 'cannula_change' && (
                          <div className="text-emerald-700 dark:text-emerald-300 font-medium">
                            Cannula changed & site rotated (Day 1)
                          </div>
                        )}
                        {ev.type === 'pump_start' && (
                          <div className="text-emerald-700 dark:text-emerald-300 font-semibold">
                            Pump started / resumed
                          </div>
                        )}
                        {ev.type === 'pump_stop' && (
                          <div className="text-rose-700 dark:text-rose-300 font-semibold">
                            Pump stopped / paused
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
      )}
    </div>
  );
};
