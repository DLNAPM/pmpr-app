// Declare the global firebase object that is loaded from the script tags in index.html
declare const firebase: any;

// --- DYNAMIC CONFIGURATION LOGIC ---
// 1. Try to load config from localStorage (set by the new config modal).
// 2. If not found, fall back to environment variables.
// 3. If neither is found, use placeholders.

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

// If no valid stored config, fallback to environment variables
if (!firebaseConfig) {
  firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "pmpr-app.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "pmpr-app",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "pmpr-app.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1234567890",
    appId: process.env.FIREBASE_APP_ID || "1:12345:web:abcdef123"
  };
}


const hasApiKeys = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";
const isFirebaseLoaded = typeof firebase !== 'undefined' && firebase.app;

export const isFirebaseConfigured = hasApiKeys && isFirebaseLoaded;

let authService = null;

if (isFirebaseLoaded) {
    if (hasApiKeys) {
        if (!firebase.apps.length) {
            try {
              firebase.initializeApp(firebaseConfig);
              authService = firebase.auth();
            } catch (e) {
              console.error("Firebase initialization failed. Please check your configuration.", e);
              // Clear bad config from storage to prevent loops
              if (storedConfigRaw) localStorage.removeItem('pmpr_firebaseConfig');
            }
        } else {
           authService = firebase.auth();
        }
    }
}

if (isFirebaseConfigured) {
  // All good, no need to log.
} else if (hasApiKeys && !isFirebaseLoaded) {
    console.error("Firebase environment variables or stored config are set, but the Firebase library failed to load. Please check your network connection and the script tags in index.html.");
} else if (!hasApiKeys && !storedConfigRaw) { // Only warn if no config source is available
     console.warn(
        `%cFIREBASE WARNING: Your Firebase environment variables are not configured.
        %cThe application will load, but Google Sign-In will be disabled.
        Please ensure you have set all FIREBASE_... variables in your environment or configure it in the UI.`,
        "color: orange; font-weight: bold; font-size: 14px;",
        "color: orange; font-size: 12px;"
    );
}

export const auth = authService;