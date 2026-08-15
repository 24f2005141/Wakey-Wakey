import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID (CRITICAL)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

/**
 * Validate connection to Firestore as required by system skill
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

// Auto-run connection test on startup
testFirestoreConnection();

/**
 * Initialize automatic user authentication (anonymous session if not logged in)
 */
export function initAuth(onUserChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      onUserChange(user);
    } else {
      try {
        const cred = await signInAnonymously(auth);
        onUserChange(cred.user);
      } catch (err) {
        console.warn('Anonymous sign in fallback:', err);
        onUserChange(null);
      }
    }
  });
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign out current user and switch to new anonymous session
 */
export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
  try {
    await signInAnonymously(auth);
  } catch {
    // ignore
  }
}
