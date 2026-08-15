import { LocationSearchResult } from '../types';

/**
 * Detect user's country from browser timezone, language, and locale
 */
export function detectUserCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (
      tz.includes('Kolkata') ||
      tz.includes('Calcutta') ||
      tz.includes('India') ||
      tz === 'IST'
    ) {
      return 'in';
    }
    const lang = (navigator.language || '').toLowerCase();
    if (
      lang.includes('-in') ||
      lang === 'hi' ||
      lang === 'ta' ||
      lang === 'te' ||
      lang === 'kn' ||
      lang === 'ml' ||
      lang === 'mr' ||
      lang === 'gu' ||
      lang === 'bn'
    ) {
      return 'in';
    }
    if (tz.includes('London') || lang.includes('-gb')) return 'gb';
    if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) return 'us';
    if (tz.includes('Singapore')) return 'sg';
    if (tz.includes('Dubai') || tz.includes('Asia/Dubai')) return 'ae';
    if (tz.includes('Sydney') || tz.includes('Melbourne')) return 'au';
  } catch {
    // ignore
  }
  // Default to 'in' since current user is based in India
  return 'in';
}

/**
 * Get default starting location coordinates based on detected locale
 */
export function getDefaultStartingLocation(): { lat: number; lng: number } {
  const country = detectUserCountry();
  if (country === 'in') {
    // Chennai / Central India default coordinates
    return { lat: 13.0827, lng: 80.2707 };
  }
  return { lat: 40.7128, lng: -74.006 };
}

/**
 * Calculate distance between two coordinates in meters using the Haversine formula
 */
export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format meters into human-readable string (e.g. "200m", "1.5km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km`;
}

// Preset popular suggestions when search is empty
export const DEFAULT_SUGGESTIONS: LocationSearchResult[] = [
  {
    id: 'sug-transit-1',
    name: 'Central Railway Station',
    displayName: 'Main Railway Station & Metro Interchange',
    lat: 13.0827,
    lng: 80.2707,
    type: 'transit',
  },
  {
    id: 'sug-airport-1',
    name: 'International Airport',
    displayName: 'Airport Passenger Terminal & Metro',
    lat: 12.9941,
    lng: 80.1709,
    type: 'airport',
  },
  {
    id: 'sug-transit-2',
    name: 'Bus Terminus / Transit Hub',
    displayName: 'Intercity & Local Bus Hub',
    lat: 13.0694,
    lng: 80.2078,
    type: 'transit',
  },
  {
    id: 'sug-work-1',
    name: 'Tech Park / IT Corridor',
    displayName: 'Major Commercial Offices & Tech Hub',
    lat: 12.9757,
    lng: 80.2212,
    type: 'work',
  },
];

/**
 * Reverse geocode a lat/lng coordinate into a human-friendly address & place name
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ name: string; displayName: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const placeName =
          data.name ||
          addr.amenity ||
          addr.building ||
          addr.shop ||
          addr.station ||
          addr.railway ||
          addr.road ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.city ||
          data.display_name.split(',')[0];

        return {
          name: placeName,
          displayName: data.display_name,
        };
      }
    }
  } catch {
    // fallback
  }

  return {
    name: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    displayName: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}

/**
 * Multi-source, sensible & Google Maps grade country & proximity-biased location search engine
 */
