
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

type AuthStatus = 'idle' | 'guest' | 'authenticated';

interface User {
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

// In a real app, this would involve a library like Firebase Auth or Google Identity Services.
// We are simulating it here.
const FAKE_USER: User = {
    id: 'google_user_12345',
    name: 'Demo User',
    email: 'demo.user@example.com'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');

  useEffect(() => {
    // Check session storage to see if user was already logged in
    const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
    if (storedStatus === 'authenticated') {
        setUser(FAKE_USER);
        setAuthStatus('authenticated');
    } else if (storedStatus === 'guest') {
        setAuthStatus('guest');
    } else {
        setAuthStatus('idle');
    }
  }, []);

  const signInWithGoogle = () => {
    // This is where the Google OAuth flow would be triggered.
    // On success, we would get a user object back.
    setUser(FAKE_USER);
    setAuthStatus('authenticated');
    sessionStorage.setItem('pmpr_authStatus', 'authenticated');
  };

  const continueAsGuest = () => {
    setUser(null);
    setAuthStatus('guest');
    sessionStorage.setItem('pmpr_authStatus', 'guest');
  };

  const logout = () => {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
