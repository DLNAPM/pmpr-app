
import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '../firebaseConfig';
import { DBOwner, Share } from '../types';

// Declare the global firebase object provided by the scripts in index.html
declare const firebase: any;

type AuthStatus = 'idle' | 'guest' | 'authenticated' | 'loading' | 'selecting_db';
export type ViewMode = 'own' | 'shared';

export interface User {
  id: string;
  name: string;
  email: string;
}

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
        
        const currentUser: User = { 
            id: uid, 
            name: safeName, 
            email: safeEmail 
        };

        // CRITICAL FIX: Set user immediately so UI components have the profile info
        setUser(currentUser);

        if (db) {
            try {
                // Sync user info to Firestore - if this fails due to rules, the catch block handles it
                await db.collection('users').doc(uid).set({ 
                    name: safeName, 
                    email: safeEmail,
                    lastLogin: new Date().toISOString()
                }, { merge: true });
                
                // Check for shares
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
                console.warn("Firestore access denied. Check your Security Rules in Firebase Console.", e);
                // Fallback: Proceed with authentication using auth info only
                setActiveDbOwner(currentUser);
                setAuthStatus('authenticated');
            }
        } else {
             // Fallback: No DB service available, use auth info only
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
        alert("Google Sign-In is currently unavailable. Please check your internet connection and ensure Firebase is correctly configured.");
        return;
    }
    
    setAuthStatus('loading');

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        await auth.signInWithPopup(provider);
        
    } catch (error: any) {
        console.error("Authentication failed:", error);
        
        if (error.code === 'auth/popup-closed-by-user') {
            setAuthStatus('idle');
            return;
        }

        if (error.code === 'auth/popup-blocked') {
            alert("The sign-in popup was blocked by your browser. Please allow popups for this site or try again.");
        } else {
            alert(`Authentication failed: ${error.message}`);
        }
        
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
