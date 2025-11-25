
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

type AuthStatus = 'idle' | 'guest' | 'authenticated';

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

// In a real app, this would be replaced with a real user object from Firebase Auth.
const FAKE_PROD_USER: User = {
    id: 'prod_user_xyz789', // A more distinct ID for the authenticated user
    name: 'Prod User',
    email: 'prod.user@example.com'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // FIX: Corrected the useState syntax. The previous syntax was invalid.
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');

  useEffect(() => {
    // In a real app, you would use Firebase's `onAuthStateChanged` listener here
    // to automatically manage user sessions across page reloads.
    const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
    if (storedStatus === 'authenticated') {
        setUser(FAKE_PROD_USER);
        setAuthStatus('authenticated');
    } else if (storedStatus === 'guest') {
        setAuthStatus('guest');
    } else {
        setAuthStatus('idle');
    }
  }, []);

  const signInWithGoogle = () => {
    // REAL IMPLEMENTATION:
    // import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
    // const auth = getAuth();
    // const provider = new GoogleAuthProvider();
    // signInWithPopup(auth, provider).then((result) => {
    //   const { uid, displayName, email } = result.user;
    //   setUser({ id: uid, name: displayName, email });
    //   setAuthStatus('authenticated');
    //   sessionStorage.setItem('pmpr_authStatus', 'authenticated');
    // }).catch((error) => console.error("Authentication failed:", error));

    // SIMULATED IMPLEMENTATION:
    setUser(FAKE_PROD_USER);
    setAuthStatus('authenticated');
    sessionStorage.setItem('pmpr_authStatus', 'authenticated');
  };

  const continueAsGuest = () => {
    setUser(null);
    setAuthStatus('guest');
    sessionStorage.setItem('pmpr_authStatus', 'guest');
  };

  const logout = () => {
    // REAL IMPLEMENTATION:
    // import { getAuth } from "firebase/auth";
    // const auth = getAuth();
    // auth.signOut().then(() => {
    //   setUser(null);
    //   setAuthStatus('idle');
    //   sessionStorage.removeItem('pmpr_authStatus');
    // });
    
    // SIMULATED IMPLEMENTATION:
    setUser(null);
    setAuthStatus('idle');
    sessionStorage.removeItem('pmpr_authStatus');
  };
  
  const value = useMemo(() => ({
    user,
    authStatus,
    signInWithGoogle,
    continueAsGuest,
    logout
  }), [user, authStatus]);

  // FIX: Corrected the closing tag for AuthContext.Provider.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
