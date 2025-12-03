// Declare the global firebase object that is loaded from the script tags in index.html
declare const firebase: any;

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyC9JYl3h9Rry4oLQ-bY7j7s7U8HfFKFsJo",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "pmpr-app.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "pmpr-app",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "pmpr-app.appspot.com", // This is the source of the error
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "608205035568",
    appId: process.env.FIREBASE_APP_ID || "1:608205035568:web:5aa7530b75be8301bbf5f5"
};

let authService = null;
let dbService = null;

// Check if firebase is available on the window object.
if (typeof firebase !== 'undefined' && firebase.app) {
    // Check if it's not already initialized.
    if (!firebase.apps.length) {
        try {
            // Initialize Firebase only if API key is provided
            if (firebaseConfig.apiKey) {
                firebase.initializeApp(firebaseConfig);
                authService = firebase.auth();
                dbService = firebase.firestore();
            } else {
                 console.warn("Firebase API Key is missing. Firebase services will be unavailable.");
            }
        } catch (e) {
            console.error("Firebase initialization failed. Please ensure your environment variables are set correctly.", e);
        }
    } else {
        // Firebase is already initialized, get the services.
        authService = firebase.auth();
        dbService = firebase.firestore();
    }
} else {
    console.warn("Firebase scripts not loaded. Firebase services will be unavailable.");
}


export const auth = authService;
export const db = dbService;