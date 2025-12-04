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
  signInWithGoogle: () => void;
  continueAsGuest: () => void;
  logout: () => void;
  selectDb: (owner: DBOwner) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [sharedDbs, setSharedDbs] = useState<DBOwner[]>([]);
  const [activeDbOwner, setActiveDbOwner] = useState<DBOwner | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('own');

  const isReadOnly = useMemo(() => viewMode === 'shared', [viewMode]);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setSharedDbs([]);
    setActiveDbOwner(null);
    setViewMode('own');
    sessionStorage.removeItem('pmpr_authStatus');
  }, []);

  useEffect(() => {
    if (!auth) {
        const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
        if (storedStatus === 'guest') {
            setAuthStatus('guest');
            setActiveDbOwner({id: 'guest_user', name: 'Guest', email: 'Local Session'});
        } else {
            setAuthStatus('idle');
        }
        return;
    }
    
    // Fix: Replaced `firebase.auth.User` with `any` to resolve the "Cannot find namespace 'firebase'" error.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any | null) => {
      if (firebaseUser) {
        const { uid, displayName, email } = firebaseUser;
        if (displayName && email) {
            const currentUser = { id: uid, name: displayName, email };
            if (db) {
                db.collection('users').doc(uid).set({ name: displayName, email }, { merge: true });
                const sharesSnap = await db.collection('shares').where('viewerId', '==', uid).get();
                const shares: DBOwner[] = sharesSnap.docs.map((doc: any) => ({
                    id: doc.data().ownerId,
                    name: doc.data().ownerName,
                    email: doc.data().ownerEmail,
                }));
                setSharedDbs(shares);
            }
            setUser(currentUser);
            
            if (sharedDbs.length > 0) {
              setAuthStatus('selecting_db');
            } else {
              setActiveDbOwner(currentUser);
              setViewMode('own');
              setAuthStatus('authenticated');
            }
        } else {
            console.error("Firebase user is missing display name or email.");
            resetAuthState();
            setAuthStatus('idle');
        }
      } else {
        resetAuthState();
        const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
        if (storedStatus === 'guest') {
            setAuthStatus('guest');
            setActiveDbOwner({id: 'guest_user', name: 'Guest', email: 'Local Session'});
        } else {
            setAuthStatus('idle');
        }
      }
    });

    return () => unsubscribe();
  }, [resetAuthState, sharedDbs.length]);
  

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
    setActiveDbOwner({id: 'guest_user', name: 'Guest', email: 'Local Session'});
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
  
  const selectDb = (owner: DBOwner) => {
    setActiveDbOwner(owner);
    setViewMode(owner.id === user?.id ? 'own' : 'shared');
    setAuthStatus('authenticated');
  };

  const value = useMemo(() => ({
    user,
    authStatus,
    sharedDbs,
    activeDbOwner,
    viewMode,
    isReadOnly,
    signInWithGoogle,
    continueAsGuest,
    logout,
    selectDb
  }), [user, authStatus, sharedDbs, activeDbOwner, viewMode, isReadOnly]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};