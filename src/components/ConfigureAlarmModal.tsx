import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, Smartphone, Save, Trash2, MapPin, Search, X } from 'lucide-react';
import L from 'leaflet';
import { Alarm, UserLocation, LocationSearchResult } from '../types';
import { formatDistance, searchLocations, reverseGeocode, getDistanceInMeters } from '../utils/geo';
import { playChime } from '../utils/audio';

interface ConfigureAlarmModalProps {
  initialAlarm?: Partial<Alarm> | null;
  userLocation: UserLocation;
  onSave: (alarmData: Omit<Alarm, 'id' | 'createdAt'> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export const ConfigureAlarmModal: React.FC<ConfigureAlarmModalProps> = ({
  initialAlarm,
  userLocation,
  onSave,
  onDelete,
  onClose,
}) => {
  const [name, setName] = useState(initialAlarm?.name || '');
  const [lat, setLat] = useState(initialAlarm?.lat || userLocation.lat + 0.008);
  const [lng, setLng] = useState(initialAlarm?.lng || userLocation.lng + 0.008);
  const [radius, setRadius] = useState(initialAlarm?.radius || 500);
  const [sound, setSound] = useState(initialAlarm?.sound ?? true);
  const [vibration, setVibration] = useState(initialAlarm?.vibration ?? true);
  const [alarmTone, setAlarmTone] = useState(initialAlarm?.alarmTone || 'gentle_chime');

  // Inline location search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<(LocationSearchResult & { distance?: number })[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const miniMapContainerRef = useRef<HTMLDivElement | null>(null);
  const miniMapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Sync state if initialAlarm changes
  useEffect(() => {
    if (initialAlarm) {
      if (initialAlarm.name !== undefined) setName(initialAlarm.name);
      if (initialAlarm.lat !== undefined) setLat(initialAlarm.lat);
      if (initialAlarm.lng !== undefined) setLng(initialAlarm.lng);
      if (initialAlarm.radius !== undefined) setRadius(initialAlarm.radius);
      if (initialAlarm.sound !== undefined) setSound(initialAlarm.sound);
      if (initialAlarm.vibration !== undefined) setVibration(initialAlarm.vibration);
      if (initialAlarm.alarmTone !== undefined) setAlarmTone(initialAlarm.alarmTone);
    }
  }, [initialAlarm]);

  // Search debounce effect
  useEffect(() => {
    if (!isSearchOpen) return;
    let isCancelled = false;

    if (!searchQuery.trim()) {
      setIsSearching(true);
      searchLocations('', userLocation).then((res) => {
        if (!isCancelled) {
          setSearchResults(res);
          setIsSearching(false);
        }
      });
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchLocations(searchQuery, userLocation);
        if (!isCancelled) {
          setSearchResults(res);
          setIsSearching(false);
        }
      } catch {
        if (!isCancelled) setIsSearching(false);
      }
    }, 280);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isSearchOpen, userLocation.lat, userLocation.lng]);

