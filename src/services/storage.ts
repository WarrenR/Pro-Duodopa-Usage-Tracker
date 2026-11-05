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
} from '../types/produodopa';

const STORAGE_KEYS = {
  IS_TEST_MODE: 'produodopa_is_test_mode_v2',
  // Real data keys
  REAL_SETTINGS: 'produodopa_real_settings_v2',
  REAL_PUMP_STATE: 'produodopa_real_pump_state_v2',
  REAL_EVENTS: 'produodopa_real_events_v2',
  REAL_INITIALIZED: 'produodopa_real_initialized_v2',
  // Test data keys
  TEST_SETTINGS: 'produodopa_test_settings_v2',
  TEST_PUMP_STATE: 'produodopa_test_pump_state_v2',
  TEST_EVENTS: 'produodopa_test_events_v2',
  TEST_INITIALIZED: 'produodopa_test_initialized_v2',
};

export const DEFAULT_SETTINGS: RateSettings = {
  lowRate: 0.22,
  baseRate: 0.34,
  highRate: 0.48,
  extraDoseAmount: 0.17,
  extraDoseWaitHours: 2, // minimum 2h, max 8h
};

/**
 * Returns fresh real pump state at first deployment:
 * - Full syringe (10 ml, 0 ml consumed)
 * - Stopped state (isRunning: false)
 * - Fresh cannula (0h elapsed, Day 1)
 */
export function generateDefaultRealPumpState(): PumpState {
  const nowIso = new Date().toISOString();
  return {
    isRunning: false, // "should be in a 'Stopped' state"
    currentLevel: 'base',
    currentRate: DEFAULT_SETTINGS.baseRate,
    lastStateChange: nowIso,
    lastSyringeChange: nowIso, // full syringe, changed right now
    lastCannulaChange: nowIso, // day 1 fresh
    syringeInfusedVolume: 0, // 0 consumed -> full 10.0 ml syringe
    lastTickTimestamp: nowIso,
  };
}

/**
 * Returns simulated test pump state for testing:
 * - Running state
 * - Partially consumed syringe (e.g. 3.2 ml consumed, 6.8 ml remaining)
 * - Cannula in Day 2 (e.g. 28h in use)
 */
export function generateDefaultTestPumpState(): PumpState {
  const now = new Date();
  const syringeChange = new Date(now.getTime() - 9.4 * 3600 * 1000); // 9.4h ago
  const cannulaChange = new Date(now.getTime() - 28 * 3600 * 1000); // 28h ago (Day 2 Orange)

  return {
    isRunning: true,
    currentLevel: 'base',
    currentRate: DEFAULT_SETTINGS.baseRate,
    lastStateChange: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
    lastSyringeChange: syringeChange.toISOString(),
    lastCannulaChange: cannulaChange.toISOString(),
    syringeInfusedVolume: 3.2, // 6.8 ml remaining
    lastTickTimestamp: now.toISOString(),
  };
}

/**
 * Generates simulated test events for the past 14 days for test mode.
 */
