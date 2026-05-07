import firebaseAppletConfig from './firebase-applet-config.json';

// Declare the global firebase object that is loaded from the script tags in index.html
declare const firebase: any;

const firebaseConfig = firebaseAppletConfig;

let authService = null;
let dbService = null;

// Standard Firebase initialization check for compatibility library
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
        } catch (e) {
            console.error("Firebase initialization failed:", e);
        }
    }
    
    // Attempt to get services if initialized
    try {
        authService = firebase.auth();
        // Support custom database IDs from the applet config if using multiple databases
        const dbId = (firebaseConfig as any).firestoreDatabaseId;
        dbService = dbId ? firebase.app().firestore(dbId) : firebase.firestore();
    } catch (e) {
        console.error("Failed to initialize Firebase services:", e);
    }
} else {
    console.error("Firebase scripts were not found. Please ensure index.html includes the required Firebase compat scripts.");
}

export const auth = authService;
export const db = dbService;
