/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RateSettings,
  PumpState,
  LogEvent,
  DayUsageRecord,
  WeekUsageRecord,
  formatDDMMYYYY,
  format24HourTime,
  toDateKey,
  isSameDay,
} from '../types/produodopa';

const STORAGE_KEYS = {
  SETTINGS: 'produodopa_settings_v1',
  PUMP_STATE: 'produodopa_pump_state_v1',
  EVENTS: 'produodopa_events_v1',
  INITIALIZED: 'produodopa_initialized_v1',
};

export const DEFAULT_SETTINGS: RateSettings = {
  lowRate: 0.22,
  baseRate: 0.34,
  highRate: 0.48,
  extraDoseAmount: 0.17,
  extraDoseWaitHours: 2, // minimum 2h, max 8h
};

export function loadSettings(): RateSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      lowRate: Number(parsed.lowRate) || DEFAULT_SETTINGS.lowRate,
      baseRate: Number(parsed.baseRate) || DEFAULT_SETTINGS.baseRate,
      highRate: Number(parsed.highRate) || DEFAULT_SETTINGS.highRate,
      extraDoseAmount: Number(parsed.extraDoseAmount) || DEFAULT_SETTINGS.extraDoseAmount,
      extraDoseWaitHours: Math.min(8, Math.max(2, Math.round(Number(parsed.extraDoseWaitHours) || 2))),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: RateSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadPumpState(): PumpState {
  const now = new Date();
  const defaultState: PumpState = {
    isRunning: true,
    currentLevel: 'base',
    currentRate: DEFAULT_SETTINGS.baseRate,
    lastStateChange: now.toISOString(),
    // Default syringe changed 6 hours ago
    lastSyringeChange: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
    // Default cannula changed 18 hours ago (Day 1)
    lastCannulaChange: new Date(now.getTime() - 18 * 3600 * 1000).toISOString(),
    syringeInfusedVolume: 6 * DEFAULT_SETTINGS.baseRate, // ~2.04 ml consumed
    lastTickTimestamp: now.toISOString(),
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PUMP_STATE);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
    };
  } catch {
    return defaultState;
  }
}

export function savePumpState(state: PumpState): void {
  localStorage.setItem(STORAGE_KEYS.PUMP_STATE, JSON.stringify(state));
}

export function loadAllEvents(): LogEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!raw) return [];
    const list: LogEvent[] = JSON.parse(raw);
    return list;
  } catch {
    return [];
  }
}

export function saveAllEvents(events: LogEvent[]): void {
  // Prune any records prior to the maximum ninety (90) days
  const now = new Date();
  const cutoffTime = now.getTime() - 90 * 24 * 3600 * 1000;

  const pruned = events.filter((ev) => {
    const evTime = new Date(ev.timestamp).getTime();
    return evTime >= cutoffTime;
  });

  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(pruned));
}

export function addEvent(event: LogEvent): LogEvent[] {
  const events = loadAllEvents();
  const updated = [event, ...events];
  saveAllEvents(updated);
  return updated;
}

/**
 * Prunes events strictly older than 90 days from local storage.
 */
export function pruneOldRecords(): void {
  const events = loadAllEvents();
  saveAllEvents(events);
}

/**
 * Calculates current syringe level based on elapsed time and extra doses.
 * Returns volume remaining (ml) out of 10.0 ml.
 */
export function calculateSyringeStatus(state: PumpState): {
  capacity: number;
  consumedMl: number;
  remainingMl: number;
  percentageRemaining: number;
  hoursUntilEmpty: number | null;
  hoursElapsedSinceChange: number;
} {
  const capacity = 10.0;
  const consumed = Math.min(capacity, Math.max(0, state.syringeInfusedVolume));
  const remaining = Math.max(0, capacity - consumed);
  const percentage = Math.round((remaining / capacity) * 100);

  const now = new Date().getTime();
  const syringeChangeTime = new Date(state.lastSyringeChange).getTime();
  const hoursElapsed = Math.max(0, (now - syringeChangeTime) / (3600 * 1000));

  let hoursUntilEmpty: number | null = null;
  if (state.isRunning && state.currentRate > 0 && remaining > 0) {
    hoursUntilEmpty = remaining / state.currentRate;
  }

  return {
    capacity,
    consumedMl: Math.round(consumed * 100) / 100,
    remainingMl: Math.round(remaining * 100) / 100,
    percentageRemaining: percentage,
    hoursUntilEmpty: hoursUntilEmpty !== null ? Math.round(hoursUntilEmpty * 10) / 10 : null,
    hoursElapsedSinceChange: hoursElapsed,
  };
}

