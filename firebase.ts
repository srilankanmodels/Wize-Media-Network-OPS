import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { getStorage } from "firebase/storage";
import appletConfig from "./firebase-applet-config.json";

// Helper to safely get environment variables across Vite and Node
const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
      return (import.meta as any).env[key];
    }
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
  } catch {
    // fallback
  }
  return '';
};

// Merge environment variables with provisioned applet config
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || appletConfig.apiKey || "",
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || appletConfig.authDomain || "",
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || appletConfig.projectId || "",
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || appletConfig.storageBucket || "",
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || appletConfig.messagingSenderId || "",
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || appletConfig.appId || ""
};

let app: any = null;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log("🟢 Firebase Protocol: Cloud Link & Auth Initialized");
} catch (e) {
  console.error("🔴 Firebase Protocol: Connection Failure", e);
}

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;
export const isFirebaseEnabled = !!app;

// Standard Google Auth Provider for pure application login (no sensitive scopes)
export const loginGoogleProvider = new GoogleAuthProvider();
loginGoogleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Pure Google login for application sign-in
export const signInWithGoogle = async (): Promise<{ user: User }> => {
  if (!auth) throw new Error("Firebase Auth is not initialized");
  const result = await signInWithPopup(auth, loginGoogleProvider);
  return { user: result.user };
};

// Configure Google Workspace Provider (Gmail, Calendar, Drive)
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/gmail.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/gmail.send");
googleProvider.addScope("https://www.googleapis.com/auth/calendar");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");
googleProvider.addScope("https://www.googleapis.com/auth/drive");
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory (never localStorage).
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedGoogleUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      cachedGoogleUser = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google to obtain Gmail access token
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth) throw new Error("Firebase Auth is not initialized");
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to receive Google access token");
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google Workspace Sign In error:", error);
    if (error.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      throw new Error(`Domain "${currentHost}" is not in Firebase Authorized Domains. Add "${currentHost}" in Firebase Console -> Authentication -> Settings -> Authorized Domains, or connect via Supabase.`);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCachedGoogleUser = (): User | null => {
  return cachedGoogleUser;
};

export const logoutGoogle = async () => {
  if (auth) {
    await signOut(auth);
  }
  cachedAccessToken = null;
  cachedGoogleUser = null;
};
