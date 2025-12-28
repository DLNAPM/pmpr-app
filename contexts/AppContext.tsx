
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Property, Payment, Repair, RepairStatus, Contractor, Share, Tenant, DBOwner, Notification } from '../types';
import { useAuth, User } from './AuthContext';
import { db } from '../firebaseConfig';

// Declare the global firebase object
declare const firebase: any;

const GUEST_KEYS = {
    props: 'pmpr_guest_properties',
    payments: 'pmpr_guest_payments',
    repairs: 'pmpr_guest_repairs',
    contractors: 'pmpr_guest_contractors',
    notifications: 'pmpr_guest_notifications'
};

const initialGuestData = {
    properties: [],
    payments: [],
    repairs: [],
    contractors: [],
    notifications: [],
};

interface AppContextType {
  properties: Property[];
  payments: Payment[];
  repairs: Repair[];
  contractors: Contractor[];
  notifications: Notification[];
  isLoading: boolean;
  isMigrating: boolean;
  addProperty: (property: Omit<Property, 'id' | 'userId'>) => void;
  updateProperty: (updatedProperty: Property) => void;
  deleteProperty: (propertyId: string) => void;
  addPayment: (payment: Omit<Payment, 'id'| 'userId'>) => void;
  updatePayment: (updatedPayment: Payment) => void;
  deletePayment: (paymentId: string) => void;
  addRepair: (repair: Omit<Repair, 'id'| 'userId'>) => void;
  updateRepair: (updatedRepair: Repair) => void;
  deleteRepair: (repairId: string) => void;
  addContractor: (contractor: Omit<Contractor, 'id'| 'userId'>) => Contractor;
  updateContractor: (updatedContractor: Contractor) => void;
  addNotification: (notification: Omit<Notification, 'id'|'userId'|'senderId'|'senderName'|'senderEmail'|'timestamp'|'isAcknowledged'>) => Promise<void>;
  updateNotification: (notificationId: string, updates: Partial<Notification>) => void;
  deleteNotification: (notificationId: string) => void;
  getPropertyById: (id: string) => Property | undefined;
  getContractorById: (id: string) => Contractor | undefined;
  getPaymentsForProperty: (propertyId: string) => Payment[];
  getRepairsForProperty: (propertyId: string) => Repair[];
  searchProperties: (query: string) => Property[];
  getSiteHealthScore: (propertyId: string) => number;
  isUserPropertyOwner: (email: string) => Promise<boolean>;
  getSharesByOwner: () => Promise<Share[]>;
  findUserByEmail: (email: string) => Promise<User | null>;
  addShare: (shareData: Omit<Share, 'id'>) => Promise<void>;
  deleteShare: (shareId: string) => Promise<void>;
  migrateGuestData: () => Promise<void>;
  hasGuestData: boolean;
  clearGuestData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Improved sanitization that preserves 0 values but removes undefined
const sanitizeData = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(sanitizeData).filter(v => v !== undefined);
  } else if (typeof data === 'object') {
    const sanitized: any = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        sanitized[key] = sanitizeData(value);
      }
    });
    return sanitized;
  }
  return data;
};

