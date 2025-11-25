import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// --- IMPORTANT ---
// This app reads Firebase credentials from environment variables.
// You MUST set these in your deployment environment for authentication to work.
// Example: FIREBASE_API_KEY=your_api_key

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "MISSING_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "MISSING_AUTH_DOMAIN",
  projectId: process.env.FIREBASE_PROJECT_ID || "MISSING_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "MISSING_STORAGE_BUCKET",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "MISSING_SENDER_ID",
  appId: process.env.FIREBASE_APP_ID || "MISSING_APP_ID"
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
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