export function generateTestEvents(): LogEvent[] {
  const events: LogEvent[] = [];
  const now = new Date();

  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const dayDate = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000);

    // Morning syringe change around 08:00
    const syringeTime = new Date(dayDate);
    syringeTime.setHours(8, 0, 0, 0);
    events.push({
      id: `test_syr_${daysAgo}`,
      timestamp: syringeTime.toISOString(),
      effectiveTime: syringeTime.toISOString(),
      type: 'syringe_change',
      details: {
        syringeCapacity: 10,
      },
    });

    // Morning base rate confirmation
    events.push({
      id: `test_rate_am_${daysAgo}`,
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
        id: `test_can_${daysAgo}`,
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
      id: `test_note_${daysAgo}`,
      timestamp: middayTime.toISOString(),
      effectiveTime: middayTime.toISOString(),
      type: 'symptom_note',
      details: {
        noteText: isOnDay
          ? 'Good motor control following lunch. Fluid gait observed.'
          : 'Moderate stiffness in legs before afternoon rest.',
        onOffStatus: isOnDay ? 'ON' : 'OFF',
      },
    });

    // Afternoon extra dose on days with OFF or stiffness
    if (!isOnDay || daysAgo % 3 === 1) {
      const doseTime = new Date(dayDate);
      doseTime.setHours(14, 0, 0, 0);
      events.push({
        id: `test_dose_${daysAgo}`,
        timestamp: doseTime.toISOString(),
        effectiveTime: doseTime.toISOString(),
        type: 'extra_dose',
        details: {
          doseAmount: 0.17,
        },
      });
    }

    // Evening rate adjustment
    if (daysAgo % 4 === 0) {
      const eveningTime = new Date(dayDate);
      eveningTime.setHours(19, 0, 0, 0);
      events.push({
        id: `test_rate_pm_${daysAgo}`,
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

  return events;
}

// Test mode flag
export function isTestModeActive(): boolean {
  return localStorage.getItem(STORAGE_KEYS.IS_TEST_MODE) === 'true';
}

export function setTestModeActive(active: boolean): void {
  localStorage.setItem(STORAGE_KEYS.IS_TEST_MODE, active ? 'true' : 'false');
}

// Load settings based on mode
export function loadCurrentSettings(isTest: boolean): RateSettings {
  const key = isTest ? STORAGE_KEYS.TEST_SETTINGS : STORAGE_KEYS.REAL_SETTINGS;
  try {
    const raw = localStorage.getItem(key);
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

export function saveCurrentSettings(settings: RateSettings, isTest: boolean): void {
  const key = isTest ? STORAGE_KEYS.TEST_SETTINGS : STORAGE_KEYS.REAL_SETTINGS;
  localStorage.setItem(key, JSON.stringify(settings));
}

// Load pump state based on mode
export function loadCurrentPumpState(isTest: boolean): PumpState {
  const key = isTest ? STORAGE_KEYS.TEST_PUMP_STATE : STORAGE_KEYS.REAL_PUMP_STATE;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return isTest ? generateDefaultTestPumpState() : generateDefaultRealPumpState();
    }
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return isTest ? generateDefaultTestPumpState() : generateDefaultRealPumpState();
  }
}

export function saveCurrentPumpState(state: PumpState, isTest: boolean): void {
  const key = isTest ? STORAGE_KEYS.TEST_PUMP_STATE : STORAGE_KEYS.REAL_PUMP_STATE;
  localStorage.setItem(key, JSON.stringify(state));
}

// Load events based on mode
export function loadCurrentEvents(isTest: boolean): LogEvent[] {
  const key = isTest ? STORAGE_KEYS.TEST_EVENTS : STORAGE_KEYS.REAL_EVENTS;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (isTest) {
        // Initialize test data once
        const testEvents = generateTestEvents();
        localStorage.setItem(STORAGE_KEYS.TEST_EVENTS, JSON.stringify(testEvents));
        return testEvents;
      }
      // Real data starts with no historic data
      return [];
    }
    const list: LogEvent[] = JSON.parse(raw);
    return list;
  } catch {
    return isTest ? generateTestEvents() : [];
  }
}

export function saveCurrentEvents(events: LogEvent[], isTest: boolean): void {
  const key = isTest ? STORAGE_KEYS.TEST_EVENTS : STORAGE_KEYS.REAL_EVENTS;
  // Prune records older than 90 days
  const now = new Date();
  const cutoffTime = now.getTime() - 90 * 24 * 3600 * 1000;
  const pruned = events.filter((ev) => {
    const evTime = new Date(ev.timestamp).getTime();
    return evTime >= cutoffTime;
  });
  localStorage.setItem(key, JSON.stringify(pruned));
}

/**
 * Cleanly switch mode between Real and Test data.
 * Requirement:
 * "When switching to test mode the current state of the real data should be updated and when switching out of test mode the pump should resume with the real data."
 */
