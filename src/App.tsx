import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TabType, Alarm, UserLocation } from './types';
import { MapView } from './components/MapView';
import { AlarmsView } from './components/AlarmsView';
import { ConfigureAlarmModal } from './components/ConfigureAlarmModal';
import { AlarmTriggeredScreen } from './components/AlarmTriggeredScreen';
import { SettingsView } from './components/SettingsView';
import { NavigationBar } from './components/NavigationBar';
import { getDistanceInMeters, getDefaultStartingLocation } from './utils/geo';
import { stopAlarmSound } from './utils/audio';
import { initAuth, signInWithGoogle, signOutUser } from './lib/firebase';
import {
  subscribeToUserAlarms,
  saveAlarmToFirestore,
  toggleAlarmInFirestore,
  deleteAlarmFromFirestore,
  syncUserLocationToFirestore,
  logUserLocationToFirestore,
  getLocalAlarms,
  saveLocalAlarms,
  getDefaultAlarmTone,
  saveDefaultAlarmTone,
} from './services/alarmService';
import {
  getBatterySaverMode,
  saveBatterySaverMode,
  fetchLocationViaInternet,
} from './utils/internetLocation';
import { User } from 'firebase/auth';
import { CheckCircle2, AlertCircle, MapPin } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>(() => getLocalAlarms());
  const [defaultTone, setDefaultTone] = useState<string>(() => getDefaultAlarmTone());
  const [batterySaverMode, setBatterySaverMode] = useState<boolean>(() => getBatterySaverMode());
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isLoadingAlarms, setIsLoadingAlarms] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  };

  useEffect(() => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          setPermissionState(result.state);
          result.onchange = () => {
            setPermissionState(result.state);
          };
        }).catch((err) => {
          console.warn('navigator.permissions.query failed or is unsupported:', err);
          setPermissionState('unknown');
        });
      }
    } catch (e) {
      console.warn('navigator.permissions is not fully supported in this environment:', e);
      setPermissionState('unknown');
    }
  }, []);

  const handleSelectDefaultTone = (toneId: string) => {
    setDefaultTone(toneId);
    saveDefaultAlarmTone(toneId);
    const toneNames: Record<string, string> = {
      gentle_chime: 'Gentle Wake Arpeggio',
      station_bell: 'Transit Station Bell',
      subway_alert: 'Subway Arrival Chime',
      urgency_pulse: 'Urgent Transit Pulse',
    };
    showToast(`Default tone set to "${toneNames[toneId] || toneId}"`, 'info');
  };

  // User location (default: detected locale/India coordinate or GPS)
  const [userLocation, setUserLocation] = useState<UserLocation>(() => {
    const defaultCoords = getDefaultStartingLocation();
    return {
      lat: defaultCoords.lat,
      lng: defaultCoords.lng,
      timestamp: Date.now(),
      isSimulated: false,
    };
  });

  const [activeTab, setActiveTab] = useState<TabType>('alarms');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [newAlarmPreset, setNewAlarmPreset] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [triggeredAlarm, setTriggeredAlarm] = useState<Alarm | null>(null);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync real-time location to Firestore when user logs in or location changes
  useEffect(() => {
    if (currentUser?.uid && userLocation.lat && userLocation.lng) {
      syncUserLocationToFirestore(userLocation, currentUser.uid);
    }
  }, [currentUser?.uid, userLocation.lat, userLocation.lng]);

  // Real-time Firestore Alarms Subscription for Current User
  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoadingAlarms(false);
      return;
    }

    setIsLoadingAlarms(true);
    const unsubscribe = subscribeToUserAlarms(
      currentUser.uid,
      (fetchedAlarms) => {
        setAlarms((prev) => {
          if (fetchedAlarms && fetchedAlarms.length > 0) {
            saveLocalAlarms(fetchedAlarms);
            return fetchedAlarms;
          }
          return prev;
        });
        setIsLoadingAlarms(false);
      },
      (error) => {
        console.warn('Firestore subscription warning:', error.message);
        setIsLoadingAlarms(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Fetch location using Internet / IP geolocation endpoints (Battery Saver)
  const fetchInternetLocation = useCallback(async (silent = false) => {
    try {
      setIsRefreshingLocation(true);
      const result = await fetchLocationViaInternet();
      const newLoc: UserLocation = {
        lat: result.lat,
        lng: result.lng,
        accuracy: result.accuracy,
        city: result.city,
        country: result.country,
        source: 'internet',
        method: result.method,
        timestamp: result.timestamp,
        isSimulated: false,
      };
      setUserLocation(newLoc);
      if (!silent) {
        showToast(
          result.city
            ? `Location updated via ${result.method === 'wifi_network' ? 'Wi-Fi/Network' : 'Internet'} (${result.city})`
            : 'Location updated via Internet',
          'success'
        );
      }
      syncUserLocationToFirestore(newLoc, currentUser?.uid);
    } catch (err) {
      console.warn('Failed to fetch location via internet:', err);
      if (!silent) {
        showToast('Failed to update internet location', 'info');
      }
    } finally {
      setIsRefreshingLocation(false);
    }
  }, [currentUser?.uid]);

  // Toggle Battery Saver Mode
  const handleToggleBatterySaver = (enabled: boolean) => {
    setBatterySaverMode(enabled);
    saveBatterySaverMode(enabled);
    if (enabled) {
      showToast('Battery Saver ON: Location fetched via Internet (GPS off)', 'success');
      fetchInternetLocation(true);
    } else {
      showToast('High Precision GPS Mode restored', 'info');
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newLoc: UserLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              heading: pos.coords.heading || undefined,
              speed: pos.coords.speed || undefined,
              source: 'gps',
              timestamp: pos.timestamp,
              isSimulated: false,
            };
            setUserLocation(newLoc);
            syncUserLocationToFirestore(newLoc, currentUser?.uid);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    }
  };

  // Location Tracking Controller: Switches between Battery Saver (Internet IP) & High Accuracy GPS
  useEffect(() => {
    if (batterySaverMode) {
      // In Battery Saver Mode: GPS hardware is NOT activated
      // Location is fetched via Internet endpoints periodically (every 45s)
      fetchInternetLocation(true);
      const intervalId = setInterval(() => {
        fetchInternetLocation(true);
      }, 45000);

      return () => {
        clearInterval(intervalId);
      };
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc: UserLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading || undefined,
            speed: pos.coords.speed || undefined,
            source: 'gps',
            timestamp: pos.timestamp,
            isSimulated: false,
          };
          setUserLocation(newLoc);
          syncUserLocationToFirestore(newLoc, currentUser?.uid);
        },
        (err) => {
          console.warn('Geolocation access prompt warning:', err.message);
          // If GPS denied/times out, fallback to low power internet location
          fetchInternetLocation(true);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      let lastSyncTime = 0;
      let lastSyncLat = 0;
      let lastSyncLng = 0;

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc: UserLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading || undefined,
            speed: pos.coords.speed || undefined,
            source: 'gps',
            timestamp: pos.timestamp,
            isSimulated: false,
          };
          setUserLocation(newLoc);

          const now = Date.now();
          const distMoved = getDistanceInMeters(lastSyncLat, lastSyncLng, pos.coords.latitude, pos.coords.longitude);
          if (now - lastSyncTime > 15000 || distMoved > 25) {
            lastSyncTime = now;
            lastSyncLat = pos.coords.latitude;
            lastSyncLng = pos.coords.longitude;
            syncUserLocationToFirestore(newLoc, currentUser?.uid);
          }
        },
        (err) => {
          console.warn('Geolocation watch warning:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      fetchInternetLocation(true);
    }
  }, [batterySaverMode, currentUser?.uid, fetchInternetLocation]);

  // Live Geofencing Engine: Checks if user entered alarm radius
  useEffect(() => {
    if (triggeredAlarm) return; // already alerting
    if (!userLocation.lat || !userLocation.lng) return;

    const now = Date.now();
    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      if (alarm.snoozedUntil && alarm.snoozedUntil > now) continue;

      const dist = getDistanceInMeters(
        userLocation.lat,
        userLocation.lng,
        alarm.lat,
        alarm.lng
      );

      // Trigger if within radius.
      if (dist <= alarm.radius) {
        setTriggeredAlarm(alarm);
        break;
      }
    }
  }, [userLocation, alarms, triggeredAlarm]);

  // Alarm Management Handlers (Persisted to Firestore & Local Cache)
  const handleToggleAlarm = async (id: string) => {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
    const newStatus = !alarm.enabled;
    // Optimistic UI & local cache update
    setAlarms((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, enabled: newStatus } : a));
      saveLocalAlarms(updated);
      return updated;
    });
    try {
      await toggleAlarmInFirestore(id, newStatus);
    } catch (err) {
      console.warn('Failed to toggle alarm in Firestore:', err);
    }
  };

  const handleOpenNewAlarm = (preset?: { lat: number; lng: number; name: string }) => {
    setEditingAlarm(null);
    setNewAlarmPreset(preset || null);
    setIsConfiguring(true);
  };

  const handleSelectAlarm = (alarm: Alarm) => {
    setEditingAlarm(alarm);
    setNewAlarmPreset(null);
    setIsConfiguring(true);
  };

  const handleSaveAlarm = async (
    alarmData: Omit<Alarm, 'id' | 'createdAt' | 'userId'> & { id?: string; createdAt?: number }
  ) => {
    const finalId = alarmData.id || `alarm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrUpdatedAlarm: Alarm = {
      id: finalId,
      userId: currentUser?.uid || 'guest_user',
      name: alarmData.name,
      lat: alarmData.lat,
      lng: alarmData.lng,
      radius: alarmData.radius,
      enabled: alarmData.enabled,
      sound: alarmData.sound,
      vibration: alarmData.vibration,
      alarmTone: alarmData.alarmTone || (defaultTone as any) || 'gentle_chime',
      createdAt: alarmData.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // Instant optimistic UI & local storage persistence
    setAlarms((prev) => {
      const exists = prev.some((a) => a.id === finalId);
      const updated = exists
        ? prev.map((a) => (a.id === finalId ? newOrUpdatedAlarm : a))
        : [newOrUpdatedAlarm, ...prev];
      saveLocalAlarms(updated);
      return updated;
    });

    const isUpdate = Boolean(editingAlarm);
    showToast(
      isUpdate
        ? `Updated "${newOrUpdatedAlarm.name}"`
        : `Created alarm for "${newOrUpdatedAlarm.name}" (${newOrUpdatedAlarm.radius}m)`,
      'success'
    );

    setIsConfiguring(false);
    setEditingAlarm(null);
    setNewAlarmPreset(null);

    // Sync to Firestore in background
    try {
      await saveAlarmToFirestore(newOrUpdatedAlarm);
    } catch (err) {
      console.warn('Background sync to Firestore:', err);
    }
  };

  const handleDeleteAlarm = async (id: string) => {
    const deletedItem = alarms.find((a) => a.id === id);
    setAlarms((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveLocalAlarms(updated);
      return updated;
    });
    showToast(`Deleted "${deletedItem?.name || 'Alarm'}"`, 'info');
    setIsConfiguring(false);
    setEditingAlarm(null);
    try {
      await deleteAlarmFromFirestore(id);
    } catch (err) {
      console.warn('Failed to delete alarm from Firestore:', err);
    }
  };

  const handleDismissTriggeredAlarm = () => {
    stopAlarmSound();
    const currentTriggered = triggeredAlarm;
    if (currentTriggered) {
      const updatedAlarmId = currentTriggered.id;
      setAlarms((prev) => {
        const updated = prev.map((a) =>
          a.id === updatedAlarmId
            ? { ...a, enabled: false, lastTriggeredAt: Date.now(), snoozedUntil: null }
            : a
        );
        saveLocalAlarms(updated);
        return updated;
      });

      showToast(`Destination reached! Alarm dismissed for "${currentTriggered.name}".`, 'success');

      // Persist disabled state in Firestore
      if (updatedAlarmId && !updatedAlarmId.startsWith('test-')) {
        toggleAlarmInFirestore(updatedAlarmId, false).catch((err) =>
          console.warn('Failed to update dismissed alarm in Firestore:', err)
        );
      }
    }
    setTriggeredAlarm(null);
  };

  const handleSnoozeTriggeredAlarm = (minutes = 5) => {
    stopAlarmSound();
    const currentTriggered = triggeredAlarm;
    if (currentTriggered) {
      const snoozeUntil = Date.now() + minutes * 60 * 1000;
      setAlarms((prev) => {
        const updated = prev.map((a) =>
          a.id === currentTriggered.id ? { ...a, snoozedUntil: snoozeUntil } : a
        );
        saveLocalAlarms(updated);
        return updated;
      });
      showToast(`Alarm snoozed for ${minutes} mins`, 'info');
    }
    setTriggeredAlarm(null);
  };

  const handleTestTrigger = (alarm: Alarm) => {
    setTriggeredAlarm(alarm);
  };

  const handleSetUserLocation = (loc: { lat: number; lng: number; name?: string }) => {
    const newLoc: UserLocation = {
      lat: loc.lat,
      lng: loc.lng,
      accuracy: 25,
      city: loc.name || undefined,
      source: 'manual',
      method: 'manual',
      timestamp: Date.now(),
      isSimulated: false,
    };
    setUserLocation(newLoc);
    showToast(
      loc.name ? `Location calibrated to ${loc.name}` : 'Location calibrated',
      'success'
    );
    syncUserLocationToFirestore(newLoc, currentUser?.uid);
  };

  const handleRecenterUser = () => {
    if (batterySaverMode) {
      fetchInternetLocation(false);
      return;
    }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc: UserLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading || undefined,
            speed: pos.coords.speed || undefined,
            source: 'gps',
            timestamp: Date.now(),
            isSimulated: false,
          };
          setUserLocation(newLoc);
          showToast('Centered on GPS location', 'info');
          syncUserLocationToFirestore(newLoc, currentUser?.uid);
        },
        () => {
          showToast('Could not get GPS fix. Try battery saver mode.', 'info');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  const handleRequestLocation = () => {
    if (batterySaverMode) {
      fetchInternetLocation(false);
      return;
    }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: 'gps',
            timestamp: Date.now(),
          });
          setPermissionState('granted');
          showToast('Location tracking enabled', 'success');
        },
        (err) => {
          console.warn('Geolocation manually requested but failed:', err);
          showToast('Location request failed. Check settings.', 'info');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  return (
    <main className="w-full h-screen h-[100dvh] bg-[#12060c] flex flex-col overflow-hidden selection:bg-[#ffa8bf] selection:text-[#541229]">
      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="absolute top-5 left-4 right-4 md:left-auto md:right-8 z-[10001] pointer-events-none flex justify-center md:justify-end animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="bg-[#240d1a]/95 backdrop-blur-md border border-[#ffa8bf]/50 text-white px-4 py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex items-center gap-2.5 max-w-sm">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#ffa8bf] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#e57373] shrink-0" />
            )}
            <span className="font-spacemono text-xs text-[#fce4ec] truncate font-medium">
              {toastMessage.text}
            </span>
          </div>
        </div>
      )}

      {/* Permission Banner for WebViews/APK */}
      {(!userLocation.accuracy && permissionState !== 'granted' && !batterySaverMode) && (
        <div className="bg-[#541229] border-b border-[#ffa8bf]/30 p-3 md:p-4 z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#ffa8bf]/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#ffa8bf]" />
            </div>
            <div>
              <h3 className="font-fraunces text-sm text-white m-0">Location Required</h3>
              <p className="text-xs text-[#fce4ec]/70 font-spacemono m-0 mt-0.5">Allow background GPS access for alarms to work.</p>
            </div>
          </div>
          <button
            onClick={handleRequestLocation}
            className="w-full sm:w-auto px-4 py-2 bg-[#ffa8bf] hover:bg-[#ff8fae] active:scale-95 transition-all text-[#341121] font-spacemono text-xs font-bold uppercase tracking-wider rounded-full shadow-md"
          >
            Enable Access
          </button>
        </div>
      )}

      {/* Main Screen Body based on Active Tab */}
      <div className="flex-1 relative overflow-hidden flex flex-col h-full min-h-0">
        {activeTab === 'map' && (
          <MapView
            userLocation={userLocation}
            alarms={alarms}
            onOpenNewAlarm={handleOpenNewAlarm}
            onSelectAlarm={handleSelectAlarm}
            onRecenterUser={handleRecenterUser}
            batterySaverMode={batterySaverMode}
            onToggleBatterySaver={handleToggleBatterySaver}
            onSetUserLocation={handleSetUserLocation}
          />
        )}

        {activeTab === 'alarms' && (
          <AlarmsView
            alarms={alarms}
            onToggleAlarm={handleToggleAlarm}
            onSelectAlarm={handleSelectAlarm}
            onOpenNewAlarm={() => handleOpenNewAlarm()}
            onDeleteAlarm={handleDeleteAlarm}
            onTestTriggerAlarm={handleTestTrigger}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            defaultTone={defaultTone}
            onSelectDefaultTone={handleSelectDefaultTone}
            batterySaverMode={batterySaverMode}
            onToggleBatterySaver={handleToggleBatterySaver}
            userLocation={userLocation}
            onRefreshLocation={() => fetchInternetLocation(false)}
            isRefreshingLocation={isRefreshingLocation}
            onSetUserLocation={handleSetUserLocation}
            onTriggerTestAlarm={() => {
              if (alarms.length > 0) {
                handleTestTrigger({
                  ...alarms[0],
                  alarmTone: (defaultTone as any) || alarms[0].alarmTone || 'gentle_chime',
                });
              } else {
                handleTestTrigger({
                  id: 'test-preview-alarm',
                  userId: currentUser?.uid || '',
                  name: 'Grand Central Terminal',
                  lat: userLocation.lat + 0.005,
                  lng: userLocation.lng + 0.005,
                  radius: 500,
                  enabled: true,
                  sound: true,
                  vibration: true,
                  alarmTone: (defaultTone as any) || 'gentle_chime',
                  createdAt: Date.now(),
                });
              }
            }}
          />
        )}
      </div>

      {/* Bottom Navigation Bar (Map, Alarms, Settings) */}
      <NavigationBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        activeAlarmsCount={alarms.filter((a) => a.enabled).length}
        onOpenNewAlarm={() => handleOpenNewAlarm()}
        userLocation={userLocation}
      />

      {/* Modal: Configure Alarm */}
      {isConfiguring && (
        <ConfigureAlarmModal
          initialAlarm={
            editingAlarm ||
            (newAlarmPreset
              ? {
                  name: newAlarmPreset.name,
                  lat: newAlarmPreset.lat,
                  lng: newAlarmPreset.lng,
                  radius: 500,
                  sound: true,
                  vibration: true,
                  alarmTone: defaultTone as any,
                }
              : null)
          }
          userLocation={userLocation}
          defaultTone={defaultTone}
          onSave={handleSaveAlarm}
          onDelete={editingAlarm ? handleDeleteAlarm : undefined}
          onClose={() => {
            setIsConfiguring(false);
            setEditingAlarm(null);
            setNewAlarmPreset(null);
          }}
        />
      )}

      {/* Fullscreen Alert: Alarm Triggered */}
      {triggeredAlarm && (
        <AlarmTriggeredScreen
          alarm={triggeredAlarm}
          userLocation={userLocation}
          onDismiss={handleDismissTriggeredAlarm}
          onSnooze={handleSnoozeTriggeredAlarm}
        />
      )}
    </main>
  );
}