const GuestDataProvider: React.FC<{ user: User | null, children: React.ReactNode }> = ({ user, children }) => {
    const [properties, setProperties] = useLocalStorage<Property[]>(GUEST_KEYS.props, initialGuestData.properties);
    const [payments, setPayments] = useLocalStorage<Payment[]>(GUEST_KEYS.payments, initialGuestData.payments);
    const [repairs, setRepairs] = useLocalStorage<Repair[]>(GUEST_KEYS.repairs, initialGuestData.repairs);
    const [contractors, setContractors] = useLocalStorage<Contractor[]>(GUEST_KEYS.contractors, initialGuestData.contractors);
    const [notifications, setNotifications] = useLocalStorage<Notification[]>(GUEST_KEYS.notifications, initialGuestData.notifications);
    
    const addProperty = (p: Omit<Property, 'id' | 'userId'>) => setProperties(cur => [...cur, { ...p, id: crypto.randomUUID(), userId: 'guest_user' }]);
    const updateProperty = (updated: Property) => setProperties(cur => cur.map(p => p.id === updated.id ? updated : p));
    const deleteProperty = (id: string) => setProperties(cur => cur.filter(p => p.id !== id));
    const addPayment = (p: Omit<Payment, 'id' | 'userId'>) => setPayments(cur => [...cur, { ...p, id: crypto.randomUUID(), userId: 'guest_user' }]);
    const updatePayment = (updated: Payment) => setPayments(cur => cur.map(p => p.id === updated.id ? updated : p));
    const deletePayment = (id: string) => setPayments(cur => cur.filter(p => p.id !== id));
    const addRepair = (r: Omit<Repair, 'id' | 'userId'>) => setRepairs(cur => [...cur, { ...r, id: crypto.randomUUID(), userId: 'guest_user' }]);
    const updateRepair = (updated: Repair) => setRepairs(cur => cur.map(r => r.id === updated.id ? updated : r));
    const deleteRepair = (id: string) => setRepairs(cur => cur.filter(r => r.id !== id));
    const addContractor = (c: Omit<Contractor, 'id' | 'userId'>) => { const nc = { ...c, id: crypto.randomUUID(), userId: 'guest_user' }; setContractors(cur => [...cur, nc]); return nc; };
    const updateContractor = (updated: Contractor) => setContractors(cur => cur.map(c => c.id === updated.id ? updated : c));
    const addNotification = async (n: Omit<Notification, 'id'|'userId'|'senderId'|'senderName'|'senderEmail'|'timestamp'|'isAcknowledged'>) => { setNotifications(current => [...current, { ...n, id: crypto.randomUUID(), userId: 'guest_user', senderId: 'guest_user', senderName: 'Guest', senderEmail: 'guest@local.com', timestamp: new Date().toISOString(), isAcknowledged: false }]); };
    const updateNotification = (id: string, updates: Partial<Notification>) => setNotifications(current => current.map(n => n.id === id ? { ...n, ...updates } : n));
    const deleteNotification = (id: string) => setNotifications(current => current.filter(n => n.id !== id));

    const value = useMemo(() => ({ properties, payments, repairs, contractors, notifications, addProperty, updateProperty, deleteProperty, addPayment, updatePayment, deletePayment, addRepair, updateRepair, deleteRepair, addContractor, updateContractor, addNotification, updateNotification, deleteNotification, migrateGuestData: async () => {}, hasGuestData: properties.length > 0, clearGuestData: () => {}, isMigrating: false, isUserPropertyOwner: async () => true }), [properties, payments, repairs, contractors, notifications]);
    return <AppProviderLogic data={value} isLoading={false}>{children}</AppProviderLogic>;
};

