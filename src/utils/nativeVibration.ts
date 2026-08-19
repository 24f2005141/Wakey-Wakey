import { registerPlugin } from '@capacitor/core';

export interface AlarmVibrationPlugin {
  start(): Promise<void>;
  stop(): Promise<void>;
}

const AlarmVibration = registerPlugin<AlarmVibrationPlugin>('AlarmVibration');

export default AlarmVibration;
