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
    if (!auth) {
        const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
        setAuthStatus(storedStatus === 'guest' ? 'guest' : 'idle');
        return;
    }
    
    const unsubscribe = auth.onAuthStateChanged((firebaseUser: any | null) => {
      if (firebaseUser) {
        const { uid, displayName, email } = firebaseUser;
        if (displayName && email) {
            setUser({ id: uid, name: displayName, email });
            setAuthStatus('authenticated');
        } else {
            console.error("Firebase user is missing display name or email.");
            setUser(null);
            setAuthStatus('idle');
        }
      } else {
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
    if (!auth) {
        console.error("Firebase is not configured. Cannot sign in with Google.");
        alert("Google Sign-In is currently unavailable. Please contact the administrator.");
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    setAuthStatus('loading');
    auth.signInWithPopup(provider)
        .then((result) => {
            if (result.user) {
              const { uid, displayName, email } = result.user;
              if (displayName && email) {
                  setUser({ id: uid, name: displayName, email });
                  setAuthStatus('authenticated');
                  sessionStorage.removeItem('pmpr_authStatus');
              }
            }
        })
        .catch((error) => {
            console.error("Authentication failed:", error);
            alert(`Authentication failed: ${error.message}`);
            setAuthStatus('idle');
        });
  };

  const continueAsGuest = () => {
    if (auth && auth.currentUser) {
        auth.signOut();
    }
    setUser(null);
    setAuthStatus('guest');
    sessionStorage.setItem('pmpr_authStatus', 'guest');
  };

  const logout = () => {
    if (auth) {
      auth.signOut().then(() => {
        setUser(null);
        setAuthStatus('idle');
        sessionStorage.removeItem('pmpr_authStatus');
      });
    } else {
      // Handle guest logout
      setUser(null);
      setAuthStatus('idle');
      sessionStorage.removeItem('pmpr_authStatus');
    }
  };
  
  const value = useMemo(() => ({
    user,
    authStatus,
    signInWithGoogle,
    continueAsGuest,
    logout,
  }), [user, authStatus]);

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