const AuthenticatedDataProvider: React.FC<{ user: User, isReadOnly: boolean, activeDbOwner: DBOwner, children: React.ReactNode }> = ({ user, isReadOnly, activeDbOwner, children }) => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [repairs, setRepairs] = useState<Repair[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false);
    const [hasGuestData, setHasGuestData] = useState(false);
    
    // Check if local guest data exists on mount
    useEffect(() => {
        const keys = Object.values(GUEST_KEYS);
        for (const key of keys) {
            const data = localStorage.getItem(key);
            if (data && data !== '[]') {
                setHasGuestData(true);
                return;
            }
        }
        setHasGuestData(false);
    }, []);

    useEffect(() => {
        if (!db || !user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsubs: (() => void)[] = [];
        
        // Single listener tracker for the primary database collections
        let collectionsLoaded = 0;
        const markCollectionLoaded = () => {
            collectionsLoaded++;
            if (collectionsLoaded >= 4) setIsLoading(false);
        };

        // Safety unblock: If Firestore hangs or rules block specific collections
        const safetyTimeout = setTimeout(() => setIsLoading(false), 5000);

        const targetUserId = isReadOnly ? activeDbOwner.id : user.id;

        // Fetch primary collections
        unsubs.push(db.collection('properties').where('userId', '==', targetUserId).onSnapshot(s => { setProperties(s.docs.map(d => ({id: d.id, ...d.data()}))); markCollectionLoaded(); }, () => markCollectionLoaded()));
        unsubs.push(db.collection('payments').where('userId', '==', targetUserId).onSnapshot(s => { setPayments(s.docs.map(d => ({id: d.id, ...d.data()}))); markCollectionLoaded(); }, () => markCollectionLoaded()));
        unsubs.push(db.collection('repairs').where('userId', '==', targetUserId).onSnapshot(s => { setRepairs(s.docs.map(d => ({id: d.id, ...d.data()}))); markCollectionLoaded(); }, () => markCollectionLoaded()));
        unsubs.push(db.collection('contractors').where('userId', '==', targetUserId).onSnapshot(s => { setContractors(s.docs.map(d => ({id: d.id, ...d.data()}))); markCollectionLoaded(); }, () => markCollectionLoaded()));

        // Fetch notifications
        unsubs.push(db.collection('notifications').where('recipientEmail', '==', user.email.toLowerCase()).onSnapshot(s => setNotifications(prev => [...prev.filter(n => n.recipientEmail !== user.email), ...s.docs.map(d => ({id: d.id, ...d.data()}))])));
        unsubs.push(db.collection('notifications').where('senderId', '==', user.id).onSnapshot(s => setNotifications(prev => [...prev.filter(n => n.senderId !== user.id), ...s.docs.map(d => ({id: d.id, ...d.data()}))])));

        return () => {
            clearTimeout(safetyTimeout);
            unsubs.forEach(u => u());
        };
    }, [user, isReadOnly, activeDbOwner]);

    const clearGuestData = useCallback(() => {
        Object.values(GUEST_KEYS).forEach(k => localStorage.removeItem(k));
        setHasGuestData(false);
    }, []);

    const migrateGuestData = async () => {
        if (!db || isReadOnly || !user) return;
        const localProps = JSON.parse(localStorage.getItem(GUEST_KEYS.props) || '[]');
        const localPayments = JSON.parse(localStorage.getItem(GUEST_KEYS.payments) || '[]');
        const localRepairs = JSON.parse(localStorage.getItem(GUEST_KEYS.repairs) || '[]');
        const localContractors = JSON.parse(localStorage.getItem(GUEST_KEYS.contractors) || '[]');

        if (localProps.length === 0 && localContractors.length === 0) {
            clearGuestData();
            return;
        }

        setIsMigrating(true);
        try {
            const propMap: Record<string, string> = {};
            const conMap: Record<string, string> = {};

            // 1. Migrate Contractors first
            for (const c of localContractors) {
                const { id, userId, ...rest } = c;
                const ref = await db.collection('contractors').add(sanitizeData({ ...rest, userId: user.id }));
                conMap[id] = ref.id;
            }

            // 2. Migrate Properties
            for (const p of localProps) {
                const { id, userId, ...rest } = p;
                const ref = await db.collection('properties').add(sanitizeData({ ...rest, userId: user.id }));
                propMap[id] = ref.id;
            }

            // 3. Migrate Related Payments and Repairs
            const migrations = [];
            for (const p of localPayments) {
                const { id, userId, propertyId, ...rest } = p;
                const cloudPropId = propMap[propertyId];
                if (cloudPropId) migrations.push(db.collection('payments').add(sanitizeData({ ...rest, propertyId: cloudPropId, userId: user.id })));
            }
            for (const r of localRepairs) {
                const { id, userId, propertyId, contractorId, ...rest } = r;
                const cloudPropId = propMap[propertyId];
                const cloudConId = contractorId ? conMap[contractorId] : null;
                if (cloudPropId) migrations.push(db.collection('repairs').add(sanitizeData({ ...rest, propertyId: cloudPropId, contractorId: cloudConId, userId: user.id })));
            }

            await Promise.all(migrations);
            clearGuestData();
            alert("Success! Your property data has been migrated to your Cloud account.");
        } catch (e: any) {
            console.error("Migration error:", e);
            alert(`Migration failed: ${e.message || 'Unknown error. Ensure you have a stable connection.'}`);
        } finally {
            setIsMigrating(false);
        }
    };

    const addProperty = (p: Omit<Property, 'id' | 'userId'>) => { if (!isReadOnly) db.collection('properties').add(sanitizeData({ ...p, userId: user.id })); };
    const updateProperty = (up: Property) => { if (!isReadOnly) { const { id, ...data } = up; db.collection('properties').doc(id).set(sanitizeData(data), { merge: true }); }};
    const deleteProperty = async (id: string) => { if(!isReadOnly) { const batch = db.batch(); const pQuery = await db.collection('payments').where('propertyId', '==', id).get(); pQuery.forEach((doc: any) => batch.delete(doc.ref)); const rQuery = await db.collection('repairs').where('propertyId', '==', id).get(); rQuery.forEach((doc: any) => batch.delete(doc.ref)); batch.delete(db.collection('properties').doc(id)); await batch.commit(); }};
    const addPayment = (p: Omit<Payment, 'id' | 'userId'>) => { if (!isReadOnly) db.collection('payments').add(sanitizeData({ ...p, userId: user.id })); };
    const updatePayment = (up: Payment) => { if (!isReadOnly) { const { id, ...data } = up; db.collection('payments').doc(id).set(sanitizeData(data), { merge: true }); }};
    const deletePayment = (id: string) => { if (!isReadOnly) db.collection('payments').doc(id).delete(); };
    const addRepair = (r: Omit<Repair, 'id' | 'userId'>) => { if (!isReadOnly) db.collection('repairs').add(sanitizeData({ ...r, userId: user.id })); };
    const updateRepair = (ur: Repair) => { if (!isReadOnly) { const { id, ...data } = ur; db.collection('repairs').doc(id).set(sanitizeData(data), { merge: true }); }};
    const deleteRepair = (id: string) => { if (!isReadOnly) db.collection('repairs').doc(id).delete(); };
    const addContractor = (c: Omit<Contractor, 'id' | 'userId'>) => { const ref = db.collection('contractors').doc(); if (!isReadOnly) ref.set(sanitizeData({ ...c, userId: user.id })); return { ...c, id: ref.id, userId: user.id }; };
    const updateContractor = (uc: Contractor) => { if (!isReadOnly) { const { id, ...data } = uc; db.collection('contractors').doc(id).set(sanitizeData(data), { merge: true }); }};
    const addNotification = async (n: Omit<Notification, 'id'|'userId'|'senderId'|'senderName'|'senderEmail'|'timestamp'|'isAcknowledged'>) => { await db.collection('notifications').add(sanitizeData({ ...n, userId: user.id, senderId: user.id, senderName: user.name, senderEmail: user.email, timestamp: new Date().toISOString(), isAcknowledged: false })); };
    const updateNotification = (id: string, updates: Partial<Notification>) => { db.collection('notifications').doc(id).update(sanitizeData(updates)); };
    const deleteNotification = (id: string) => { db.collection('notifications').doc(id).delete(); };

    const value = useMemo(() => ({ properties, payments, repairs, contractors, notifications, addProperty, updateProperty, deleteProperty, addPayment, updatePayment, deletePayment, addRepair, updateRepair, deleteRepair, addContractor, updateContractor, addNotification, updateNotification, deleteNotification, getSharesByOwner: async () => { const snap = await db.collection('shares').where('ownerId', '==', user.id).get(); return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })); }, findUserByEmail: async (email: string) => { const snap = await db.collection('users').where('email', '==', email).limit(1).get(); return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as User; }, addShare: async (s: Omit<Share, 'id'>) => { await db.collection('shares').add(s); }, deleteShare: async (id: string) => { await db.collection('shares').doc(id).delete(); }, migrateGuestData, clearGuestData, hasGuestData, isMigrating, isUserPropertyOwner: async () => properties.length > 0 }), [properties, payments, repairs, contractors, notifications, user?.id, isReadOnly, hasGuestData, isMigrating, isLoading]);
    
    return <AppProviderLogic data={value} isLoading={isLoading}>{children}</AppProviderLogic>;
};

