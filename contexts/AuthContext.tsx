
import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '../firebaseConfig';
import { DBOwner, Share, User } from '../types';

// Declare the global firebase object provided by the scripts in index.html
declare const firebase: any;

type AuthStatus = 'idle' | 'guest' | 'authenticated' | 'loading' | 'selecting_db';
export type ViewMode = 'own' | 'shared';

interface AuthContextType {
  user: User | null;
  authStatus: AuthStatus;
  isReadOnly: boolean;
  activeDbOwner: DBOwner | null;
  sharedDbOwners: DBOwner[];
  signInWithGoogle: () => void;
  continueAsGuest: () => void;
  logout: () => void;
  selectDb: (owner: DBOwner) => void;
  updateProfile: (profile: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [sharedDbOwners, setSharedDbOwners] = useState<DBOwner[]>([]);
  const [activeDbOwner, setActiveDbOwner] = useState<DBOwner | null>(null);

  const isReadOnly = useMemo(() => {
    if (!user || !activeDbOwner) return false;
    return user.id !== activeDbOwner.id;
  }, [user, activeDbOwner]);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setSharedDbOwners([]);
    setActiveDbOwner(null);
    sessionStorage.removeItem('pmpr_authStatus');
  }, []);

  useEffect(() => {
    if (!auth) {
        const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
        if (storedStatus === 'guest') {
            setAuthStatus('guest');
        } else {
            setAuthStatus('idle');
        }
        return;
    }
    
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any | null) => {
      if (firebaseUser) {
        const { uid, displayName, email } = firebaseUser;
        
        const safeEmail = email || '';
        const safeName = displayName || safeEmail.split('@')[0] || 'Google User';
        
        let profileData = {};
        if (db) {
            try {
                const doc = await db.collection('users').doc(uid).get();
                if (doc.exists) {
                    profileData = doc.data();
                }
            } catch (e) {
                console.warn("Could not fetch user profile", e);
            }
        }

        const currentUser: User = { 
            id: uid, 
            name: safeName, 
            email: safeEmail,
            ...profileData
        };

        setUser(currentUser);

        if (db) {
            try {
                await db.collection('users').doc(uid).set({ 
                    name: safeName, 
                    email: safeEmail,
                    lastLogin: new Date().toISOString()
                }, { merge: true });
                
                const sharesSnap = await db.collection('shares').where('viewerId', '==', uid).get();
                const shares: Share[] = sharesSnap.docs.map((doc: any) => doc.data());
                
                if (shares.length > 0) {
                    const ownerIds = [...new Set(shares.map(s => s.ownerId))];
                    const owners = ownerIds.map(id => {
                        const firstShare = shares.find(s => s.ownerId === id)!;
                        return { id: firstShare.ownerId, name: firstShare.ownerName, email: firstShare.ownerEmail };
                    });
                    setSharedDbOwners(owners);
                    setAuthStatus('selecting_db');
                } else {
                    setActiveDbOwner(currentUser);
                    setAuthStatus('authenticated');
                }
            } catch (e) {
                console.warn("Firestore access denied. Using basic auth info.", e);
                setActiveDbOwner(currentUser);
                setAuthStatus('authenticated');
            }
        } else {
             setActiveDbOwner(currentUser);
             setAuthStatus('authenticated');
        }
      } else {
        resetAuthState();
        const storedStatus = sessionStorage.getItem('pmpr_authStatus') as AuthStatus;
        if (storedStatus === 'guest') {
            setAuthStatus('guest');
        } else {
            setAuthStatus('idle');
        }
      }
    });

    return () => unsubscribe();
  }, [resetAuthState]);
  

  const signInWithGoogle = async () => {
    if (!auth) {
        alert("Google Sign-In is currently unavailable.");
        return;
    }
    setAuthStatus('loading');
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await auth.signInWithPopup(provider);
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user') {
            setAuthStatus('idle');
            return;
        }
        alert(`Authentication failed: ${error.message}`);
        setAuthStatus('idle');
    }
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

  const selectDb = (owner: DBOwner) => {
      setActiveDbOwner(owner);
      setAuthStatus('authenticated');
  };

  const updateProfile = async (profile: Partial<User>) => {
      if (!user || !db) return;
      await db.collection('users').doc(user.id).set(profile, { merge: true });
      setUser(prev => prev ? { ...prev, ...profile } : null);
  };
  
  const value = useMemo(() => ({
    user,
    authStatus,
    isReadOnly,
    activeDbOwner,
    sharedDbOwners,
    signInWithGoogle,
    continueAsGuest,
    logout,
    selectDb,
    updateProfile,
  }), [user, authStatus, isReadOnly, activeDbOwner, sharedDbOwners]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