/**
 * Calculates cannula age in hours and days (Day 1: 0-<24h, Day 2: 24-<48h, Day 3: >=48h).
 */
export function calculateCannulaStatus(lastCannulaChange: string): {
  elapsedHours: number;
  dayNumber: number; // 1, 2, 3+
  statusLabel: string;
  colorLevel: 'green' | 'orange' | 'red';
} {
  const now = new Date().getTime();
  const changeTime = new Date(lastCannulaChange).getTime();
  const elapsedHours = Math.max(0, (now - changeTime) / (3600 * 1000));

  if (elapsedHours < 24) {
    return {
      elapsedHours,
      dayNumber: 1,
      statusLabel: 'Day 1 (Optimal)',
      colorLevel: 'green',
    };
  } else if (elapsedHours < 48) {
    return {
      elapsedHours,
      dayNumber: 2,
      statusLabel: 'Day 2 (Active)',
      colorLevel: 'orange',
    };
  } else {
    return {
      elapsedHours,
      dayNumber: 3,
      statusLabel: 'Day 3 (Change recommended)',
      colorLevel: 'red',
    };
  }
}

/**
 * Computes extra doses taken today since midnight 00:00:00.
 */
export function getTodayExtraDoses(events: LogEvent[]): {
  count: number;
  totalVolume: number;
  lastDoseTime: Date | null;
  lastActiveEventId: string | null;
} {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Filter events of type 'extra_dose' since startOfDay that have not been undone
  const undoneIds = new Set<string>();
  events.forEach((e) => {
    if (e.type === 'extra_dose_undone' && e.details.undoneEventId) {
      undoneIds.add(e.details.undoneEventId);
    }
  });

  const todayExtraDoses = events.filter((e) => {
    if (e.type !== 'extra_dose') return false;
    if (undoneIds.has(e.id)) return false;
    const evTime = new Date(e.timestamp);
    return evTime >= startOfDay;
  });

  let totalVolume = 0;
  todayExtraDoses.forEach((e) => {
    totalVolume += e.details.doseAmount || 0;
  });

  let lastDoseTime: Date | null = null;
  let lastActiveEventId: string | null = null;
  if (todayExtraDoses.length > 0) {
    // Sort descending
    todayExtraDoses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    lastDoseTime = new Date(todayExtraDoses[0].timestamp);
    lastActiveEventId = todayExtraDoses[0].id;
  }

  return {
    count: todayExtraDoses.length,
    totalVolume: Math.round(totalVolume * 100) / 100,
    lastDoseTime,
    lastActiveEventId,
  };
}

/**
 * Builds historic day-by-day records.
 * STRICT REQUIREMENT: "Historic reporting will not include the current day and will only retain a maximum of the previous ninety days, any record prior to the maximum will be deleted."
 */
export function getHistoricDayRecords(events: LogEvent[], settings: RateSettings): DayUsageRecord[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const ninetyDaysAgo = new Date(startOfToday.getTime() - 90 * 24 * 3600 * 1000);

  // Map of dateKey -> DayUsageRecord
  const dayMap = new Map<string, DayUsageRecord>();

  // Initialize previous days (up to 90 days) so every completed day is visible
  for (let i = 1; i <= 90; i++) {
    const d = new Date(startOfToday.getTime() - i * 24 * 3600 * 1000);
    const key = toDateKey(d);
    dayMap.set(key, {
      dateStr: formatDDMMYYYY(d),
      dateKey: key,
      totalInfusedMl: 0,
      baselineInfusedMl: 0,
      extraDosesMl: 0,
      extraDoseCount: 0,
      runningHours: 24, // baseline assume continuous infusion
      averageRatePerHour: 0,
      events: [],
    });
  }

  const undoneIds = new Set<string>();
  events.forEach((e) => {
    if (e.type === 'extra_dose_undone' && e.details.undoneEventId) {
      undoneIds.add(e.details.undoneEventId);
    }
  });

  // Group events into dayMap (excluding today)
  events.forEach((ev) => {
    const evDate = new Date(ev.timestamp);
    if (evDate >= startOfToday) return; // EXCLUDE CURRENT DAY
    if (evDate < ninetyDaysAgo) return; // EXCLUDE > 90 DAYS

    const key = toDateKey(evDate);
    const record = dayMap.get(key);
    if (!record) return;

    record.events.push(ev);

    if (ev.type === 'extra_dose' && !undoneIds.has(ev.id)) {
      const amt = ev.details.doseAmount || settings.extraDoseAmount;
      record.extraDosesMl += amt;
      record.extraDoseCount += 1;
    }
  });

  // Calculate day totals & baseline volume
  // For days with events, compute accurate volume. If seeded/historical, simulate realistic daily baseline
  const result: DayUsageRecord[] = [];
  dayMap.forEach((rec) => {
    rec.events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Approximate baseline volume based on running rate or base rate (standard 24h CSCI)
    let baselineRate = settings.baseRate;
    // Check if any rate was set that day
    for (const ev of rec.events) {
      if (ev.type === 'rate_change' && ev.details.rateValue) {
        baselineRate = ev.details.rateValue;
        break;
      }
    }

    rec.baselineInfusedMl = Math.round(baselineRate * rec.runningHours * 100) / 100;
    rec.totalInfusedMl = Math.round((rec.baselineInfusedMl + rec.extraDosesMl) * 100) / 100;
    rec.averageRatePerHour = Math.round((rec.totalInfusedMl / 24) * 1000) / 1000;

    result.push(rec);
  });

  // Sort newest completed day first
  result.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  return result;
}

