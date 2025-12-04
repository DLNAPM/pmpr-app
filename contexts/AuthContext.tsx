import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { DBOwner, Share } from '../types';

// Declare the global firebase object provided by the scripts in index.html
declare const firebase: any;

type AuthStatus = 'idle' | 'guest' | 'authenticated' | 'loading';
type ViewMode = 'own' | 'shared';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  authStatus: AuthStatus;
  sharesForMe: Share[];
  activeDbOwner: DBOwner | null;
  isReadOnly: boolean;
  viewMode: ViewMode;
  selectDbOwner: (owner: DBOwner | null) => void;
  signInWithGoogle: () => void;
  continueAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [sharesForMe, setSharesForMe] = useState<Share[]>([]);
  const [activeDbOwner, setActiveDbOwner] = useState<DBOwner | null>(null);

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
            const currentUser = { id: uid, name: displayName, email };
            setUser(currentUser);
            setAuthStatus('authenticated');
            // User is authenticated, but we don't know which DB to show yet.
            // App.tsx will handle routing to selection screen if needed.
        } else {
            console.error("Firebase user is missing display name or email.");
            setUser(null);
            setAuthStatus('idle');
        }
      } else {
        // Logged out, clear everything
        setUser(null);
        setAuthStatus('idle');
        setSharesForMe([]);
        setActiveDbOwner(null);
        sessionStorage.removeItem('pmpr_authStatus');
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch shares when user logs in
  useEffect(() => {
    if (authStatus === 'authenticated' && user && db) {
        const unsubscribe = db.collection('shares')
            .where('viewerEmail', '==', user.email)
            .onSnapshot((snapshot: any) => {
                const fetchedShares = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
                setSharesForMe(fetchedShares);

                // Update viewerId if it's missing
                fetchedShares.forEach((share: Share) => {
                    if (!share.viewerId) {
                        db.collection('shares').doc(share.id).update({ viewerId: user.id });
                    }
                });
            });
        return () => unsubscribe();
    } else {
        setSharesForMe([]);
    }
  }, [authStatus, user]);


  const selectDbOwner = (owner: DBOwner | null) => {
      setActiveDbOwner(owner);
  };

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
    auth.signInWithPopup(provider).catch((error: any) => {
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
    setActiveDbOwner(null); // Clear active DB
    setAuthStatus('guest');
    sessionStorage.setItem('pmpr_authStatus', 'guest');
  };

  const logout = () => {
    if (auth) {
      auth.signOut(); // This will trigger the onAuthStateChanged listener to clear state.
    } else {
      // Handle guest logout
      setUser(null);
      setActiveDbOwner(null);
      setAuthStatus('idle');
      sessionStorage.removeItem('pmpr_authStatus');
    }
  };
  
  const isReadOnly = useMemo(() => {
      if (!user || !activeDbOwner) return true;
      return user.id !== activeDbOwner.id;
  }, [user, activeDbOwner]);

  // FIX: Explicitly type `viewMode` as `ViewMode` to match the context type.
  const viewMode: ViewMode = useMemo(() => isReadOnly ? 'shared' : 'own', [isReadOnly]);

  const value = useMemo(() => ({
    user,
    authStatus,
    sharesForMe,
    activeDbOwner,
    isReadOnly,
    viewMode,
    selectDbOwner,
    signInWithGoogle,
    continueAsGuest,
    logout,
  }), [user, authStatus, sharesForMe, activeDbOwner, isReadOnly, viewMode]);

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
