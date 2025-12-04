import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '../firebaseConfig';
import { Share, DBOwner } from '../types';

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
  isReadOnly: boolean;
  viewMode: ViewMode;
  activeDbOwner: DBOwner | null;
  sharedDbs: Share[];
  isSelectingDb: boolean;
  signInWithGoogle: () => void;
  continueAsGuest: () => void;
  logout: () => void;
  setActiveDbOwner: (owner: DBOwner | null) => void;
  setSelectingDb: (isSelecting: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [activeDbOwner, setActiveDbOwnerState] = useState<DBOwner | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('own');
  const [sharedDbs, setSharedDbs] = useState<Share[]>([]);
  const [isSelectingDb, setSelectingDb] = useState(false);

  const isReadOnly = useMemo(() => viewMode === 'shared', [viewMode]);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setActiveDbOwnerState(null);
    setViewMode('own');
    setSharedDbs([]);
    setSelectingDb(false);
    sessionStorage.removeItem('pmpr_authStatus');
  }, []);

  const setActiveDbOwner = useCallback((owner: DBOwner | null) => {
    if (owner && user && owner.id !== user.id) {
        setActiveDbOwnerState(owner);
        setViewMode('shared');
    } else {
        setActiveDbOwnerState(user);
        setViewMode('own');
    }
    setSelectingDb(false);
  }, [user]);

  useEffect(() => {
    if (!auth) {
        const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
        setAuthStatus(storedStatus === 'guest' ? 'guest' : 'idle');
        return;
    }
    
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any | null) => {
      if (firebaseUser) {
        const { uid, displayName, email } = firebaseUser;
        if (displayName && email) {
            const currentUser = { id: uid, name: displayName, email };
            
            if (db) {
                db.collection('users').doc(uid).set({ name: displayName, email }, { merge: true });
                
                // Check for shares
                const sharesSnap = await db.collection('shares').where('viewerId', '==', uid).get();
                const sharesData = sharesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
                setSharedDbs(sharesData);

                if (sharesData.length > 0) {
                    setSelectingDb(true);
                } else {
                    setActiveDbOwner(currentUser);
                }
            } else {
                 setActiveDbOwner(currentUser);
            }
            setUser(currentUser);
            setAuthStatus('authenticated');
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
  }, [resetAuthState, setActiveDbOwner]);
  

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
  
  const value = useMemo(() => ({
    user,
    authStatus,
    isReadOnly,
    viewMode,
    activeDbOwner,
    sharedDbs,
    isSelectingDb,
    signInWithGoogle,
    continueAsGuest,
    logout,
    setActiveDbOwner,
    setSelectingDb,
  }), [user, authStatus, isReadOnly, viewMode, activeDbOwner, sharedDbs, isSelectingDb, setActiveDbOwner]);

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