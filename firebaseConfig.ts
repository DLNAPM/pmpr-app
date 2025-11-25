// Declare the global firebase object that is loaded from the script tags in index.html
declare const firebase: any;

// --- IMPORTANT ---
// This app reads Firebase credentials from environment variables.
// You MUST set these in your deployment environment for authentication to work.
// Example: FIREBASE_API_KEY=your_api_key

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "pmpr-app.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "pmpr-app",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "pmpr-app.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.FIREBASE_APP_ID || "1:12345:web:abcdef123"
};

const hasApiKeys = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";
const isFirebaseLoaded = typeof firebase !== 'undefined' && firebase.app;

// The feature is configured ONLY if the keys are provided AND the library has loaded.
export const isFirebaseConfigured = hasApiKeys && isFirebaseLoaded;

let authService = null;

if (isFirebaseLoaded) {
    if (hasApiKeys) {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        authService = firebase.auth();
    }
}

if (hasApiKeys && !isFirebaseLoaded) {
    console.error("Firebase environment variables are set, but the Firebase library failed to load. Please check your network connection and the script tags in index.html.");
} else if (!hasApiKeys) {
     console.warn(
        `%cFIREBASE WARNING: Your Firebase environment variables are not configured.
        %cThe application will load, but Google Sign-In will be disabled.
        Please ensure you have set all FIREBASE_... variables in your environment.`,
        "color: orange; font-weight: bold; font-size: 14px;",
        "color: orange; font-size: 12px;"
    );
}

// Export the auth service. It will be null if not configured/loaded.
export const auth = authService;