/**
 * Builds week-by-week records.
 * STRICT REQUIREMENT: "week-by-week basis (week starting on a Sunday)".
 */
export function getHistoricWeekRecords(dayRecords: DayUsageRecord[]): WeekUsageRecord[] {
  const weekMap = new Map<string, WeekUsageRecord>();

  // dayRecords are already strictly previous completed days (within 90 days, excluding today)
  dayRecords.forEach((dayRec) => {
    const [dStr, mStr, yStr] = dayRec.dateStr.split('/');
    const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));

    // Find previous or same Sunday (start of week)
    const dayOfWeek = d.getDay(); // 0 is Sunday
    const sundayDate = new Date(d);
    sundayDate.setDate(d.getDate() - dayOfWeek);

    const saturdayDate = new Date(sundayDate);
    saturdayDate.setDate(sundayDate.getDate() + 6);

    const weekKey = toDateKey(sundayDate);
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekLabel: `Week of Sun ${formatDDMMYYYY(sundayDate)}`,
        startDateStr: formatDDMMYYYY(sundayDate),
        endDateStr: formatDDMMYYYY(saturdayDate),
        totalInfusedMl: 0,
        dailyAverageMl: 0,
        averageRatePerHour: 0,
        totalExtraDoses: 0,
        days: [],
      });
    }

    const week = weekMap.get(weekKey)!;
    week.days.push(dayRec);
    week.totalInfusedMl += dayRec.totalInfusedMl;
    week.totalExtraDoses += dayRec.extraDoseCount;
  });

  const result: WeekUsageRecord[] = [];
  weekMap.forEach((week) => {
    week.days.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    week.totalInfusedMl = Math.round(week.totalInfusedMl * 100) / 100;
    const numDays = week.days.length || 1;
    week.dailyAverageMl = Math.round((week.totalInfusedMl / numDays) * 100) / 100;
    week.averageRatePerHour = Math.round((week.totalInfusedMl / (numDays * 24)) * 1000) / 1000;
    result.push(week);
  });

  // Sort newest week first
  result.sort((a, b) => b.startDateStr.localeCompare(a.startDateStr));
  return result;
}

/**
 * Seeds initial 14 days of realistic Parkinson's Pro-Duodopa historical data
 * on first launch so charts, logs, weekly trends, and CSV export have immediate clinical data.
 */
