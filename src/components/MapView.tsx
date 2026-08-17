import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Search, Mic, Plus, Crosshair, MapPin, X, BellPlus, BatteryCharging, Wifi, Navigation } from 'lucide-react';
import { Alarm, UserLocation, LocationSearchResult } from '../types';
import { searchLocations, reverseGeocode, getDistanceInMeters, formatDistance } from '../utils/geo';

interface MapViewProps {
  userLocation: UserLocation;
  alarms: Alarm[];
  onOpenNewAlarm: (preset?: { lat: number; lng: number; name: string }) => void;
  onSelectAlarm: (alarm: Alarm) => void;
  onRecenterUser: () => void;
  batterySaverMode?: boolean;
  onToggleBatterySaver?: (enabled: boolean) => void;
  onSetUserLocation?: (loc: { lat: number; lng: number; name?: string }) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  userLocation,
  alarms,
  onOpenNewAlarm,
  onSelectAlarm,
  onRecenterUser,
  batterySaverMode = false,
  onToggleBatterySaver,
  onSetUserLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const selectedPinMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [searchResults, setSearchResults] = useState<(LocationSearchResult & { distance?: number })[]>([]);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [selectedTapLocation, setSelectedTapLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
    displayName?: string;
    distance?: number;
  } | null>(null);

