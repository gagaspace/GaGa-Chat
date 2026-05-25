import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const requireEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: requireEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv(import.meta.env.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID'),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  ? getAnalytics(app)
  : null;

const messaging = typeof window !== 'undefined' && import.meta.env.VITE_FIREBASE_VAPID_KEY
  ? getMessaging(app)
  : null;

export const requestFirebaseMessagingToken = async (): Promise<string | null> => {
  if (!messaging || !import.meta.env.VITE_FIREBASE_VAPID_KEY) {
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch (error) {
    console.error('Unable to fetch FCM token:', error);
    return null;
  }
};

export const onFirebaseMessage = (callback: (payload: unknown) => void) => {
  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, callback);
};

export { app, analytics };
