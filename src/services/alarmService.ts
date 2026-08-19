import { Alarm } from '../types';

const LOCAL_STORAGE_KEY = 'wakey_wakey_alarms_cache';
const DEFAULT_TONE_KEY = 'wakey_default_alarm_tone';

/**
 * Get alarms from local storage
 */
export function getLocalAlarms(): Alarm[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read local alarms:', err);
    return [];
  }
}

/**
 * Save alarms to local storage
 */
export function saveLocalAlarms(alarms: Alarm[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(alarms));
  } catch (err) {
    console.warn('Failed to save local alarms cache:', err);
  }
}

/**
 * Retrieve saved default alarm tone
 */
export function getDefaultAlarmTone(): 'gentle_chime' | 'station_bell' | 'urgency_pulse' | 'subway_alert' {
  try {
    const tone = localStorage.getItem(DEFAULT_TONE_KEY);
    if (tone && ['gentle_chime', 'station_bell', 'urgency_pulse', 'subway_alert'].includes(tone)) {
      return tone as any;
    }
  } catch (err) {
    console.warn('Failed to read default tone preference:', err);
  }
  return 'gentle_chime';
}

/**
 * Save user's default alarm tone preference
 */
export function saveDefaultAlarmTone(tone: string): void {
  try {
    localStorage.setItem(DEFAULT_TONE_KEY, tone);
  } catch (err) {
    console.warn('Failed to save default tone preference:', err);
  }
}
