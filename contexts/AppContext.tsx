import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Property, Payment, Repair, RepairStatus, Contractor, Share } from '../types';
import { useAuth, User } from './AuthContext';
import { db } from '../firebaseConfig';

// --- Create more robust initial data for the previous month ---
const now = new Date();
const prevMonthDate = new Date(now.getFullYear(), now.getMonth(), 0);
const prevMonth = prevMonthDate.getMonth() + 1;
const prevMonthYear = prevMonthDate.getFullYear();

const initialGuestData = {
    properties: [ { id: 'prop1', name: 'Sunset Apartments, Unit 101', address: '123 Ocean View Dr, Miami, FL', tenants: [{id: 't1', name: 'John Doe', phone: '555-1234', email: 'john.doe@email.com'}], leaseStart: '2023-08-01T00:00:00.000Z', leaseEnd: '2024-07-31T00:00:00.000Z', securityDeposit: 1500, rentAmount: 1500, utilitiesToTrack: ['Water', 'Electricity', 'Internet'], }, ],
    payments: [ { id: 'payment1', propertyId: 'prop1', month: prevMonth, year: prevMonthYear, rentBillAmount: 1500, rentPaidAmount: 1400, utilities: [ { category: 'Water', billAmount: 50, paidAmount: 50 }, { category: 'Electricity', billAmount: 85, paidAmount: 85 }, { category: 'Internet', billAmount: 60, paidAmount: 0 }, ], notes: 'Paid via check #123. Tenant will pay remaining internet bill next month.', paymentDate: prevMonthDate.toISOString() } ],
    repairs: [],
    contractors: [ { id: 'c1', name: 'Bob Smith', contact: '555-PLUMBER', companyName: 'Reliable Plumbing', email: 'bob@reliable.com', companyAddress: '123 Pipe St, Plumberville', comments: 'Available 24/7 for emergencies.' }, { id: 'c2', name: 'Jane Spark', contact: '555-SPARKY', companyName: 'Sparky Electricians', email: 'jane@sparky.com', companyAddress: '456 Circuit Ave, Ohmstown', comments: '' } ],
};