  // Search debounce effect with nearby GPS bias
  useEffect(() => {
    let isCancelled = false;

    if (!searchQuery.trim()) {
      // If focused with empty query, load nearby suggestions based on user GPS
      if (isSearchFocused) {
        setIsLoadingResults(true);
        searchLocations('', userLocation).then((suggestions) => {
          if (!isCancelled) {
            setSearchResults(suggestions);
            setIsLoadingResults(false);
          }
        });
      } else {
        setSearchResults([]);
      }
      return;
    }

    setIsLoadingResults(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(searchQuery, userLocation);
        if (!isCancelled) {
          setSearchResults(results);
          setIsLoadingResults(false);
        }
      } catch (e) {
        if (!isCancelled) {
          setIsLoadingResults(false);
        }
      }
    }, 280);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isSearchFocused, userLocation.lat, userLocation.lng]);

  // Initialize Leaflet Map with smooth touch controls
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        bounceAtZoomLimits: false,
      });

      // Standard crisp OSM tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      // Layers for dynamic markers and radius circles
      markersLayerRef.current = L.layerGroup().addTo(map);
      circlesLayerRef.current = L.layerGroup().addTo(map);

      // Touch & Tap Handling: Place a candidate pin when deliberately clicking map
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const dist = getDistanceInMeters(userLocation.lat, userLocation.lng, lat, lng);
        
        setSelectedTapLocation({
          lat,
          lng,
          name: 'Locating place...',
          displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          distance: dist,
        });

        // Reverse geocode to get real street address or place name
        const geoInfo = await reverseGeocode(lat, lng);
        setSelectedTapLocation((prev) => {
          if (!prev || prev.lat !== lat || prev.lng !== lng) return prev;
          return {
            ...prev,
            name: geoInfo.name,
            displayName: geoInfo.displayName,
          };
        });
      });

      mapInstanceRef.current = map;

      // Invalidate size shortly after mount to ensure perfect tile layout
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    // ResizeObserver to automatically resize map whenever container or viewport shifts
    const container = mapContainerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        userMarkerRef.current = null;
        selectedPinMarkerRef.current = null;
        markersLayerRef.current = null;
        circlesLayerRef.current = null;
      }
    };
  }, []);

  // Update candidate selected pin when user taps anywhere on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedPinMarkerRef.current) {
      map.removeLayer(selectedPinMarkerRef.current);
      selectedPinMarkerRef.current = null;
    }

    if (selectedTapLocation) {
      const pinIcon = L.divIcon({
        className: 'selected-tap-pin',
        html: `
          <div class="relative flex flex-col items-center animate-bounce">
            <div class="w-8 h-8 rounded-full bg-[#ffa8bf] border-2 border-white shadow-xl flex items-center justify-center text-[#541229]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-[#ffa8bf] -mt-0.5"></div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      const marker = L.marker([selectedTapLocation.lat, selectedTapLocation.lng], {
        icon: pinIcon,
        zIndexOffset: 800,
      }).addTo(map);

      selectedPinMarkerRef.current = marker;
    }
  }, [selectedTapLocation]);

  // Update user location marker on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const isInternetMode = batterySaverMode || userLocation.source === 'internet';

    const userIcon = L.divIcon({
      className: 'user-loc-marker',
      html: isInternetMode
        ? `
        <div class="relative flex items-center justify-center w-9 h-9">
          <div class="absolute w-9 h-9 rounded-full bg-[#69f0ae]/25 animate-ping"></div>
          <div class="relative w-5.5 h-5.5 rounded-full bg-[#0a1e11] border-2 border-[#69f0ae] flex items-center justify-center shadow-lg">
            <div class="w-2.5 h-2.5 rounded-full bg-[#69f0ae]"></div>
          </div>
        </div>
      `
        : `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 rounded-full bg-[#ffa8bf]/30 animate-ping"></div>
          <div class="relative w-5 h-5 rounded-full bg-white border-[3px] border-black flex items-center justify-center shadow-lg">
            <div class="w-2.5 h-2.5 rounded-full bg-[#f06292]"></div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      userMarkerRef.current.setIcon(userIcon);
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    }
  }, [userLocation.lat, userLocation.lng, userLocation.source, batterySaverMode]);

  // Update Alarms and Geofence Circles on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const circlesLayer = circlesLayerRef.current;
    if (!map || !markersLayer || !circlesLayer) return;

    markersLayer.clearLayers();
    circlesLayer.clearLayers();

    alarms.forEach((alarm) => {
      if (!alarm.enabled) return;

      // Geofence Circle
      const circle = L.circle([alarm.lat, alarm.lng], {
        radius: alarm.radius,
        color: '#e06282',
        weight: 1.5,
        fillColor: '#ffa8bf',
        fillOpacity: 0.22,
        dashArray: '4, 4',
      });
      circle.addTo(circlesLayer);

      // Destination Pin
      const pinIcon = L.divIcon({
        className: 'alarm-pin-marker',
        html: `
          <div class="relative group cursor-pointer transform -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform">
            <div class="w-8 h-10 flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-[#f88da6] border-2 border-white shadow-md flex items-center justify-center text-[#701533]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                  <path d="M3 6h18"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </div>
              <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-[#f88da6] -mt-0.5"></div>
            </div>
            <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1b0a13] text-white text-[11px] font-fraunces font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#ffa8bf]/30">
              ${alarm.name} (${alarm.radius}m)
            </div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      const marker = L.marker([alarm.lat, alarm.lng], { icon: pinIcon, zIndexOffset: 500 });
      marker.on('click', (e: L.LeafletMouseEvent) => {
        // Critical: Stop propagation so map click doesn't fire and overwrite selection
        L.DomEvent.stopPropagation(e);
        setSelectedTapLocation(null);
        onSelectAlarm(alarm);
      });
      marker.addTo(markersLayer);
    });
  }, [alarms, onSelectAlarm]);

  // Handle Search Input Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectSearchResult = (result: LocationSearchResult & { distance?: number }) => {
    setSearchQuery(result.name);
    setIsSearchFocused(false);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([result.lat, result.lng], 15, { duration: 1.2 });
    }

    const dist =
      result.distance ??
      getDistanceInMeters(userLocation.lat, userLocation.lng, result.lat, result.lng);

    setSelectedTapLocation({
      lat: result.lat,
      lng: result.lng,
      name: result.name,
      distance: dist,
    });
  };

  // Voice Search feature using Web Speech API if supported
  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback voice demo
      setIsListeningVoice(true);
      setTimeout(() => {
        setSearchQuery('Grand Central');
        setIsListeningVoice(false);
        setIsSearchFocused(true);
      }, 1200);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      setIsListeningVoice(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListeningVoice(false);
        setIsSearchFocused(true);
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 0.8 });
    }
    onRecenterUser();
  };

  const handleConfirmAddAlarmFromPin = () => {
    if (!selectedTapLocation) {
      onOpenNewAlarm();
      return;
    }
    onOpenNewAlarm({
      lat: selectedTapLocation.lat,
      lng: selectedTapLocation.lng,
      name: selectedTapLocation.name,
    });
    setSelectedTapLocation(null);
  };

  return (
    <div id="map-screen-view" className="relative w-full h-full flex flex-col overflow-hidden select-none">
      {/* Top Floating Search Capsule Bar - Clean overlay on map */}
      <div 
        className="absolute top-3 left-4 right-4 z-[1000] pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center bg-[#15070e]/95 backdrop-blur-md rounded-full px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.6)] border border-[#3e1327]/70">
          <Search className="w-5 h-5 text-[#9e7a89] mr-3 shrink-0" />
          <input
            id="destination-search-input"
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length > 0) {
                handleSelectSearchResult(searchResults[0]);
              } else if (e.key === 'Escape') {
                setIsSearchFocused(false);
              }
            }}
            placeholder="Search nearby station, street, or venue..."
            className="w-full bg-transparent font-spacemono text-sm text-[#fce4ec] placeholder-[#7d5c6d] focus:outline-none tracking-wide"
          />

          {isLoadingResults && (
            <div className="w-4 h-4 mr-2 border-2 border-[#ffa8bf]/30 border-t-[#ffa8bf] rounded-full animate-spin shrink-0" />
          )}

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="p-1 mr-1 text-[#9e7a89] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            id="voice-search-button"
            onClick={handleVoiceSearch}
            title="Voice search destination"
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              isListeningVoice
                ? 'bg-[#ffa8bf] text-[#63132c] animate-pulse'
                : 'text-[#d69db3] hover:text-white'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Power Mode Pill */}
        {!isSearchFocused && (
          <div className="mt-2 flex items-center justify-between px-1">
            <button
              id="map-battery-mode-pill"
              type="button"
              onClick={() => onToggleBatterySaver?.(!batterySaverMode)}
              className={`backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-spacemono flex items-center gap-1.5 shadow-md transition-all cursor-pointer border ${
                batterySaverMode
                  ? 'bg-[#122818]/90 border-[#2e7d32]/80 text-[#69f0ae] hover:bg-[#183921]'
                  : 'bg-[#240a17]/90 border-[#ffa8bf]/30 text-[#ffa8bf] hover:bg-[#340f22]'
              }`}
              title={batterySaverMode ? 'Battery Saver Active: Tap to switch to High Precision GPS' : 'GPS Active: Tap to switch to Battery Saver (Internet)'}
            >
              <span
                className={`w-2 h-2 rounded-full inline-block animate-pulse ${
                  batterySaverMode ? 'bg-[#69f0ae]' : 'bg-[#ffa8bf]'
                }`}
              />
              {batterySaverMode ? (
                <>
                  <BatteryCharging className="w-3.5 h-3.5" />
                  <span>Battery Saver (Internet)</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>GPS Precision</span>
                </>
              )}
            </button>

            {userLocation.city && (
              <span className="font-spacemono text-[11px] text-[#fce4ec]/70 bg-[#12060c]/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-[#3e1327]/60">
                {userLocation.city}
              </span>
            )}
          </div>
        )}

        {/* Search Results / Nearby Suggestions Dropdown */}
        {isSearchFocused && (
          <div className="mt-2 bg-[#1b0a13] border border-[#3e1327] rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
            <div className="px-4 py-2 bg-[#14060d] border-b border-[#2a101f] flex items-center justify-between">
              <span className="font-spacemono text-[10px] text-[#9e7a89] uppercase tracking-wider">
                {searchQuery.trim() ? 'Search Results (Biased to Nearby)' : 'Nearby Destinations & Transit'}
              </span>
              <button
                onClick={() => setIsSearchFocused(false)}
                className="text-[11px] font-spacemono text-[#d69db3] hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="divide-y divide-[#2a101f]">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-4 py-3 hover:bg-[#2e1022] transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#2e1022] group-hover:bg-[#451630] flex items-center justify-center text-[#ffa8bf] shrink-0 mt-0.5 transition-colors">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-fraunces text-sm text-[#fce4ec] truncate font-medium group-hover:text-[#ffa8bf] transition-colors">
                          {item.name}
                        </div>
                        <div className="font-spacemono text-[11px] text-[#9e7a89] truncate">
                          {item.displayName}
                        </div>
                      </div>
                    </div>

                    {item.distance !== undefined && (
                      <span className="shrink-0 font-spacemono text-[10px] bg-[#2d0e1f] text-[#ffa8bf] px-2 py-0.5 rounded-full border border-[#481630]">
                        {formatDistance(item.distance)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : !isLoadingResults ? (
              <div className="p-4 text-center">
                <p className="font-fraunces text-sm text-[#fce4ec]">No locations found</p>
                <p className="font-spacemono text-[11px] text-[#8f6d7d] mt-1">
                  Try typing a subway station, street address, or tap on the map.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Main Interactive Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full clean-map" />

      {/* Floating Selected Pin Callout Card */}
      {selectedTapLocation && (
        <div 
          className="absolute bottom-20 left-4 right-4 z-[1000] animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1b0a13]/95 backdrop-blur-md border border-[#ffa8bf]/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#3b1224] flex items-center justify-center text-[#ffa8bf] shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-fraunces text-sm text-white truncate font-medium">
                  {selectedTapLocation.name}
                </div>
                {selectedTapLocation.distance !== undefined && (
                  <div className="font-spacemono text-[11px] text-[#b88c9f]">
                    {formatDistance(selectedTapLocation.distance)} away from you
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setSelectedTapLocation(null)}
                className="p-1.5 text-[#9e7a89] hover:text-white rounded-full cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
              {onSetUserLocation && (
                <button
                  type="button"
                  onClick={() => {
                    onSetUserLocation({
                      lat: selectedTapLocation.lat,
                      lng: selectedTapLocation.lng,
                      name: selectedTapLocation.name,
                    });
                    setSelectedTapLocation(null);
                  }}
                  className="bg-[#240a17] hover:bg-[#381125] text-[#ffa8bf] border border-[#ffa8bf]/30 font-spacemono text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95"
                  title="Calibrate your current starting location to this spot"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Set My Loc</span>
                </button>
              )}
              <button
                onClick={handleConfirmAddAlarmFromPin}
                className="bg-[#ffa8bf] hover:bg-[#ffbacc] text-[#541229] font-fraunces font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
              >
                <BellPlus className="w-3.5 h-3.5" />
                <span>Set Alarm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Buttons */}
      <div 
        className="absolute bottom-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none"
      >
        {/* "+ New Alarm" Pill Button */}
        <button
          id="btn-new-alarm-map"
          onClick={() => {
            if (selectedTapLocation) {
              handleConfirmAddAlarmFromPin();
            } else {
              onOpenNewAlarm();
            }
          }}
          className="pointer-events-auto flex items-center gap-2 bg-[#541229] hover:bg-[#6c1735] active:scale-95 text-[#fce4ec] font-fraunces text-lg px-6 py-3.5 rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.55)] border border-[#8a2448]/40 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5 text-[#ffa8bf]" strokeWidth={2.5} />
          <span>New Alarm</span>
        </button>

        {/* My Location / GPS Recenter Circular Button */}
        <button
          id="btn-recenter-map"
          onClick={handleRecenter}
          title="Center on my location"
          className="pointer-events-auto w-13 h-13 rounded-full bg-[#1b0a13] hover:bg-[#2d1021] active:scale-95 text-[#ffa8bf] flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.6)] border border-[#3e1327] transition-all cursor-pointer"
        >
          <Crosshair className="w-6 h-6" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};

