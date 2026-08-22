import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Play, CheckCircle2, Check, Volume2, BatteryCharging, Radio, RefreshCw, Wifi, Navigation, MapPin, Search, Crosshair, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { playAlarmSequence } from '../utils/audio';
import { UserLocation, LocationSearchResult } from '../types';
import { searchLocations } from '../utils/geo';
import AlarmMonitor from '../utils/nativeAlarmMonitor';

interface SettingsViewProps {
  defaultTone: string;
  onSelectDefaultTone: (toneId: string) => void;
  batterySaverMode: boolean;
  onToggleBatterySaver: (enabled: boolean) => void;
  userLocation: UserLocation;
  onRefreshLocation?: () => void;
  isRefreshingLocation?: boolean;
  onSetUserLocation?: (loc: { lat: number; lng: number; name?: string }) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  defaultTone,
  onSelectDefaultTone,
  batterySaverMode,
  onToggleBatterySaver,
  userLocation,
  onRefreshLocation,
  isRefreshingLocation = false,
  onSetUserLocation,
}) => {
  const [playingToneId, setPlayingToneId] = useState<string | null>(null);
  const [calibrateQuery, setCalibrateQuery] = useState('');
  const [calibrateResults, setCalibrateResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingCalibrate, setIsSearchingCalibrate] = useState(false);
  const [showCalibrateInput, setShowCalibrateInput] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const [backgroundLocationGranted, setBackgroundLocationGranted] = useState<boolean | null>(null);
  const [isRequestingBackgroundLocation, setIsRequestingBackgroundLocation] = useState(false);

  // Check current "Allow all the time" location permission state on mount (native only)
  useEffect(() => {
    if (!isNative) return;
    AlarmMonitor.hasBackgroundLocationPermission()
      .then(({ granted }) => setBackgroundLocationGranted(granted))
      .catch(() => setBackgroundLocationGranted(null));
  }, [isNative]);

  const handleEnableBackgroundAlarms = async () => {
    setIsRequestingBackgroundLocation(true);
    try {
      const { granted } = await AlarmMonitor.requestBackgroundLocationPermission();
      setBackgroundLocationGranted(granted);
      if (!granted) {
        // Android 11+ usually won't offer "Allow all the time" from the
        // in-app dialog at all — the only way to grant it is through the
        // system settings page for this app.
        await AlarmMonitor.openLocationSettings();
      }
    } catch (err) {
      console.error('Failed to request background location permission:', err);
    } finally {
      setIsRequestingBackgroundLocation(false);
    }
  };

  // Search for calibration places
  useEffect(() => {
    if (!calibrateQuery.trim() || calibrateQuery.length < 2) {
      setCalibrateResults([]);
      return;
    }

    setIsSearchingCalibrate(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(calibrateQuery, userLocation);
        setCalibrateResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingCalibrate(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [calibrateQuery, userLocation]);

  const tones = [
    { id: 'gentle_chime', name: 'Gentle Wake Arpeggio', desc: 'Soft rising chime chord (C-E-G-C)' },
    { id: 'station_bell', name: 'Transit Station Bell', desc: 'Classic two-tone transit bell' },
    { id: 'subway_alert', name: 'Subway Arrival Chime', desc: 'Harmonic 3-tone metro alert' },
    { id: 'urgency_pulse', name: 'Urgent Transit Pulse', desc: 'Sharp rhythmic warning alert' },
  ];

  const handleSelectTone = (toneId: string) => {
    onSelectDefaultTone(toneId);
    setPlayingToneId(toneId);
    playAlarmSequence(toneId, 0.45);
    setTimeout(() => {
      setPlayingToneId(null);
    }, 1200);
  };

  return (
    <div
      id="settings-screen-view"
      className="relative w-full h-full flex flex-col bg-[#12060c] text-white overflow-y-auto overflow-x-hidden pb-8 max-w-full"
    >
      {/* Top Brand Header */}
      <header className="px-5 sm:px-6 pt-4 pb-3 border-b border-[#280c1b]/60 shrink-0 flex items-center gap-2.5">
        <img
          src="/icon.svg"
          alt="Wakey Wakey Logo"
          className="w-7 h-7 rounded-lg shadow-sm border border-[#ffa8bf]/30"
        />
        <h1 className="font-fraunces text-2xl text-[#ffa8bf] tracking-wide font-normal">
          Wakey Wakey
        </h1>
      </header>

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-5 space-y-6">
        <div>
          <h2 className="font-fraunces text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Settings
          </h2>
          <p className="font-spacemono text-xs text-[#b88c9f] mt-0.5">
            Power modes, alarm tones, and diagnostic controls.
          </p>
        </div>

        {/* Battery Saving & Location Provider Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
              LOCATION & POWER MANAGEMENT
            </label>
            <span
              className={`font-spacemono text-[10px] px-2.5 py-0.5 rounded-full border ${
                batterySaverMode
                  ? 'bg-[#153421] text-[#69f0ae] border-[#2e7d32]/60'
                  : 'bg-[#3b1224] text-[#ffa8bf] border-[#ffa8bf]/30'
              }`}
            >
              {batterySaverMode ? 'Battery Saver Active' : 'High Accuracy GPS'}
            </span>
          </div>

          {/* Master Toggle Card */}
          <div className="bg-[#1a0a13] border border-[#3e1327] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
                    batterySaverMode
                      ? 'bg-[#14331e] border-[#2e7d32] text-[#69f0ae]'
                      : 'bg-[#2b0e1d] border-[#4a1832] text-[#d69db3]'
                  }`}
                >
                  <BatteryCharging className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="font-fraunces text-base sm:text-lg text-white font-medium">
                    Battery Saver Mode
                  </div>
                  <div className="font-spacemono text-xs text-[#a88294] mt-0.5">
                    {batterySaverMode
                      ? 'Location fetched via Internet / Network. GPS hardware is OFF.'
                      : 'Uses device GPS satellite chip for meter-accurate tracking.'}
                  </div>
                </div>
              </div>

              {/* iOS style Toggle Switch */}
              <button
                id="toggle-battery-saver-mode"
                type="button"
                role="switch"
                aria-checked={batterySaverMode}
                onClick={() => onToggleBatterySaver(!batterySaverMode)}
                className={`w-13 h-7.5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 border ${
                  batterySaverMode
                    ? 'bg-[#2e7d32] border-[#4caf50]'
                    : 'bg-[#2b0f1e] border-[#4a1832]'
                }`}
                title={batterySaverMode ? 'Disable Battery Saver' : 'Enable Battery Saver'}
              >
                <div
                  className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    batterySaverMode ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Mode Comparison Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Option 1: Battery Saver */}
              <div
                onClick={() => onToggleBatterySaver(true)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  batterySaverMode
                    ? 'bg-[#172e1e] border-[#4caf50] shadow-sm'
                    : 'bg-[#14060e] border-[#2c0e1e] hover:border-[#42152d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-[#69f0ae]" />
                    <span className="font-fraunces text-sm font-medium text-white">
                      Internet / Network
                    </span>
                  </div>
                  {batterySaverMode && (
                    <span className="font-spacemono text-[9px] bg-[#2e7d32] text-white px-2 py-0.5 rounded-full font-bold">
                      SELECTED
                    </span>
                  )}
                </div>
                <p className="font-spacemono text-[11px] text-[#9eb8a7] mt-2 leading-relaxed">
                  Fetches approximate coordinates via IP/Internet. Zero GPS sensor power consumption.
                </p>
              </div>

              {/* Option 2: High Precision GPS */}
              <div
                onClick={() => onToggleBatterySaver(false)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  !batterySaverMode
                    ? 'bg-[#2d0e20] border-[#ffa8bf] shadow-sm'
                    : 'bg-[#14060e] border-[#2c0e1e] hover:border-[#42152d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#ffa8bf]" />
                    <span className="font-fraunces text-sm font-medium text-white">
                      High Precision GPS
                    </span>
                  </div>
                  {!batterySaverMode && (
                    <span className="font-spacemono text-[9px] bg-[#ffa8bf] text-[#541229] px-2 py-0.5 rounded-full font-bold">
                      SELECTED
                    </span>
                  )}
                </div>
                <p className="font-spacemono text-[11px] text-[#b88c9f] mt-2 leading-relaxed">
                  Direct satellite positioning with live sensor feedback. Ideal for fast trains/metros.
                </p>
              </div>
            </div>

            {/* Live Diagnostics Card */}
            <div className="bg-[#12050b] border border-[#2b0d1c] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 min-w-0">
                <div className="font-spacemono text-[10px] uppercase tracking-wider text-[#8a5d72]">
                  Current Source & Coordinates
                </div>
                <div className="font-spacemono text-xs text-[#fce4ec] flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#ffa8bf]">
                    {userLocation.source === 'internet' || batterySaverMode ? 'Internet (Network)' : 'GPS Hardware'}
                  </span>
                  <span className="text-[#6d4354]">•</span>
                  <span>{userLocation.lat ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Detecting...'}</span>
                  {userLocation.city && (
                    <span className="text-[#69f0ae] bg-[#122b1a] px-2 py-0.5 rounded-full border border-[#2e7d32]/40 text-[10px]">
                      {userLocation.city}
                    </span>
                  )}
                  {userLocation.accuracy && (
                    <span className="text-[#a88294]">
                      (±{Math.round(userLocation.accuracy)}m)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onRefreshLocation && (
                  <button
                    type="button"
                    onClick={onRefreshLocation}
                    disabled={isRefreshingLocation}
                    className="bg-[#2a0e1f] hover:bg-[#3d142d] text-[#ffa8bf] border border-[#ffa8bf]/30 font-spacemono text-xs px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    title="Force fetch fresh location"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingLocation ? 'Fetching...' : 'Refresh'}</span>
                  </button>
                )}

                {onSetUserLocation && (
                  <button
                    type="button"
                    onClick={() => setShowCalibrateInput(!showCalibrateInput)}
                    className="bg-[#1e0d16] hover:bg-[#2d1221] text-[#fce4ec] border border-[#4a1832] font-spacemono text-xs px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                    title="Manually set or search your starting station/location"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#ffa8bf]" />
                    <span>{showCalibrateInput ? 'Hide Search' : 'Calibrate Location'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Location Calibration Station Search Drawer */}
            {showCalibrateInput && onSetUserLocation && (
              <div className="bg-[#12050b] border border-[#ffa8bf]/30 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="font-spacemono text-xs text-[#fce4ec] font-medium flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-[#ffa8bf]" />
                    <span>Search Current Station / City</span>
                  </div>
                  <span className="font-spacemono text-[10px] text-[#b88c9f]">
                    Overrides ISP/IP inaccuracies
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-[#9e7a89] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={calibrateQuery}
                    onChange={(e) => setCalibrateQuery(e.target.value)}
                    placeholder="Search your starting station or neighborhood..."
                    className="w-full bg-[#1b0a13] border border-[#3e1327] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#8a5d72] focus:outline-none focus:border-[#ffa8bf]/70"
                  />
                  {isSearchingCalibrate && (
                    <RefreshCw className="w-4 h-4 text-[#ffa8bf] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {calibrateResults.length > 0 && (
                  <div className="divide-y divide-[#2a101f] bg-[#1a0912] border border-[#3e1327] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {calibrateResults.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => {
                          onSetUserLocation({
                            lat: place.lat,
                            lng: place.lng,
                            name: place.name,
                          });
                          setShowCalibrateInput(false);
                          setCalibrateQuery('');
                          setCalibrateResults([]);
                        }}
                        className="w-full text-left p-2.5 hover:bg-[#2e1022] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="font-fraunces text-xs text-white group-hover:text-[#ffa8bf] truncate">
                            {place.name}
                          </div>
                          <div className="font-spacemono text-[10px] text-[#9e7a89] truncate">
                            {place.displayName}
                          </div>
                        </div>
                        <span className="font-spacemono text-[10px] bg-[#541229] text-[#ffa8bf] px-2 py-0.5 rounded-md shrink-0">
                          Set Here
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Background Alarms Permission Section (native Android only) */}
        {isNative && (
          <section className="space-y-3">
            <label className="block font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
              BACKGROUND ALARMS
            </label>
            <div className="bg-[#1a0a13] border border-[#3e1327] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    backgroundLocationGranted
                      ? 'bg-[#14331e] border-[#2e7d32] text-[#69f0ae]'
                      : 'bg-[#2b0e1d] border-[#4a1832] text-[#d69db3]'
                  }`}
                >
                  {backgroundLocationGranted ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : (
                    <ShieldAlert className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-fraunces text-base sm:text-lg text-white font-medium">
                    {backgroundLocationGranted ? 'Background Alarms Enabled' : 'Enable Background Alarms'}
                  </div>
                  <div className="font-spacemono text-xs text-[#a88294] mt-0.5 leading-relaxed">
                    {backgroundLocationGranted
                      ? 'Alarms can wake you up even while the app is closed or your phone is locked.'
                      : 'Without "Allow all the time" location access, alarms only fire while this app is open. Enable it so you can safely close the app and still get woken up.'}
                  </div>
                </div>
              </div>

              {!backgroundLocationGranted && (
                <button
                  type="button"
                  onClick={handleEnableBackgroundAlarms}
                  disabled={isRequestingBackgroundLocation}
                  className="w-full bg-[#701533] hover:bg-[#881d40] text-[#fce4ec] font-fraunces text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-2 border border-[#ffa8bf]/30 transition-all cursor-pointer disabled:opacity-60"
                >
                  <ExternalLink className="w-4 h-4 text-[#ffa8bf]" />
                  <span>{isRequestingBackgroundLocation ? 'Requesting...' : 'Enable Background Alarms'}</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Alarm Sounds Section with Persistent Default Selection */}
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
              DEFAULT ALARM TONE
            </label>
            <span className="font-spacemono text-[10px] text-[#ffa8bf] flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              Tap to preview & select
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tones.map((tone) => {
              const isSelected = defaultTone === tone.id;
              const isPlaying = playingToneId === tone.id;

              return (
                <div
                  key={tone.id}
                  id={`tone-option-${tone.id}`}
                  onClick={() => handleSelectTone(tone.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 max-w-full ${
                    isSelected
                      ? 'bg-[#2f1022] border-[#ffa8bf] shadow-[0_0_18px_rgba(255,168,191,0.22)]'
                      : 'bg-[#180911] border-[#311120] hover:border-[#4a182f] hover:bg-[#200b17]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#ffa8bf] text-[#541229]'
                          : 'bg-[#2a0e1e] text-[#6d4354] border border-[#3e1327]'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-fraunces text-sm sm:text-base text-white truncate">
                          {tone.name}
                        </span>
                        {isSelected && (
                          <span className="font-spacemono text-[9px] bg-[#ffa8bf]/20 text-[#ffa8bf] px-1.5 py-0.2 rounded-full border border-[#ffa8bf]/40">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="font-spacemono text-[11px] text-[#a88294] mt-0.5 truncate">
                        {tone.desc}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTone(tone.id);
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      isPlaying
                        ? 'bg-[#ffa8bf] text-[#541229] scale-105 shadow-md'
                        : isSelected
                        ? 'bg-[#521735] text-[#ffa8bf] hover:bg-[#681e44]'
                        : 'bg-[#311120] text-[#c48d9f] hover:bg-[#46172e] hover:text-white'
                    }`}
                    title="Play sound sample"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ml-0.5 ${isPlaying ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* About App */}
        <section className="bg-[#160810] border border-[#2e0e1e] rounded-2xl p-4 flex flex-col justify-center text-center space-y-1">
          <h3 className="font-fraunces text-base sm:text-lg text-[#ffa8bf]">Wakey Wakey</h3>
          <p className="font-spacemono text-[11px] sm:text-xs text-[#8f6d7d]">
            Destination Arrival Alarms with GPS & Low-Power Internet Tracking.
          </p>
        </section>
      </div>
    </div>
  );
};