export async function searchLocations(
  query: string,
  userLoc?: { lat: number; lng: number }
): Promise<(LocationSearchResult & { distance?: number })[]> {
  const trimmed = query.trim();
  const countryCode = detectUserCountry();

  // Resolved user coordinates (defaults to detected regional center if userLoc not yet fixed)
  const currentLat = userLoc?.lat ?? (countryCode === 'in' ? 13.0827 : 40.7128);
  const currentLng = userLoc?.lng ?? (countryCode === 'in' ? 80.2707 : -74.006);

  if (!trimmed) {
    return DEFAULT_SUGGESTIONS.map((loc) => ({
      ...loc,
      distance: getDistanceInMeters(currentLat, currentLng, loc.lat, loc.lng),
    }));
  }

  const queryLower = trimmed.toLowerCase();
  const allResults: (LocationSearchResult & {
    distance?: number;
    score: number;
  })[] = [];
  const seenCoordinates = new Set<string>();

  const fetchPromises: Promise<void>[] = [];

  // 1. Nominatim Local + Viewbox Proximity Biased Search (Google Maps style viewbox bias)
  fetchPromises.push(
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        // 1.5 degree viewbox (~160km radius around user's current city)
        const vb = `${currentLng - 1.5},${currentLat + 1.5},${currentLng + 1.5},${currentLat - 1.5}`;
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          trimmed
        )}&viewbox=${vb}&bounded=0&countrycodes=${countryCode}&limit=12&addressdetails=1`;

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            for (const item of items) {
              const lat = parseFloat(item.lat);
              const lng = parseFloat(item.lon);
              if (isNaN(lat) || isNaN(lng)) continue;

              const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
              if (seenCoordinates.has(coordKey)) continue;
              seenCoordinates.add(coordKey);

              const name = item.name || item.display_name.split(',')[0].trim();
              const displayName = item.display_name;

              let type: 'transit' | 'work' | 'home' | 'airport' | 'landmark' | 'place' = 'place';
              const cat = (item.category || item.type || '').toLowerCase();
              const isNotablePOI =
                cat.includes('beach') ||
                cat.includes('attraction') ||
                cat.includes('monument') ||
                cat.includes('tourism') ||
                cat.includes('station') ||
                cat.includes('railway') ||
                cat.includes('airport') ||
                cat.includes('mall') ||
                cat.includes('park');

              if (
                cat.includes('station') ||
                cat.includes('railway') ||
                cat.includes('bus') ||
                cat.includes('subway') ||
                cat.includes('transit')
              ) {
                type = 'transit';
              } else if (cat.includes('aerodrome') || cat.includes('airport')) {
                type = 'airport';
              } else if (isNotablePOI) {
                type = 'landmark';
              } else if (cat.includes('office') || cat.includes('commercial')) {
                type = 'work';
              }

              const dist = getDistanceInMeters(currentLat, currentLng, lat, lng);

              // ── Google Maps Grade Scoring Formula ──
              let score = 50;

              // A. Text Match Quality (Autocomplete-friendly)
              const nameLower = name.toLowerCase();
              const words = nameLower.split(/[\s,.-]+/);

              if (nameLower === queryLower) {
                score += 100; // Exact match
              } else if (nameLower.startsWith(queryLower)) {
                // "Marina Beach" starting with "marina" -> high autocomplete score
                score += 95;
              } else if (words.some((w) => w.startsWith(queryLower))) {
                score += 85;
              } else if (nameLower.includes(queryLower)) {
                score += 65;
              } else if (displayName.toLowerCase().includes(queryLower)) {
                score += 30;
              }

              // B. Prominence / Landmark boost
              if (isNotablePOI) score += 35;
              if (item.importance) score += item.importance * 35;

              // C. Distance Proximity Decay (The Closer to User, The Higher It Ranks)
              if (dist <= 5000) {
                score += 200; // Within 5km (Walking / immediate vicinity)
              } else if (dist <= 25000) {
                score += 160; // Within 25km (Same city / metro area)
              } else if (dist <= 60000) {
                score += 120; // Within 60km (Greater district)
              } else if (dist <= 150000) {
                score += 70;  // Within 150km (Nearby region)
              } else if (dist <= 300000) {
                score += 25;  // Same state
              } else if (dist > 500000) {
                score -= 40;  // Far away penalty (>500km)
              } else if (dist > 1000000) {
                score -= 80;  // Other side of country (>1000km)
              }

              allResults.push({
                id: `nom-local-${item.place_id || Math.random()}`,
                name,
                displayName,
                lat,
                lng,
                type,
                distance: dist,
                score,
              });
            }
          }
        }
      } catch {
        // ignore
      }
    })()
  );

  // 2. Photon Geocoder with Lat/Lon GPS Proximity Bias
  fetchPromises.push(
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          trimmed
        )}&lat=${currentLat}&lon=${currentLng}&limit=12&lang=en`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const geojson = await res.json();
          if (Array.isArray(geojson.features)) {
            for (const feat of geojson.features) {
              const coords = feat.geometry?.coordinates;
              if (!coords || coords.length < 2) continue;
              const pLng = coords[0];
              const pLat = coords[1];

              const coordKey = `${pLat.toFixed(3)},${pLng.toFixed(3)}`;
              if (seenCoordinates.has(coordKey)) continue;
              seenCoordinates.add(coordKey);

              const p = feat.properties || {};
              const name =
                p.name ||
                [p.housenumber, p.street].filter(Boolean).join(' ') ||
                p.city ||
                trimmed;

              const addressParts = [
                p.street ? `${p.housenumber ? p.housenumber + ' ' : ''}${p.street}` : null,
                p.district || p.suburb || p.locality,
                p.city || p.town || p.village,
                p.state,
                p.country,
              ].filter(Boolean);

              const displayName = addressParts.join(', ') || p.name || trimmed;

              let type: 'transit' | 'work' | 'home' | 'airport' | 'landmark' | 'place' = 'place';
              const osmVal = (p.osm_value || '').toLowerCase();
              const isNotablePOI =
                osmVal.includes('beach') ||
                osmVal.includes('attraction') ||
                osmVal.includes('monument') ||
                osmVal.includes('station') ||
                osmVal.includes('airport') ||
                osmVal.includes('mall') ||
                osmVal.includes('park') ||
                p.osm_key === 'tourism' ||
                p.osm_key === 'leisure';

              if (
                osmVal.includes('station') ||
                osmVal.includes('subway') ||
                osmVal.includes('bus') ||
                osmVal.includes('tram') ||
                p.osm_key === 'railway' ||
                p.osm_key === 'public_transport'
              ) {
                type = 'transit';
              } else if (osmVal.includes('airport') || osmVal.includes('aerodrome')) {
                type = 'airport';
              } else if (isNotablePOI) {
                type = 'landmark';
              } else if (osmVal.includes('office') || osmVal.includes('commercial')) {
                type = 'work';
              }

              const dist = getDistanceInMeters(currentLat, currentLng, pLat, pLng);

              let score = 45;
              const nameLower = name.toLowerCase();
              const words = nameLower.split(/[\s,.-]+/);

              if (nameLower === queryLower) {
                score += 100;
              } else if (nameLower.startsWith(queryLower)) {
                score += 95;
              } else if (words.some((w) => w.startsWith(queryLower))) {
                score += 85;
              } else if (nameLower.includes(queryLower)) {
                score += 65;
              }

              if (isNotablePOI) score += 35;

              // Distance Proximity Decay
              if (dist <= 5000) {
                score += 200;
              } else if (dist <= 25000) {
                score += 160;
              } else if (dist <= 60000) {
                score += 120;
              } else if (dist <= 150000) {
                score += 70;
              } else if (dist <= 300000) {
                score += 25;
              } else if (dist > 500000) {
                score -= 40;
              } else if (dist > 1000000) {
                score -= 80;
              }

              allResults.push({
                id: `photon-${p.osm_id || Math.random()}`,
                name,
                displayName,
                lat: pLat,
                lng: pLng,
                type,
                distance: dist,
                score,
              });
            }
          }
        }
      } catch {
        // ignore
      }
    })()
  );

  // 3. Nominatim Global Search (Supplementary fallback for intentional global searches)
  fetchPromises.push(
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          trimmed
        )}&limit=6&addressdetails=1`;

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            for (const item of items) {
              const lat = parseFloat(item.lat);
              const lng = parseFloat(item.lon);
              if (isNaN(lat) || isNaN(lng)) continue;

              const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
              if (seenCoordinates.has(coordKey)) continue;
              seenCoordinates.add(coordKey);

              const name = item.name || item.display_name.split(',')[0].trim();
              const displayName = item.display_name;
              const dist = getDistanceInMeters(currentLat, currentLng, lat, lng);

              const nameLower = name.toLowerCase();
              let score = 30;
              if (nameLower === queryLower) score += 70;
              else if (nameLower.startsWith(queryLower)) score += 60;
              else if (nameLower.includes(queryLower)) score += 30;

              allResults.push({
                id: `nom-global-${item.place_id || Math.random()}`,
                name,
                displayName,
                lat,
                lng,
                type: item.type === 'station' ? 'transit' : 'place',
                distance: dist,
                score,
              });
            }
          }
        }
      } catch {
        // ignore
      }
    })()
  );

  await Promise.allSettled(fetchPromises);

  // Sort by composite score (Relevance + Proximity Decay + Prominence)
  allResults.sort((a, b) => b.score - a.score);

  return allResults.map(({ score, ...item }) => item);
}



