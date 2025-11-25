
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

export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

// Initialize Firebase only if it is configured and hasn't been initialized yet.
if (isFirebaseConfigured) {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} else {
    console.warn(
        `%cFIREBASE WARNING: Your Firebase environment variables are not configured.
        %cThe application will load, but Google Sign-In will be disabled.
        Please ensure you have set all FIREBASE_... variables in your environment.`,
        "color: orange; font-weight: bold; font-size: 14px;",
        "color: orange; font-size: 12px;"
    );
}

// Export the auth service only if Firebase is properly configured.
export const auth = isFirebaseConfigured ? firebase.auth() : null;
