import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if all essential keys are provided
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain
);

let app;
let authInstance: any = null;
let dbInstance: any = null;
let analyticsInstance: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    if (typeof window !== 'undefined') {
      analyticsInstance = getAnalytics(app);
    }
    console.log("Firebase initialized successfully using environment variables.");
  } catch (error) {
    console.error("Error initializing real Firebase: ", error);
  }
} else {
  console.log("SAMS: Firebase configuration is missing in environment variables. Falling back to robust LocalStorage Sandbox mode.");
}

export const auth = authInstance;
export const db = dbInstance;
export const analytics = analyticsInstance;
