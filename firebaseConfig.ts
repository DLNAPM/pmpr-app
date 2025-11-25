
// FIX: Switched to Firebase compat libraries to resolve module import errors.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";

// --- IMPORTANT ---
// This app reads Firebase credentials from environment variables.
// You MUST set these in your deployment environment for authentication to work.
// Example: FIREBASE_API_KEY=your_api_key

const firebaseConfig = {
  // FIX: Provide a fallback for the API key to prevent crashes if the env var is not set.
  apiKey: process.env.FIREBASE_API_KEY || "MISSING_API_KEY",
  authDomain: "pmpr-app.firebaseapp.com",
  projectId: "pmpr-app",
  storageBucket: "pmpr-app.firebasestorage.app",
  messagingSenderId: "608205035568",
  appId: "1:608205035568:web:5aa7530b75be8301bbf5f5"
};


// If the API key is the placeholder, it means the environment variables are not set.
// Log a clear, prominent warning to the developer console.
if (firebaseConfig.apiKey === "MISSING_API_KEY") {
    console.warn(
        `%cFIREBASE WARNING: Your Firebase environment variables are not configured.
        %cThe application will load, but authentication will fail.
        Please ensure you have set all FIREBASE_... variables in your environment.`,
        "color: orange; font-weight: bold; font-size: 14px;",
        "color: orange; font-size: 12px;"
    );
}

// Initialize Firebase
// Using fallbacks ensures initializeApp doesn't crash the app on startup.
// FIX: Use compat syntax for initialization.
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
// FIX: Use compat syntax to get auth service.
export const auth = firebase.auth();