export function switchMode(
  toTest: boolean,
  currentPumpState: PumpState,
  currentEvents: LogEvent[],
  currentSettings: RateSettings
): {
  newPumpState: PumpState;
  newEvents: LogEvent[];
  newSettings: RateSettings;
} {
  if (toTest) {
    // 1. Save the CURRENT REAL data before switching
    saveCurrentPumpState(currentPumpState, false);
    saveCurrentEvents(currentEvents, false);
    saveCurrentSettings(currentSettings, false);
    setTestModeActive(true);

    // 2. Load or seed test data
    let testPumpState = loadCurrentPumpState(true);
    let testEvents = loadCurrentEvents(true);
    let testSettings = loadCurrentSettings(true);

    // If test events are empty, generate fresh test dataset
    if (testEvents.length === 0) {
      testEvents = generateTestEvents();
      saveCurrentEvents(testEvents, true);
    }

    return {
      newPumpState: testPumpState,
      newEvents: testEvents,
      newSettings: testSettings,
    };
  } else {
    // 1. Save current test state
    saveCurrentPumpState(currentPumpState, true);
    saveCurrentEvents(currentEvents, true);
    saveCurrentSettings(currentSettings, true);
    setTestModeActive(false);

    // 2. Resume with real data
    const realPumpState = loadCurrentPumpState(false);
    const realEvents = loadCurrentEvents(false);
    const realSettings = loadCurrentSettings(false);

    return {
      newPumpState: realPumpState,
      newEvents: realEvents,
      newSettings: realSettings,
    };
  }
}

/**
 * Resets test data to fresh simulation dataset.
 */
export function resetTestScenario(): {
  pumpState: PumpState;
  events: LogEvent[];
  settings: RateSettings;
} {
  const pumpState = generateDefaultTestPumpState();
  const events = generateTestEvents();
  const settings = DEFAULT_SETTINGS;

  saveCurrentPumpState(pumpState, true);
  saveCurrentEvents(events, true);
  saveCurrentSettings(settings, true);

  return {pumpState, events, settings};
}

/**
 * Resets real data back to first-use baseline:
 * Full syringe (10 ml), stopped state, no historic data.
 */
export function resetRealDataToFirstUse(): {
  pumpState: PumpState;
  events: LogEvent[];
  settings: RateSettings;
} {
  const pumpState = generateDefaultRealPumpState();
  const events: LogEvent[] = [];
  const settings = DEFAULT_SETTINGS;

  saveCurrentPumpState(pumpState, false);
  saveCurrentEvents(events, false);
  saveCurrentSettings(settings, false);

  return {pumpState, events, settings};
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

  const dayMap = new Map<string, DayUsageRecord>();

  // Only create entries for days within the 90 days window
  // If there are no events at all (e.g. real data at first use), dayMap will remain empty!
  const undoneIds = new Set<string>();
  events.forEach((e) => {
    if (e.type === 'extra_dose_undone' && e.details.undoneEventId) {
      undoneIds.add(e.details.undoneEventId);
    }
  });

  // Collect unique days with events
  events.forEach((ev) => {
    const evDate = new Date(ev.timestamp);
    if (evDate >= startOfToday) return; // EXCLUDE CURRENT DAY
    if (evDate < ninetyDaysAgo) return; // EXCLUDE > 90 DAYS

    const key = toDateKey(evDate);
    if (!dayMap.has(key)) {
      dayMap.set(key, {
        dateStr: formatDDMMYYYY(evDate),
        dateKey: key,
        totalInfusedMl: 0,
        baselineInfusedMl: 0,
        extraDosesMl: 0,
        extraDoseCount: 0,
        runningHours: 24,
        averageRatePerHour: 0,
        events: [],
      });
    }

    const record = dayMap.get(key)!;
    record.events.push(ev);

    if (ev.type === 'extra_dose' && !undoneIds.has(ev.id)) {
      const amt = ev.details.doseAmount || settings.extraDoseAmount;
      record.extraDosesMl += amt;
      record.extraDoseCount += 1;
    }
  });

  const result: DayUsageRecord[] = [];
  dayMap.forEach((rec) => {
    rec.events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let baselineRate = settings.baseRate;
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

  result.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  return result;
}

/**
 * Builds week-by-week records (week starting Sunday).
 */
export function getHistoricWeekRecords(dayRecords: DayUsageRecord[]): WeekUsageRecord[] {
  const weekMap = new Map<string, WeekUsageRecord>();

  dayRecords.forEach((dayRec) => {
    const [dStr, mStr, yStr] = dayRec.dateStr.split('/');
    const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));

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

  result.sort((a, b) => b.startDateStr.localeCompare(a.startDateStr));
  return result;
}

/**
 * Exports data to CSV file.
 */
export function exportToCSV(events: LogEvent[], dayRecords: DayUsageRecord[]): void {
  const rows: string[] = [];

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