interface AppContextType {
  properties: Property[];
  payments: Payment[];
  repairs: Repair[];
  contractors: Contractor[];
  isLoading: boolean;
  addProperty: (property: Omit<Property, 'id'>) => void;
  updateProperty: (updatedProperty: Property) => void;
  deleteProperty: (propertyId: string) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (updatedPayment: Payment) => void;
  deletePayment: (paymentId: string) => void;
  addRepair: (repair: Omit<Repair, 'id'>) => void;
  updateRepair: (updatedRepair: Repair) => void;
  deleteRepair: (repairId: string) => void;
  addContractor: (contractor: Omit<Contractor, 'id'>) => Contractor;
  updateContractor: (updatedContractor: Contractor) => void;
  getPropertyById: (id: string) => Property | undefined;
  getContractorById: (id: string) => Contractor | undefined;
  getPaymentsForProperty: (propertyId: string) => Payment[];
  getRepairsForProperty: (propertyId: string) => Repair[];
  searchProperties: (query: string) => Property[];
  getSiteHealthScore: (propertyId: string) => number;
  // Share functions
  getSharesForOwner: () => Promise<Share[]>;
  findUserByEmail: (email: string) => Promise<{ id: string; name: string; email: string; } | null>;
  addShare: (share: Omit<Share, 'id'>) => Promise<void>;
  deleteShare: (shareId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const recalculateNextMonthBalance = async ( changedPayment: Payment | { propertyId: string; year: number; month: number }, allPayments: Payment[], allProperties: Property[], updateFn: (payment: Payment) => void, isDeletion: boolean = false ) => {
    const { propertyId, year, month } = changedPayment;
    const property = allProperties.find(p => p.id === propertyId);
    if (!property) return;
    const paymentsForProperty = allPayments.filter(p => p.propertyId === propertyId).sort((a, b) => a.year - b.year || a.month - a.month);
    const currentIndex = paymentsForProperty.findIndex(p => p.year === year && p.month === month);
    const baseIndex = isDeletion ? currentIndex - 1 : currentIndex;
    const balanceSourcePayment = baseIndex >= 0 ? paymentsForProperty[baseIndex] : null;
    const balanceCarriedForward = balanceSourcePayment ? Math.max(0, balanceSourcePayment.rentBillAmount - balanceSourcePayment.rentPaidAmount) : 0;
    const nextPaymentIndex = baseIndex + 1;
    if (nextPaymentIndex < paymentsForProperty.length) {
        const nextPayment = paymentsForProperty[nextPaymentIndex];
        const newNextMonthBill = property.rentAmount + balanceCarriedForward;
        if (nextPayment.rentBillAmount !== newNextMonthBill) {
            updateFn({ ...nextPayment, rentBillAmount: newNextMonthBill });
        }
    }
};

const GuestDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const propertiesInitialValue = useMemo(() => localStorage.getItem('pmpr_guest_properties') === null ? initialGuestData.properties : [], []);
    const paymentsInitialValue = useMemo(() => localStorage.getItem('pmpr_guest_payments') === null ? initialGuestData.payments : [], []);
    const repairsInitialValue = useMemo(() => localStorage.getItem('pmpr_guest_repairs') === null ? initialGuestData.repairs : [], []);
    const contractorsInitialValue = useMemo(() => localStorage.getItem('pmpr_guest_contractors') === null ? initialGuestData.contractors : [], []);

    const [properties, setProperties] = useLocalStorage<Property[]>('pmpr_guest_properties', propertiesInitialValue);
    const [payments, setPayments] = useLocalStorage<Payment[]>('pmpr_guest_payments', paymentsInitialValue);
    const [repairs, setRepairs] = useLocalStorage<Repair[]>('pmpr_guest_repairs', repairsInitialValue);
    const [contractors, setContractors] = useLocalStorage<Contractor[]>('pmpr_guest_contractors', contractorsInitialValue);
    
    const addProperty = (property: Omit<Property, 'id'>) => setProperties(p => [...p, { ...property, id: crypto.randomUUID() }]);
    const updateProperty = (updated: Property) => setProperties(p => p.map(prop => prop.id === updated.id ? updated : prop));
    const deleteProperty = (id: string) => { setProperties(p => p.filter(prop => prop.id !== id)); setPayments(p => p.filter(pay => pay.propertyId !== id)); setRepairs(r => r.filter(rep => rep.propertyId !== id)); };
    const updatePayment = (updated: Payment) => { setPayments(currentPayments => { const updatedPayments = currentPayments.map(pay => pay.id === updated.id ? updated : pay); recalculateNextMonthBalance(updated, updatedPayments, properties, (p) => { const index = updatedPayments.findIndex(up => up.id === p.id); if (index > -1) updatedPayments[index] = p; }); return updatedPayments; }); };
    const addPayment = (payment: Omit<Payment, 'id'>) => { const newPayment = { ...payment, id: crypto.randomUUID() }; setPayments(currentPayments => { const updatedPayments = [...currentPayments, newPayment]; recalculateNextMonthBalance(newPayment, updatedPayments, properties, (p) => { const index = updatedPayments.findIndex(up => up.id === p.id); if (index > -1) updatedPayments[index] = p; }); return updatedPayments; }); };
    const deletePayment = (id: string) => { const paymentToDelete = payments.find(p => p.id === id); if (!paymentToDelete) return; setPayments(currentPayments => { const updatedPayments = currentPayments.filter(pay => pay.id !== id); recalculateNextMonthBalance(paymentToDelete, updatedPayments, properties, (p) => { const index = updatedPayments.findIndex(up => up.id === p.id); if (index > -1) updatedPayments[index] = p; }, true); return updatedPayments; }); };
    const addRepair = (repair: Omit<Repair, 'id'>) => setRepairs(r => [...r, { ...repair, id: crypto.randomUUID() }]);
    const updateRepair = (updated: Repair) => setRepairs(r => r.map(rep => rep.id === updated.id ? updated : rep));
    const deleteRepair = (id: string) => setRepairs(r => r.filter(rep => rep.id !== id));
    const addContractor = (contractor: Omit<Contractor, 'id'>) => { const newContractor = { ...contractor, id: crypto.randomUUID() }; setContractors(c => [...c, newContractor]); return newContractor; };
    const updateContractor = (updated: Contractor) => setContractors(c => c.map(con => con.id === updated.id ? updated : con));

    const value = useMemo(() => ({ properties, payments, repairs, contractors, addProperty, updateProperty, deleteProperty, addPayment, updatePayment, deletePayment, addRepair, updateRepair, deleteRepair, addContractor, updateContractor }), [properties, payments, repairs, contractors]);

    return <AppProviderLogic data={value} isLoading={false}>{children}</AppProviderLogic>;
};

const AuthenticatedDataProvider: React.FC<{ user: User, children: React.ReactNode }> = ({ user, children }) => {
    const { isReadOnly, activeDbOwner } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [repairs, setRepairs] = useState<Repair[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db || !activeDbOwner) { setIsLoading(false); return; }
        setIsLoading(true);
        const collections = ['properties', 'payments', 'repairs', 'contractors'];
        const setters = [setProperties, setPayments, setRepairs, setContractors];
        const unsubscribes = collections.map((collectionName, index) => {
            return db.collection(collectionName)
                .where('userId', '==', activeDbOwner.id)
                .onSnapshot((snapshot: any) => {
                    const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
                    setters[index](data as any);
                    if (index === collections.length - 1) setIsLoading(false);
                }, (error: any) => { console.error(`Error fetching ${collectionName}: `, error); setIsLoading(false); });
        });
        return () => unsubscribes.forEach(unsub => unsub());
    }, [activeDbOwner]);
    
    const guard = (func: Function) => (...args: any) => { if (isReadOnly) { console.warn("Read-only mode: operation blocked."); return; } return func(...args); };
    
    const addProperty = guard((p: Omit<Property, 'id'>) => { db.collection('properties').add({ ...p, userId: user.id }); });
    const updateProperty = guard((up: Property) => { const { id, ...data } = up; db.collection('properties').doc(id).set(data, { merge: true }); });
    const deleteProperty = guard(async (id: string) => { if (!db) return; const batch = db.batch(); const pQuery = await db.collection('payments').where('propertyId', '==', id).get(); pQuery.forEach((doc: any) => batch.delete(doc.ref)); const rQuery = await db.collection('repairs').where('propertyId', '==', id).get(); rQuery.forEach((doc: any) => batch.delete(doc.ref)); const propRef = db.collection('properties').doc(id); batch.delete(propRef); await batch.commit(); });
    const updatePaymentFirestore = (up: Payment) => { const { id, ...data } = up; db.collection('payments').doc(id).set(data, { merge: true }); };
    const updatePayment = guard((up: Payment) => { updatePaymentFirestore(up); recalculateNextMonthBalance(up, payments, properties, updatePaymentFirestore); });
    const addPayment = guard(async (p: Omit<Payment, 'id'>) => { const ref = await db.collection('payments').add({ ...p, userId: user.id }); const final = { ...p, id: ref.id }; recalculateNextMonthBalance(final, [...payments, final], properties, updatePaymentFirestore); });
    const deletePayment = guard(async (id: string) => { const pDel = payments.find(p => p.id === id); if (!pDel) return; await db.collection('payments').doc(id).delete(); recalculateNextMonthBalance(pDel, payments.filter(p => p.id !== id), properties, updatePaymentFirestore, true); });
    const addRepair = guard((r: Omit<Repair, 'id'>) => { db.collection('repairs').add({ ...r, userId: user.id }); });
    const updateRepair = guard((ur: Repair) => { const { id, ...data } = ur; db.collection('repairs').doc(id).set(data, { merge: true }); });
    const deleteRepair = guard((id: string) => { db.collection('repairs').doc(id).delete(); });
    const addContractor = guard((c: Omit<Contractor, 'id'>) => { const ref = db.collection('contractors').doc(); ref.set({ ...c, userId: user.id }); return { ...c, id: ref.id }; });
    const updateContractor = guard((uc: Contractor) => { const { id, ...data } = uc; db.collection('contractors').doc(id).set(data, { merge: true }); });
    
    // Share functions - these always operate on behalf of the logged-in user, not the viewed DB.
    const getSharesForOwner = async (): Promise<Share[]> => { if (!db || !user) return []; const snap = await db.collection('shares').where('ownerId', '==', user.id).get(); return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })); };
    const findUserByEmail = async (email: string) => { if (!db) return null; const snap = await db.collection('users').where('email', '==', email).limit(1).get(); if (snap.empty) return null; const doc = snap.docs[0]; return { id: doc.id, ...doc.data() } as User; };
    const addShare = guard(async (share: Omit<Share, 'id'>) => { if (!db) return; await db.collection('shares').add(share); });
    const deleteShare = guard(async (shareId: string) => { if (!db) return; await db.collection('shares').doc(shareId).delete(); });

    const value = useMemo(() => ({ properties, payments, repairs, contractors, addProperty, updateProperty, deleteProperty, addPayment, updatePayment, deletePayment, addRepair, updateRepair, deleteRepair, addContractor, updateContractor, getSharesForOwner, findUserByEmail, addShare, deleteShare }), [properties, payments, repairs, contractors]);
    return <AppProviderLogic data={value} isLoading={isLoading}>{children}</AppProviderLogic>;
};

