/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RateLevel = 'low' | 'base' | 'high' | 'custom';

export interface RateSettings {
  lowRate: number; // ml/h (e.g., 0.22)
  baseRate: number; // ml/h (e.g., 0.34)
  highRate: number; // ml/h (e.g., 0.48)
  extraDoseAmount: number; // ml (e.g., 0.17)
  extraDoseWaitHours: number; // 2 to 8 hours in 1-hour increments
}

export interface PumpState {
  isRunning: boolean;
  currentLevel: RateLevel;
  currentRate: number; // ml/h
  lastStateChange: string; // ISO timestamp
  lastSyringeChange: string; // ISO timestamp (10 ml capacity)
  lastCannulaChange: string; // ISO timestamp
  // Accumulated volume (ml) consumed from the current syringe
  syringeInfusedVolume: number;
  lastTickTimestamp: string; // ISO timestamp used for incremental integration
}

export type EventType =
  | 'rate_change'
  | 'extra_dose'
  | 'extra_dose_undone'
  | 'pump_start'
  | 'pump_stop'
  | 'syringe_change'
  | 'cannula_change'
  | 'symptom_note';

export type OnOffStatus = 'ON' | 'OFF' | null;

export interface LogEvent {
  id: string;
  timestamp: string; // ISO timestamp when the event occurred/was recorded
  effectiveTime: string; // ISO timestamp (can be backdated for notes/ON-OFF)
  type: EventType;
  details: {
    rateLevel?: RateLevel;
    rateValue?: number; // ml/h
    previousRateLevel?: RateLevel;
    previousRateValue?: number;
    doseAmount?: number; // ml
    undoneEventId?: string;
    noteText?: string;
    onOffStatus?: OnOffStatus;
    syringeCapacity?: number; // ml (10)
    cannulaDay?: number; // 1, 2, 3+
  };
}

export interface DayUsageRecord {
  dateStr: string; // DD/MM/YYYY
  dateKey: string; // YYYY-MM-DD for sorting
  totalInfusedMl: number;
  baselineInfusedMl: number;
  extraDosesMl: number;
  extraDoseCount: number;
  runningHours: number;
  averageRatePerHour: number; // ml/h over 24h
  events: LogEvent[];
}

export interface WeekUsageRecord {
  weekLabel: string; // e.g. "Week of Sun 26/10/2026"
  startDateStr: string; // DD/MM/YYYY (Sunday)
  endDateStr: string; // DD/MM/YYYY (Saturday)
  totalInfusedMl: number;
  dailyAverageMl: number;
  averageRatePerHour: number;
  totalExtraDoses: number;
  days: DayUsageRecord[];
}

// Utility: format Date to strictly 24-hour format "HH:mm"
export function format24HourTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--:--';
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Utility: format Date to strictly "DD/MM/YYYY"
export function formatDDMMYYYY(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--/--/----';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Utility: parse DD/MM/YYYY into a Date
export function parseDDMMYYYY(dateStr: string): Date | null {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const d = new Date(year, month, day, 0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

// Format date key YYYY-MM-DD
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Check if two dates are the same calendar day
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
