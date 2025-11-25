import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { auth } from '../firebaseConfig';

// Declare the global firebase object provided by the scripts in index.html
declare const firebase: any;

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
    // FIX: The firebase.User type is incorrect for the compat library setup. It should be firebase.auth.User.
    const unsubscribe = auth.onAuthStateChanged((firebaseUser: firebase.auth.User | null) => {
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
    const provider = new firebase.auth.GoogleAuthProvider();
    setAuthStatus('loading');
    auth.signInWithPopup(provider)
        .then((result) => {
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
        auth.signOut();
    }
    setUser(null);
    setAuthStatus('guest');
    sessionStorage.setItem('pmpr_authStatus', 'guest');
  };

  const logout = () => {
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