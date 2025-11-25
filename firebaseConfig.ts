
// Declare the global firebase object that is loaded from the script tags in index.html
declare const firebase: any;

// --- IMPORTANT ---
// This app reads Firebase credentials from environment variables.
// You MUST set these in your deployment environment for authentication to work.
// Example: FIREBASE_API_KEY=your_api_key

const API_KEY = process.env.FIREBASE_API_KEY || "YOUR_API_KEY_HERE";

const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "your-project",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || ""
};

export const isFirebaseConfigured = API_KEY !== "YOUR_API_KEY_HERE";

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
