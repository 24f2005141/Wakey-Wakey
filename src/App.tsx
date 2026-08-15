import React, { useState, useEffect, useRef } from 'react';
import { TabType, Alarm, UserLocation } from './types';
import { MapView } from './components/MapView';
import { AlarmsView } from './components/AlarmsView';
import { ConfigureAlarmModal } from './components/ConfigureAlarmModal';
import { AlarmTriggeredScreen } from './components/AlarmTriggeredScreen';
import { SettingsView } from './components/SettingsView';
import { NavigationBar } from './components/NavigationBar';
import { getDistanceInMeters, getDefaultStartingLocation } from './utils/geo';
import { initAuth, signInWithGoogle, signOutUser } from './lib/firebase';
import {
  subscribeToUserAlarms,
  saveAlarmToFirestore,
  toggleAlarmInFirestore,
  deleteAlarmFromFirestore,
  logUserLocationToFirestore,
} from './services/alarmService';
import { User } from 'firebase/auth';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isLoadingAlarms, setIsLoadingAlarms] = useState(true);

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
      setAlarms([]);
      setIsLoadingAlarms(false);
      return;
    }

    setIsLoadingAlarms(true);
    const unsubscribe = subscribeToUserAlarms(
      currentUser.uid,
      (fetchedAlarms) => {
        setAlarms(fetchedAlarms);
        setIsLoadingAlarms(false);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
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

  // Alarm Management Handlers (Persisted to Firestore)
  const handleToggleAlarm = async (id: string) => {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
    const newStatus = !alarm.enabled;
    // Optimistic UI update
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: newStatus } : a))
    );
    try {
      await toggleAlarmInFirestore(id, newStatus);
    } catch (err) {
      console.error('Failed to toggle alarm in Firestore:', err);
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
    try {
      await saveAlarmToFirestore({
        ...alarmData,
        userId: currentUser?.uid || '',
      });
    } catch (err) {
      console.error('Failed to save alarm to Firestore:', err);
    }
    setIsConfiguring(false);
    setEditingAlarm(null);
    setNewAlarmPreset(null);
  };

  const handleDeleteAlarm = async (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteAlarmFromFirestore(id);
    } catch (err) {
      console.error('Failed to delete alarm from Firestore:', err);
    }
    setIsConfiguring(false);
    setEditingAlarm(null);
  };

  const handleDismissTriggeredAlarm = () => {
    if (triggeredAlarm) {
      setAlarms((prev) =>
        prev.map((a) =>
          a.id === triggeredAlarm.id
            ? { ...a, lastTriggeredAt: Date.now(), snoozedUntil: null }
            : a
        )
      );
    }
    setTriggeredAlarm(null);
  };

  const handleSnoozeTriggeredAlarm = (minutes = 5) => {
    if (triggeredAlarm) {
      const snoozeUntil = Date.now() + minutes * 60 * 1000;
      setAlarms((prev) =>
        prev.map((a) =>
          a.id === triggeredAlarm.id ? { ...a, snoozedUntil: snoozeUntil } : a
        )
      );
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