  const handleSelectLocation = (loc: LocationSearchResult & { distance?: number }) => {
    setLat(loc.lat);
    setLng(loc.lng);
    if (!name || name === 'Destination Stop') {
      setName(loc.name);
    }
    setIsSearchOpen(false);
    setSearchQuery('');

    if (markerRef.current) {
      markerRef.current.setLatLng([loc.lat, loc.lng]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([loc.lat, loc.lng]);
    }
    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs([
        [userLocation.lat, userLocation.lng],
        [loc.lat, loc.lng],
      ]);
    }
    if (miniMapInstanceRef.current) {
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [loc.lat, loc.lng],
      ]);
      miniMapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  };

  // Initialize interactive Leaflet preview map
  useEffect(() => {
    if (!miniMapContainerRef.current) return;

    if (!miniMapInstanceRef.current) {
      const map = L.map(miniMapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        bounceAtZoomLimits: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Route line from user location to target
      const route = L.polyline(
        [
          [userLocation.lat, userLocation.lng],
          [lat, lng],
        ],
        {
          color: '#3b82f6',
          weight: 3,
          dashArray: '6, 6',
          opacity: 0.8,
        }
      ).addTo(map);
      routeLineRef.current = route;

      // User location small dot
      const userDotIcon = L.divIcon({
        className: 'user-dot',
        html: `<div class="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: userDotIcon }).addTo(map);

      // Destination Pin
      const pinIcon = L.divIcon({
        className: 'config-pin',
        html: `
          <div class="relative w-8 h-10 flex flex-col items-center cursor-move">
            <div class="w-8 h-8 rounded-full bg-[#f88da6] border-2 border-white shadow-lg flex items-center justify-center text-[#701533]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/>
                <path d="M12 20v2"/>
                <path d="M20 12h2"/>
                <path d="M2 12h2"/>
              </svg>
            </div>
            <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-[#f88da6]"></div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      const marker = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on('drag', (e: any) => {
        const newPos = e.target.getLatLng();
        setLat(newPos.lat);
        setLng(newPos.lng);
        if (circleRef.current) {
          circleRef.current.setLatLng(newPos);
        }
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs([
            [userLocation.lat, userLocation.lng],
            [newPos.lat, newPos.lng],
          ]);
        }
      });

      marker.on('dragend', async (e: any) => {
        const newPos = e.target.getLatLng();
        const info = await reverseGeocode(newPos.lat, newPos.lng);
        setName((prev) => {
          if (!prev || prev === 'Destination Stop' || prev.startsWith('Pinned Location')) {
            return info.name;
          }
          return prev;
        });
      });
      markerRef.current = marker;

      // Tap-to-place destination pin anywhere on mini map
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setLat(clickLat);
        setLng(clickLng);
        if (markerRef.current) markerRef.current.setLatLng([clickLat, clickLng]);
        if (circleRef.current) circleRef.current.setLatLng([clickLat, clickLng]);
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs([
            [userLocation.lat, userLocation.lng],
            [clickLat, clickLng],
          ]);
        }
        const info = await reverseGeocode(clickLat, clickLng);
        setName((prev) => {
          if (!prev || prev === 'Destination Stop' || prev.startsWith('Pinned Location')) {
            return info.name;
          }
          return prev;
        });
      });

      // Geofence Circle
      const circle = L.circle([lat, lng], {
        radius: radius,
        color: '#e06282',
        weight: 2,
        fillColor: '#ffa8bf',
        fillOpacity: 0.22,
      }).addTo(map);
      circleRef.current = circle;

      // Fit bounds to show user and destination
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [lat, lng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

      miniMapInstanceRef.current = map;

      // Ensure map tiles render correctly immediately and after transitions
      setTimeout(() => map.invalidateSize(), 50);
      setTimeout(() => map.invalidateSize(), 200);
      setTimeout(() => map.invalidateSize(), 450);
    }

    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
        circleRef.current = null;
        markerRef.current = null;
        routeLineRef.current = null;
      }
    };
  }, []);

  // Update geofence circle radius dynamically on slider change
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setRadius(val);
  };

  const handleSave = () => {
    const finalName = name.trim() || 'Destination Stop';
    onSave({
      id: initialAlarm?.id,
      name: finalName,
      lat: Number(lat),
      lng: Number(lng),
      radius: Number(radius) || 500,
      enabled: true,
      sound: Boolean(sound),
      vibration: Boolean(vibration),
      alarmTone: alarmTone || 'gentle_chime',
    });
  };

  return (
    <div id="configure-alarm-modal" className="fixed inset-0 z-50 bg-[#12060c] flex flex-col overflow-hidden">
      {/* Top Header matching Image 5 */}
      <header className="px-6 pt-5 pb-3 flex items-center justify-between bg-[#12060c] border-b border-[#2a0f1d] z-20">
        <button
          onClick={onClose}
          className="p-1 text-[#e8a3ba] hover:text-white transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="font-fraunces text-2xl text-[#ffa8bf] tracking-wide font-normal">
          Wakey Wakey
        </h1>

        {initialAlarm?.id && onDelete ? (
          <button
            onClick={() => onDelete(initialAlarm.id!)}
            className="p-1 text-[#e57373] hover:text-red-400 transition-colors"
            title="Delete alarm"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-6" />
        )}
      </header>

      {/* Top Map Preview Section */}
      <div className="relative w-full h-[36vh] bg-[#e5ebed] overflow-hidden">
        <div ref={miniMapContainerRef} className="w-full h-full" />
        
        {/* Floating destination badge & Search trigger over map */}
        <div className="absolute top-3 left-4 right-4 z-[400] flex items-center justify-between gap-2">
          <div className="bg-[#1b0a13]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#ffa8bf]/30 text-white font-spacemono text-[11px] flex items-center gap-1.5 shadow-lg">
            <MapPin className="w-3.5 h-3.5 text-[#ffa8bf]" />
            <span>Drag pin or search</span>
          </div>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="bg-[#ffa8bf] hover:bg-[#ffbacc] text-[#541229] font-fraunces font-semibold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Place</span>
          </button>
        </div>

        {/* Inline Search Overlay if opened */}
        {isSearchOpen && (
          <div className="absolute inset-0 z-[500] bg-[#15070e]/95 backdrop-blur-md p-4 flex flex-col">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#3e1327]">
              <div className="flex items-center gap-2 flex-1 bg-[#1b0a13] border border-[#3e1327] rounded-full px-3.5 py-2">
                <Search className="w-4 h-4 text-[#9e7a89] shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search station, street, or venue..."
                  className="w-full bg-transparent font-spacemono text-xs text-[#fce4ec] placeholder-[#7d5c6d] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 text-[#9e7a89] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-[#d69db3] hover:text-white rounded-full font-spacemono text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-2 divide-y divide-[#2a101f]">
              {isSearching ? (
                <div className="py-6 text-center text-xs font-spacemono text-[#9e7a89] flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#ffa8bf]/30 border-t-[#ffa8bf] rounded-full animate-spin" />
                  <span>Searching nearby places...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectLocation(item)}
                    className="w-full text-left py-2.5 px-2 hover:bg-[#2e1022] rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0 flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#ffa8bf] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-fraunces text-xs text-white truncate font-medium">
                          {item.name}
                        </div>
                        <div className="font-spacemono text-[10px] text-[#9e7a89] truncate">
                          {item.displayName}
                        </div>
                      </div>
                    </div>
                    {item.distance !== undefined && (
                      <span className="shrink-0 font-spacemono text-[9px] bg-[#2d0e1f] text-[#ffa8bf] px-1.5 py-0.5 rounded border border-[#481630]">
                        {formatDistance(item.distance)}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="py-6 text-center text-xs font-spacemono text-[#8f6d7d]">
                  No locations found. Try another search.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Configuration Sheet matching Image 5 */}
      <div className="flex-1 bg-[#1a0912] rounded-t-3xl -mt-4 z-20 px-6 pt-3 pb-6 flex flex-col justify-between overflow-y-auto border-t border-[#3e1327]/60 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]">
        <div className="space-y-4">
          {/* Sheet Handle */}
          <div className="w-12 h-1 bg-[#47192d] rounded-full mx-auto mb-2" />

          {/* Section Title & Subtitle */}
          <div>
            <h2 className="font-fraunces text-2xl font-semibold text-white tracking-tight">
              Configure Alarm
            </h2>
            <p className="font-spacemono text-xs text-[#b88c9f] mt-0.5">
              Set a location boundary to trigger an alert.
            </p>
          </div>

          {/* ALARM NAME Input Field */}
          <div>
            <label
              htmlFor="alarm-name-input"
              className="block font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3] mb-1.5"
            >
              ALARM NAME
            </label>
            <input
              id="alarm-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Arriving at Station"
              className="w-full bg-[#12060c] border border-[#3e1327] rounded-full px-5 py-3.5 text-sm font-spacemono text-[#fce4ec] placeholder-[#6d4d5d] focus:outline-none focus:border-[#ffa8bf] transition-colors"
            />
          </div>

          {/* TRIGGER RADIUS Slider Row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
                TRIGGER RADIUS
              </label>
              <div className="bg-[#311120] text-[#ffa8bf] font-spacemono text-xs px-3 py-1 rounded-full border border-[#521b34]">
                {formatDistance(radius)}
              </div>
            </div>

            <input
              type="range"
              min="100"
              max="5000"
              step="50"
              value={radius}
              onChange={handleRadiusChange}
              className="w-full h-1.5 bg-[#311120] rounded-lg appearance-none cursor-pointer accent-[#ffa8bf]"
            />

            <div className="flex justify-between font-spacemono text-[10px] text-[#85576a] mt-1">
              <span>100m</span>
              <span>5km</span>
            </div>
          </div>

          {/* TOGGLES matching Image 5 */}
          <div className="space-y-2.5 pt-1">
            {/* Sound Toggle */}
            <div className="bg-[#12060c] rounded-full px-5 py-3 flex items-center justify-between border border-[#3e1327]/80">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-[#d69db3]" />
                <span className="font-spacemono text-sm text-[#fce4ec]">Sound</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !sound;
                  setSound(next);
                  if (next) playChime();
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                  sound ? 'bg-[#ffa8bf]' : 'bg-[#2b0f1e]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full shadow transform transition-transform duration-200 ease-in-out ${
                    sound ? 'translate-x-5 bg-[#541229]' : 'translate-x-0 bg-[#6d4354]'
                  }`}
                />
              </button>
            </div>

            {/* Vibration Toggle */}
            <div className="bg-[#12060c] rounded-full px-5 py-3 flex items-center justify-between border border-[#3e1327]/80">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-[#d69db3]" />
                <span className="font-spacemono text-sm text-[#fce4ec]">Vibration</span>
              </div>
              <button
                type="button"
                onClick={() => setVibration(!vibration)}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                  vibration ? 'bg-[#ffa8bf]' : 'bg-[#2b0f1e]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full shadow transform transition-transform duration-200 ease-in-out ${
                    vibration ? 'translate-x-5 bg-[#541229]' : 'translate-x-0 bg-[#6d4354]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* SAVE ALARM Action Button matching Image 5 */}
        <div className="pt-4">
          <button
            id="btn-save-alarm"
            onClick={handleSave}
            className="w-full bg-[#ffa8bf] hover:bg-[#ffbacc] active:scale-[0.98] text-[#541229] font-fraunces font-bold text-lg uppercase tracking-wider py-3.5 px-6 rounded-full flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,168,191,0.35)] transition-all cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>SAVE ALARM</span>
          </button>
        </div>
      </div>
    </div>
  );
};
