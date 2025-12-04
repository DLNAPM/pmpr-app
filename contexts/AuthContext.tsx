import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '../firebaseConfig';
import { DBOwner, Share } from '../types';

// Declare the global firebase object provided by the scripts in index.html
declare const firebase: any;

type AuthStatus = 'idle' | 'guest' | 'authenticated' | 'loading' | 'selecting_db';
type ViewMode = 'own' | 'shared';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  authStatus: AuthStatus;
  sharedDbs: DBOwner[];
  activeDbOwner: DBOwner | null;
  viewMode: ViewMode;
  isReadOnly: boolean;
  isOwner: boolean;
  signInWithGoogle: () => void;
  continueAsGuest: () => void;
  logout: () => void;
  selectDb: (owner: DBOwner) => void;
  resetView: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  
  // New state for sharing/viewing logic
  const [sharedDbs, setSharedDbs] = useState<DBOwner[]>([]);
  const [activeDbOwner, setActiveDbOwner] = useState<DBOwner | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('own');

  const isReadOnly = useMemo(() => viewMode === 'shared', [viewMode]);
  const isOwner = useMemo(() => activeDbOwner?.id === user?.id, [activeDbOwner, user]);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setSharedDbs([]);
    setActiveDbOwner(null);
    setViewMode('own');
    sessionStorage.removeItem('pmpr_authStatus');
  }, []);

  const fetchSharedDbs = useCallback(async (currentUser: User) => {
    if (!db) return;
    try {
        const sharesSnapshot = await db.collection('shares').where('viewerEmail', '==', currentUser.email).get();
        const shares: DBOwner[] = sharesSnapshot.docs.map((doc: any) => {
            const data = doc.data();
            return { id: data.ownerId, name: data.ownerName, email: data.ownerEmail };
        });
        setSharedDbs(shares);

        if (shares.length > 0) {
            setAuthStatus('selecting_db');
        } else {
            setActiveDbOwner(currentUser);
            setAuthStatus('authenticated');
        }
    } catch (error) {
        console.error("Error fetching shared databases:", error);
        setActiveDbOwner(currentUser); // Default to own DB on error
        setAuthStatus('authenticated');
    }
  }, []);

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
            fetchSharedDbs(currentUser);
        } else {
            console.error("Firebase user is missing display name or email.");
            resetAuthState();
            setAuthStatus('idle');
        }
      } else {
        resetAuthState();
        const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
        setAuthStatus(storedStatus === 'guest' ? 'guest' : 'idle');
      }
    });

    return () => unsubscribe();
  }, [resetAuthState, fetchSharedDbs]);
  
  const selectDb = (owner: DBOwner) => {
      setActiveDbOwner(owner);
      if (user && owner.id === user.id) {
          setViewMode('own');
      } else {
          setViewMode('shared');
      }
      setAuthStatus('authenticated');
  };

  const signInWithGoogle = () => {
    if (!auth) {
        alert("Google Sign-In is currently unavailable.");
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    setAuthStatus('loading');
    auth.signInWithPopup(provider).catch((error: any) => {
        console.error("Authentication failed:", error);
        alert(`Authentication failed: ${error.message}`);
        setAuthStatus('idle');
    });
  };

  const continueAsGuest = () => {
    if (auth && auth.currentUser) auth.signOut();
    resetAuthState();
    setAuthStatus('guest');
    sessionStorage.setItem('pmpr_authStatus', 'guest');
  };

  const logout = () => {
    if (auth) {
      auth.signOut().then(() => {
        resetAuthState();
        setAuthStatus('idle');
      });
    } else {
      resetAuthState();
      setAuthStatus('idle');
    }
  };
  
  const resetView = () => {
      if(user) fetchSharedDbs(user);
  }
  
  const value = useMemo(() => ({
    user,
    authStatus,
    sharedDbs,
    activeDbOwner,
    viewMode,
    isReadOnly,
    isOwner,
    signInWithGoogle,
    continueAsGuest,
    logout,
    selectDb,
    resetView
  }), [user, authStatus, sharedDbs, activeDbOwner, viewMode, isReadOnly, isOwner, resetView]);

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