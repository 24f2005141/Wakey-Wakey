import React, { useState, useEffect, useRef } from 'react';
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
  logUserLocationToFirestore,
  getLocalAlarms,
  saveLocalAlarms,
} from './services/alarmService';
import { User } from 'firebase/auth';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>(() => getLocalAlarms());
  const [isLoadingAlarms, setIsLoadingAlarms] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3200);
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
  const [isSimulatedMovement, setIsSimulatedMovement] = useState(false);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

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
          // If Firestore is empty but user had locally created alarms, sync them up
          if (prev.length > 0) {
            prev.forEach((item) => {
              saveAlarmToFirestore({ ...item, userId: currentUser.uid });
            });
            return prev;
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

  // Track whether initial startup location has been logged to Firebase
  const hasLoggedStartupLocationRef = useRef(false);

  // Log user's location to Firebase on app startup once user is authenticated
  useEffect(() => {
    if (!currentUser?.uid || hasLoggedStartupLocationRef.current) return;

    if (userLocation.lat && userLocation.lng) {
      hasLoggedStartupLocationRef.current = true;
      logUserLocationToFirestore(
        {
          lat: userLocation.lat,
          lng: userLocation.lng,
          accuracy: userLocation.accuracy,
          timestamp: userLocation.timestamp,
        },
        userLocation.accuracy ? 'browser_gps' : 'app_startup_detect'
      );
    }
  }, [currentUser?.uid, userLocation.lat, userLocation.lng, userLocation.accuracy]);

  // Real Geolocation Watcher + IP Coarse Geolocate Fallback
  useEffect(() => {
    if (isSimulatedMovement) return;

    let hasReceivedGps = false;

    // Quick coarse IP geolocate so map starts at user's real city if GPS is delayed or permissions pending
    fetch('https://freeipapi.com/api/json')
      .then((res) => res.json())
      .then((data) => {
        if (!hasReceivedGps && data && data.latitude && data.longitude) {
          const newLoc = {
            lat: data.latitude,
            lng: data.longitude,
            timestamp: Date.now(),
          };
          setUserLocation((prev) => ({
            ...prev,
            ...newLoc,
          }));
          if (currentUser?.uid && !hasLoggedStartupLocationRef.current) {
            hasLoggedStartupLocationRef.current = true;
            logUserLocationToFirestore(newLoc, 'ip_coarse_geolocate');
          }
        }
      })
      .catch(() => {
        // ignore IP geolocate error
      });

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          hasReceivedGps = true;
          const newLoc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading || undefined,
            speed: pos.coords.speed || undefined,
            timestamp: pos.timestamp,
            isSimulated: false,
          };
          setUserLocation(newLoc);
          if (currentUser?.uid) {
            logUserLocationToFirestore(newLoc, 'gps_initial_fix');
          }
        },
        (err) => {
          console.warn('Geolocation access prompt warning:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          hasReceivedGps = true;
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading || undefined,
            speed: pos.coords.speed || undefined,
            timestamp: pos.timestamp,
            isSimulated: false,
          });
        },
        (err) => {
          console.warn('Geolocation watch warning:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [isSimulatedMovement, currentUser?.uid]);

  // Commute Simulation Engine: gently steps user toward first active alarm
  useEffect(() => {
    if (!isSimulatedMovement) return;

    const activeAlarm = alarms.find((a) => a.enabled);
    if (!activeAlarm) return;

    const interval = setInterval(() => {
      setUserLocation((prev) => {
        const step = 0.0004; // small delta ~ 40m
        const dLat = activeAlarm.lat - prev.lat;
        const dLng = activeAlarm.lng - prev.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < 0.0002) {
          // Reached destination!
          return {
            ...prev,
            lat: activeAlarm.lat,
            lng: activeAlarm.lng,
            timestamp: Date.now(),
          };
        }

        const newLat = prev.lat + (dLat / dist) * step;
        const newLng = prev.lng + (dLng / dist) * step;

        return {
          lat: newLat,
          lng: newLng,
          timestamp: Date.now(),
          isSimulated: true,
        };
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isSimulatedMovement, alarms]);

  // Live Geofencing Engine: Checks if user entered alarm radius
  useEffect(() => {
    if (triggeredAlarm) return; // already alerting

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
      alarmTone: alarmData.alarmTone,
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

      // Stop simulator if it was active
      if (isSimulatedMovement) {
        setIsSimulatedMovement(false);
      }

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

  const handleRecenterUser = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now(),
          });
        },
        () => {}
      );
    }
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  return (
    <main className="w-screen h-screen bg-[#0d0408] flex items-center justify-center p-0 md:p-4 selection:bg-[#ffa8bf] selection:text-[#541229]">
      {/* Mobile Frame Mockup Container */}
      <div
        id="app-container"
        className="relative w-full h-full md:max-w-[430px] md:max-h-[920px] bg-[#12060c] md:rounded-[44px] md:shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_0_12px_#230d19] md:border md:border-[#ffa8bf]/20 overflow-hidden flex flex-col"
      >
        {/* Dynamic Island / Top Speaker Notch on Desktop view */}
        <div className="hidden md:flex absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-40 items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1b0a13] mr-2" />
          <div className="w-10 h-1 bg-[#2b0f1e] rounded-full" />
        </div>

        {/* Floating Notification Toast */}
        {toastMessage && (
          <div className="absolute top-12 left-4 right-4 z-[9999] pointer-events-none flex justify-center animate-in fade-in slide-in-from-top-3 duration-200">
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

        {/* Main Screen Body based on Active Tab */}
        <div className="flex-1 relative overflow-hidden">
          {activeTab === 'map' && (
            <MapView
              userLocation={userLocation}
              alarms={alarms}
              onOpenNewAlarm={handleOpenNewAlarm}
              onSelectAlarm={handleSelectAlarm}
              onRecenterUser={handleRecenterUser}
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
              isSimulated={isSimulatedMovement}
              onToggleSimulation={() => setIsSimulatedMovement(!isSimulatedMovement)}
              onTriggerTestAlarm={() => {
                if (alarms.length > 0) {
                  handleTestTrigger(alarms[0]);
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
                    alarmTone: 'gentle_chime',
                    createdAt: Date.now(),
                  });
                }
              }}
            />
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <NavigationBar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          activeAlarmsCount={alarms.filter((a) => a.enabled).length}
        />

        {/* Modal: Screen 3 (Configure Alarm) */}
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
                  }
                : null)
            }
            userLocation={userLocation}
            onSave={handleSaveAlarm}
            onDelete={editingAlarm ? handleDeleteAlarm : undefined}
            onClose={() => {
              setIsConfiguring(false);
              setEditingAlarm(null);
              setNewAlarmPreset(null);
            }}
          />
        )}

        {/* Fullscreen Alert: Screen 4 (Alarm Triggered) */}
        {triggeredAlarm && (
          <AlarmTriggeredScreen
            alarm={triggeredAlarm}
            userLocation={userLocation}
            onDismiss={handleDismissTriggeredAlarm}
            onSnooze={handleSnoozeTriggeredAlarm}
          />
        )}
      </div>
    </main>
  );
}