const AppProviderLogic: React.FC<{data: any, isLoading: boolean, children: React.ReactNode}> = ({ data, isLoading, children }) => {
    const { properties, payments, repairs, contractors } = data;
    const getPropertyById = (id: string) => properties.find((p: Property) => p.id === id);
    const getContractorById = (id: string) => contractors.find((c: Contractor) => c.id === id);
    const getPaymentsForProperty = (propertyId: string) => payments.filter((p: Payment) => p.propertyId === propertyId);
    const getRepairsForProperty = (propertyId: string) => repairs.filter((r: Repair) => r.propertyId === propertyId);
    const searchProperties = (query: string) => { const lq = query.toLowerCase(); return properties.filter((p: Property) => p.name.toLowerCase().includes(lq) || p.address.toLowerCase().includes(lq)); };
    const getSiteHealthScore = (id: string) => { const ps = getPaymentsForProperty(id); const rs = getRepairsForProperty(id); let s = 100; if (ps.length === 0) return 75; ps.forEach(p => { if (p.rentPaidAmount < p.rentBillAmount) s -= 10; }); s -= rs.filter(r => r.status !== RepairStatus.COMPLETE).length * 5; return Math.max(0, Math.min(100, s)); };
    
    const value = useMemo(() => ({ ...data, isLoading, getPropertyById, getContractorById, getPaymentsForProperty, getRepairsForProperty, searchProperties, getSiteHealthScore }), [data, isLoading]);
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authStatus, user, isReadOnly, activeDbOwner } = useAuth();
    if (authStatus === 'authenticated' && user && activeDbOwner) return <AuthenticatedDataProvider user={user} isReadOnly={isReadOnly} activeDbOwner={activeDbOwner}>{children}</AuthenticatedDataProvider>;
    if (authStatus === 'guest') return <GuestDataProvider user={user}>{children}</GuestDataProvider>;
    const ld = { properties: [], payments: [], repairs: [], contractors: [], notifications: [], migrateGuestData: async() => {}, hasGuestData: false, clearGuestData: () => {}, isMigrating: false };
    return <AppProviderLogic data={ld} isLoading={authStatus === 'loading'}>{children}</AppProviderLogic>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
