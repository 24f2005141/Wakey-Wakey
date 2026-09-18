import { Loader } from '@googlemaps/js-api-loader';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

let loaderPromise: Promise<typeof google> | null = null;

/** True once a Google Maps API key has been configured via VITE_GOOGLE_MAPS_API_KEY. */
export function hasGoogleMapsApiKey(): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}

/**
 * Loads the Google Maps JS API (Maps, Places, Geocoding) once and caches the
 * promise so every caller shares the same load. Rejects immediately (without
 * ever touching the network) if no API key is configured, so callers can
 * show a clear "map unavailable" state instead of a silent blank map.
 */
export function loadGoogleMaps(): Promise<typeof google> {
  if (!hasGoogleMapsApiKey()) {
    return Promise.reject(
      new Error(
        'Missing VITE_GOOGLE_MAPS_API_KEY. Add it to your .env file (see .env.example) to enable the map.'
      )
    );
  }

  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: apiKey as string,
      version: 'weekly',
      libraries: ['places', 'geocoding'],
    });
    loaderPromise = loader.load();
  }

  return loaderPromise;
}
