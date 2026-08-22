import { registerPlugin } from '@capacitor/core';

export interface NativeAlarmPayload {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface AlarmMonitorPlugin {
  syncAlarms(options: { alarms: NativeAlarmPayload[] }): Promise<void>;
  checkPendingTrigger(): Promise<{ alarmId: string | null }>;
  hasBackgroundLocationPermission(): Promise<{ granted: boolean }>;
  requestBackgroundLocationPermission(): Promise<{ granted: boolean }>;
  openLocationSettings(): Promise<void>;
}

const AlarmMonitor = registerPlugin<AlarmMonitorPlugin>('AlarmMonitor');

export default AlarmMonitor;
