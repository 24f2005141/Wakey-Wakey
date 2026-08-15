export interface Alarm {
  id: string;
  userId: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters (e.g. 100 to 5000)
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  alarmTone?: 'gentle_chime' | 'station_bell' | 'urgency_pulse' | 'subway_alert';
  volume?: number;
  snoozedUntil?: number | null;
  lastTriggeredAt?: number | null;
  createdAt: number;
  updatedAt?: number;
  category?: 'transit' | 'work' | 'home' | 'airport' | 'other';
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  isSimulated?: boolean;
}

export type TabType = 'map' | 'alarms' | 'settings';

export interface LocationSearchResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
}
