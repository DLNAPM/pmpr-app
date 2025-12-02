// Declare the global firebase object that is loaded from the script tags in index.html
declare const firebase: any;

// --- DYNAMIC CONFIGURATION LOGIC ---
let firebaseConfig: any = null;
const storedConfigRaw = localStorage.getItem('pmpr_firebaseConfig');

if (storedConfigRaw) {
  try {
    firebaseConfig = JSON.parse(storedConfigRaw);
  } catch {
    console.error("Could not parse stored Firebase config.");
    localStorage.removeItem('pmpr_firebaseConfig'); // Clear invalid stored config
  }
}

if (!firebaseConfig) {
  firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyC9JYl3h9Rry4oLQ-bY7j7s7U8HfFKFsJo",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "pmpr-app.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "pmpr-app",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "pmpr-app.appspot.com", // This is the source of the error
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "608205035568",
    appId: process.env.FIREBASE_APP_ID || "1:608205035568:web:5aa7530b75be8301bbf5f5"
  };
}

const isFirebaseLoaded = typeof firebase !== 'undefined' && firebase.app;

// --- ROBUST CONFIGURATION CHECK (THE FIX) ---
// This is the definitive fix for the CORS/Storage issue.
// We now check for a valid API key AND a valid storageBucket.
// If the storageBucket is the incorrect default, the app is considered not configured.
const hasApiKeys = firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyC9JYl3h9Rry4oLQ-bY7j7s7U8HfFKFsJo";
const hasValidStorageBucket = firebaseConfig.storageBucket && firebaseConfig.storageBucket !== "pmpr-app.appspot.com";
export const isFirebaseConfigured = hasApiKeys && hasValidStorageBucket && isFirebaseLoaded;


let authService = null;
let dbService = null;
let storageService = null;

if (isFirebaseConfigured) {
    if (!firebase.apps.length) {
        try {
          firebase.initializeApp(firebaseConfig);
        } catch (e) {
          console.error("Firebase initialization failed. Please check your configuration.", e);
          if (storedConfigRaw) localStorage.removeItem('pmpr_firebaseConfig'); // Clear bad config
        }
    }
    // Always get services from the initialized app to avoid errors
    if(firebase.apps.length > 0) {
      authService = firebase.auth();
      dbService = firebase.firestore();
      storageService = firebase.storage();
    }
}

if (isFirebaseConfigured) {
  // All good.
} else if (isFirebaseLoaded) { // Only log if firebase is loaded but config is bad
     console.warn(
        `%cFIREBASE WARNING: Firebase is not configured correctly.
        %cThe application will load, but Google Sign-In & file uploads will be disabled.
        This may be due to missing environment variables or an incomplete configuration (e.g., wrong storageBucket).
        Please use the "Configure Connection" link on the login page to provide the full config object from your Firebase project settings.`,
        "color: orange; font-weight: bold; font-size: 14px;",
        "color: orange; font-size: 12px;"
    );
}

export const auth = authService;
export const db = dbService;
export const storage = storageService;