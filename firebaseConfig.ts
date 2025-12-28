
// Declare the global firebase object that is loaded from the script tags in index.html
declare const firebase: any;

// Safe access to environment variables
const getEnv = (key: string) => {
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {
        // process.env might not be available in some environments
    }
    return undefined;
};

const firebaseConfig = {
    apiKey: getEnv('FIREBASE_API_KEY') || "AIzaSyC9JYl3h9Rry4oLQ-bY7j7s7U8HfFKFsJo",
    authDomain: getEnv('FIREBASE_AUTH_DOMAIN') || "pmpr-app.firebaseapp.com",
    projectId: getEnv('FIREBASE_PROJECT_ID') || "pmpr-app",
    storageBucket: getEnv('FIREBASE_STORAGE_BUCKET') || "pmpr-app.appspot.com",
    messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID') || "608205035568",
    appId: getEnv('FIREBASE_APP_ID') || "1:608205035568:web:5aa7530b75be8301bbf5f5"
};

let authService = null;
let dbService = null;

// Standard Firebase initialization check for compatibility library
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        try {
            if (firebaseConfig.apiKey) {
                firebase.initializeApp(firebaseConfig);
            } else {
                console.warn("Firebase API Key is missing. Login services will be restricted.");
            }
        } catch (e) {
            console.error("Firebase initialization failed:", e);
        }
    }
    
    // Attempt to get services if initialized
    try {
        authService = firebase.auth();
        dbService = firebase.firestore();
    } catch (e) {
        console.error("Failed to initialize Firebase services:", e);
    }
} else {
    console.error("Firebase scripts were not found. Please ensure index.html includes the required Firebase compat scripts.");
}

export const auth = authService;
export const db = dbService;
