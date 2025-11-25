
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
// FIX: Use Firebase compat library to resolve module import errors.
import firebase from "firebase/compat/app";
import { auth } from '../firebaseConfig';


type AuthStatus = 'idle' | 'guest' | 'authenticated' | 'loading';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  authStatus: AuthStatus;
  signInWithGoogle: () => void;
  continueAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // FIX: Use compat syntax for onAuthStateChanged and firebase.User type.
    const unsubscribe = auth.onAuthStateChanged((firebaseUser: firebase.User | null) => {
      if (firebaseUser) {
        const { uid, displayName, email } = firebaseUser;
        if (displayName && email) {
            setUser({ id: uid, name: displayName, email });
            setAuthStatus('authenticated');
        } else {
             // Handle cases where user info might be incomplete
            console.error("Firebase user is missing display name or email.");
            setUser(null);
            setAuthStatus('idle');
        }
      } else {
        // If no user is logged in via Firebase, check for a guest session.
        const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
        if (storedStatus === 'guest') {
            setAuthStatus('guest');
        } else {
            setUser(null);
            setAuthStatus('idle');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = () => {
    // FIX: Use compat syntax for GoogleAuthProvider.
    const provider = new firebase.auth.GoogleAuthProvider();
    setAuthStatus('loading');
    // FIX: Use compat syntax for signInWithPopup.
    auth.signInWithPopup(provider)
        .then((result) => {
            // FIX: Add null check for result.user, which is nullable in compat mode.
            if (result.user) {
              const { uid, displayName, email } = result.user;
              if (displayName && email) {
                  setUser({ id: uid, name: displayName, email });
                  setAuthStatus('authenticated');
                  sessionStorage.removeItem('pmpr_authStatus'); // Clean up guest status
              }
            }
        })
        .catch((error) => {
            console.error("Authentication failed:", error);
            setAuthStatus('idle');
        });
  };

  const continueAsGuest = () => {
    // Ensure any potential Firebase session is signed out before proceeding as guest.
    if (auth.currentUser) {
        // FIX: Use compat syntax for signOut.
        auth.signOut();
    }
    setUser(null);
    setAuthStatus('guest');
    sessionStorage.setItem('pmpr_authStatus', 'guest');
  };

  const logout = () => {
    // FIX: Use compat syntax for signOut.
    auth.signOut().then(() => {
      setUser(null);
      setAuthStatus('idle');
      sessionStorage.removeItem('pmpr_authStatus');
    });
  };
  
  const value = useMemo(() => ({
    user,
    authStatus,
    signInWithGoogle,
    continueAsGuest,
    logout
  }), [user, authStatus]);

  // Render a loading state while checking auth status.
  if (authStatus === 'loading') {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <p>Loading...</p>
          </div>
      )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