const AppProviderLogic: React.FC<{data: any, isLoading: boolean, children: React.ReactNode}> = ({ data, isLoading, children }) => {
    const { properties, payments, repairs, contractors } = data;
    const getPropertyById = (id: string) => properties.find((p: Property) => p.id === id);
    const getContractorById = (id: string) => contractors.find((c: Contractor) => c.id === id);
    const getPaymentsForProperty = (propertyId: string) => payments.filter((p: Payment) => p.propertyId === propertyId);
    const getRepairsForProperty = (propertyId: string) => repairs.filter((r: Repair) => r.propertyId === propertyId);
    const searchProperties = (query: string) => { if (!query) return properties; const lq = query.toLowerCase(); return properties.filter((p: Property) => p.name.toLowerCase().includes(lq) || p.address.toLowerCase().includes(lq) || p.tenants.some(t => t.name.toLowerCase().includes(lq))); };
    const getSiteHealthScore = (propertyId: string) => { const propPayments = getPaymentsForProperty(propertyId); const propRepairs = getRepairsForProperty(propertyId); let score = 100; if (propPayments.length === 0) return 75; const now = new Date(); const currentMonth = now.getMonth() + 1; const currentYear = now.getFullYear(); propPayments.forEach((p: Payment) => { if (p.year < currentYear || (p.year === currentYear && p.month < currentMonth)) { if (p.rentPaidAmount < p.rentBillAmount) score -= 10; score -= p.utilities.filter(u => u.paidAmount < u.billAmount).length * 2; } }); score -= propRepairs.filter((r: Repair) => r.status !== RepairStatus.COMPLETE).length * 5; return Math.max(0, Math.min(100, score)); };
    
    const value = useMemo(() => ({ ...data, isLoading, getPropertyById, getContractorById, getPaymentsForProperty, getRepairsForProperty, searchProperties, getSiteHealthScore }), [data, isLoading]);
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authStatus, user } = useAuth();
    if (authStatus === 'authenticated' && user) {
        return <AuthenticatedDataProvider user={user}>{children}</AuthenticatedDataProvider>;
    }
    if (authStatus === 'guest') {
        return <GuestDataProvider>{children}</GuestDataProvider>;
    }
    const loadingData = { properties: [], payments: [], repairs: [], contractors: [], addProperty: () => {}, updateProperty: () => {}, deleteProperty: () => {}, addPayment: () => {}, updatePayment: () => {}, deletePayment: () => {}, addRepair: () => {}, updateRepair: () => {}, deleteRepair: () => {}, addContractor: (c: Omit<Contractor, 'id'>) => ({ ...c, id: 'loading-id' }), updateContractor: () => {}, getSharesForOwner: async () => [], findUserByEmail: async () => null, addShare: async () => {}, deleteShare: async () => {} };
    return <AppProviderLogic data={loadingData} isLoading={true}>{children}</AppProviderLogic>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};