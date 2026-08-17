import { UserLocation } from '../types';
import { reverseGeocode } from './geo';

const BATTERY_SAVER_STORAGE_KEY = 'wakey_battery_saver_mode';
const CUSTOM_LOCATION_KEY = 'wakey_custom_location';

/**
 * Get whether battery saver mode is currently enabled
 */
export function getBatterySaverMode(): boolean {
  try {
    const saved = localStorage.getItem(BATTERY_SAVER_STORAGE_KEY);
    return saved === 'true';
  } catch (err) {
    console.warn('Failed to read battery saver preference:', err);
    return false;
  }
}

/**
 * Save battery saver mode preference
 */
export function saveBatterySaverMode(enabled: boolean): void {
  try {
    localStorage.setItem(BATTERY_SAVER_STORAGE_KEY, String(enabled));
  } catch (err) {
    console.warn('Failed to save battery saver preference:', err);
  }
}

export interface InternetLocationResult {
  lat: number;
  lng: number;
  accuracy: number;
  city?: string;
  region?: string;
  country?: string;
  source: 'internet';
  method?: 'wifi_network' | 'ip_lookup';
  timestamp: number;
}

/**
 * Low-Power Location Resolver:
 * 1. Primary: Uses low-power Browser Network / Wi-Fi Geolocation (enableHighAccuracy: false).
 *    This queries Google/Apple Wi-Fi BSSID & Cell tower databases over the internet WITHOUT
 *    activating the high-power GPS satellite chip. This gives ~20m-80m accuracy.
 * 2. Fallback: Multi-endpoint IP Geolocation when network geolocation is blocked.
 */
export async function fetchLocationViaInternet(): Promise<InternetLocationResult> {
  // 1. Try Browser Low-Power Network / Wi-Fi Triangulation (enableHighAccuracy: false)
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false, // Explicitly DO NOT power on GPS satellite chip
            timeout: 7000,
            maximumAge: 120000, // Reuse cached network fix up to 2 mins
          }
        );
      });

      if (pos.coords.latitude && pos.coords.longitude) {
        let city: string | undefined;
        try {
          const rev = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          city = rev.name || undefined;
        } catch {
          // ignore reverse geocode error
        }

        return {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 150,
          city,
          source: 'internet',
          method: 'wifi_network',
          timestamp: pos.timestamp || Date.now(),
        };
      }
    } catch (netErr) {
      console.log('Browser network geolocation not available, trying IP fallback:', netErr);
    }
  }

  // 2. Multi-Source IP Geolocation Fallback
  const endpoints = [
    // Free IP API
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('freeipapi failed');
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 2500,
          city: data.cityName || undefined,
          region: data.regionName || undefined,
          country: data.countryName || undefined,
          source: 'internet' as const,
          method: 'ip_lookup' as const,
          timestamp: Date.now(),
        };
      }
      throw new Error('Invalid coordinates from freeipapi');
    },

    // IPAPI.co
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('ipapi.co failed');
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 3000,
          city: data.city || undefined,
          region: data.region || undefined,
          country: data.country_name || undefined,
          source: 'internet' as const,
          method: 'ip_lookup' as const,
          timestamp: Date.now(),
        };
      }
      throw new Error('Invalid coordinates from ipapi.co');
    },

    // IPWho.is
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('ipwho.is failed');
      const data = await res.json();
      if (data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 3000,
          city: data.city || undefined,
          region: data.region || undefined,
          country: data.country || undefined,
          source: 'internet' as const,
          method: 'ip_lookup' as const,
          timestamp: Date.now(),
        };
      }
      throw new Error('Invalid coordinates from ipwho.is');
    },
  ];

  for (const fetcher of endpoints) {
    try {
      const result = await fetcher();
      return result;
    } catch {
      // try next endpoint
    }
  }

  throw new Error('All internet location services failed');
}
