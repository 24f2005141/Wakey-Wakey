import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { Alarm } from '../types';

const ALARMS_COLLECTION = 'alarms';

/**
 * Subscribe in real-time to the current user's alarms
 */
export function subscribeToUserAlarms(
  userId: string,
  onAlarmsUpdate: (alarms: Alarm[]) => void,
  onError?: (error: Error) => void
) {
  if (!userId) {
    onAlarmsUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, ALARMS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Alarm[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: data.userId,
          name: data.name,
          lat: data.lat,
          lng: data.lng,
          radius: data.radius,
          enabled: data.enabled,
          sound: data.sound,
          vibration: data.vibration,
          alarmTone: data.alarmTone || 'gentle_chime',
          volume: data.volume ?? 1,
          snoozedUntil: data.snoozedUntil ?? null,
          lastTriggeredAt: data.lastTriggeredAt ?? null,
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt,
          category: data.category || 'other',
        });
      });

      // Sort by creation time descending
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onAlarmsUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, ALARMS_COLLECTION);
      } catch (err) {
        if (onError) onError(err as Error);
      }
    }
  );
}

/**
 * Create or update an alarm in Firestore
 */
export async function saveAlarmToFirestore(
  alarm: Omit<Alarm, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<string> {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) {
    throw new Error('User must be authenticated to save an alarm.');
  }

  const id = alarm.id || `alarm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `${ALARMS_COLLECTION}/${id}`;

  const payload: Record<string, any> = {
    userId: currentUserId,
    name: alarm.name.trim().slice(0, 100) || 'Destination Alarm',
    lat: Number(alarm.lat),
    lng: Number(alarm.lng),
    radius: Math.max(50, Math.min(50000, Number(alarm.radius) || 500)),
    enabled: Boolean(alarm.enabled),
    sound: Boolean(alarm.sound),
    vibration: Boolean(alarm.vibration),
    alarmTone: alarm.alarmTone || 'gentle_chime',
    createdAt: alarm.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await setDoc(doc(db, ALARMS_COLLECTION, id), payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Toggle an alarm's enabled status in Firestore
 */
export async function toggleAlarmInFirestore(id: string, enabled: boolean): Promise<void> {
  const path = `${ALARMS_COLLECTION}/${id}`;
  try {
    await updateDoc(doc(db, ALARMS_COLLECTION, id), {
      enabled,
      updatedAt: Date.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete an alarm from Firestore
 */
export async function deleteAlarmFromFirestore(id: string): Promise<void> {
  const path = `${ALARMS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, ALARMS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

const LOCATION_LOGS_COLLECTION = 'location_logs';

export interface LocationLogEntry {
  id?: string;
  userId?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  source?: string;
  timestamp: number;
  createdAt?: number;
}

/**
 * Log the user's initial or current location to Firestore for testing and diagnostic purposes
 */
export async function logUserLocationToFirestore(
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp?: number;
  },
  source = 'app_startup'
): Promise<string | null> {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) {
    return null;
  }

  const logId = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `${LOCATION_LOGS_COLLECTION}/${logId}`;

  const payload: Record<string, any> = {
    userId: currentUserId,
    lat: Number(location.lat),
    lng: Number(location.lng),
    accuracy: location.accuracy !== undefined ? Number(location.accuracy) : null,
    source,
    timestamp: location.timestamp || Date.now(),
    createdAt: Date.now(),
  };

  try {
    await setDoc(doc(db, LOCATION_LOGS_COLLECTION, logId), payload);
    console.info(`[Firebase Test Logger] Successfully logged location to Firestore (/location_logs/${logId}):`, {
      lat: location.lat,
      lng: location.lng,
      source,
    });
    return logId;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch (loggedErr) {
      console.warn('[Firebase Test Logger] Failed to write location log:', loggedErr);
    }
    return null;
  }
}