export function seedSampleDataIfEmpty(): void {
  if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
    return;
  }

  const events: LogEvent[] = [];
  const now = new Date();

  // Create events for the past 14 days
  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const dayDate = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000);

    // Morning syringe change around 08:00
    const syringeTime = new Date(dayDate);
    syringeTime.setHours(8, 0, 0, 0);
    events.push({
      id: `seed_syr_${daysAgo}`,
      timestamp: syringeTime.toISOString(),
      effectiveTime: syringeTime.toISOString(),
      type: 'syringe_change',
      details: {
        syringeCapacity: 10,
      },
    });

    // Morning base rate confirmation
    events.push({
      id: `seed_rate_am_${daysAgo}`,
      timestamp: syringeTime.toISOString(),
      effectiveTime: syringeTime.toISOString(),
      type: 'rate_change',
      details: {
        rateLevel: 'base',
        rateValue: 0.34,
      },
    });

    // Cannula change every 2-3 days
    if (daysAgo % 3 === 0) {
      const cannulaTime = new Date(dayDate);
      cannulaTime.setHours(8, 15, 0, 0);
      events.push({
        id: `seed_can_${daysAgo}`,
        timestamp: cannulaTime.toISOString(),
        effectiveTime: cannulaTime.toISOString(),
        type: 'cannula_change',
        details: {
          cannulaDay: 1,
        },
      });
    }

    // Midday note or ON/OFF event
    const middayTime = new Date(dayDate);
    middayTime.setHours(12, 30, 0, 0);
    const isOnDay = daysAgo % 2 === 0;
    events.push({
      id: `seed_note_${daysAgo}`,
      timestamp: middayTime.toISOString(),
      effectiveTime: middayTime.toISOString(),
      type: 'symptom_note',
      details: {
        noteText: isOnDay
          ? 'Good motor response after lunch. Walking comfortably.'
          : 'Slight stiffness and tremor in right hand before afternoon tea.',
        onOffStatus: isOnDay ? 'ON' : 'OFF',
      },
    });

    // Occasional afternoon extra dose on days with stiffness/OFF
    if (!isOnDay || daysAgo % 3 === 1) {
      const doseTime = new Date(dayDate);
      doseTime.setHours(14, 0, 0, 0);
      events.push({
        id: `seed_dose_${daysAgo}`,
        timestamp: doseTime.toISOString(),
        effectiveTime: doseTime.toISOString(),
        type: 'extra_dose',
        details: {
          doseAmount: 0.17,
        },
      });
    }

    // Evening high or base rate adjustment
    if (daysAgo % 4 === 0) {
      const eveningTime = new Date(dayDate);
      eveningTime.setHours(19, 0, 0, 0);
      events.push({
        id: `seed_rate_pm_${daysAgo}`,
        timestamp: eveningTime.toISOString(),
        effectiveTime: eveningTime.toISOString(),
        type: 'rate_change',
        details: {
          rateLevel: 'high',
          rateValue: 0.48,
          previousRateLevel: 'base',
          previousRateValue: 0.34,
        },
      });
    }
  }

  saveAllEvents(events);
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
}

/**
 * Exports data to CSV file conforming strictly to DD/MM/YYYY and 24h format.
 */
export function exportToCSV(events: LogEvent[], dayRecords: DayUsageRecord[]): void {
  const rows: string[] = [];

  // Section 1: Daily Usage Summaries (Previous 90 days)
  rows.push('--- DAILY INFUSION SUMMARIES (PREVIOUS 90 DAYS) ---');
  rows.push('Date (DD/MM/YYYY),Total Infused (ml),Baseline (ml),Extra Doses (ml),Extra Dose Count,Average Rate (ml/h)');
  dayRecords.forEach((d) => {
    rows.push(
      `"${d.dateStr}",${d.totalInfusedMl},${d.baselineInfusedMl},${d.extraDosesMl},${d.extraDoseCount},${d.averageRatePerHour}`
    );
  });

  rows.push('');
  rows.push('--- CLINICAL LOG OF EVENTS & NOTES ---');
  rows.push('Date (DD/MM/YYYY),Time (24h),Event Type,Rate Level,Rate (ml/h),Dose (ml),ON/OFF State,Notes');

  // Sort events by timestamp ascending for export
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  sortedEvents.forEach((ev) => {
    const dStr = formatDDMMYYYY(ev.effectiveTime || ev.timestamp);
    const tStr = format24HourTime(ev.effectiveTime || ev.timestamp);
    const typeLabel = ev.type.replace(/_/g, ' ').toUpperCase();
    const rateLevel = ev.details.rateLevel || '';
    const rateValue = ev.details.rateValue !== undefined ? ev.details.rateValue : '';
    const doseAmt = ev.details.doseAmount !== undefined ? ev.details.doseAmount : '';
    const onOff = ev.details.onOffStatus || '';
    const cleanNote = (ev.details.noteText || '').replace(/"/g, '""');

    rows.push(
      `"${dStr}","${tStr}","${typeLabel}","${rateLevel}","${rateValue}","${doseAmt}","${onOff}","${cleanNote}"`
    );
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  const now = new Date();
  const fileDate = formatDDMMYYYY(now).replace(/\//g, '_');
  link.setAttribute('download', `ProDuodopa_Infusion_Log_${fileDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
