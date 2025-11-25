import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// --- IMPORTANT ---
// This app reads Firebase credentials from environment variables.
// You MUST set these in your deployment environment for authentication to work.
// Example: FIREBASE_API_KEY=your_api_key

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  apiKey: "AIzaSyC9JYl3h9Rry4oLQ-bY7j7s7U8HfFKFsJo",
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
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
