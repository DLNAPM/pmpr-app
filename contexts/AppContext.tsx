import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Property, Payment, Repair, RepairStatus, Contractor } from '../types';
import { useAuth, User } from './AuthContext';
import { db, isFirebaseConfigured } from '../firebaseConfig';

// This is the initial data for a new GUEST user.
const initialGuestData = {
    properties: [
        {
            id: 'prop1',
            name: 'Sunset Apartments, Unit 101',
            address: '123 Ocean View Dr, Miami, FL',
            tenants: [{id: 't1', name: 'John Doe', phone: '555-1234', email: 'john.doe@email.com'}],
            leaseStart: '2023-08-01T00:00:00.000Z',
            leaseEnd: '2024-07-31T00:00:00.000Z',
            securityDeposit: 1500,
            rentAmount: 1500,
            utilitiesToTrack: ['Water', 'Electricity', 'Internet'],
        },
    ],
    payments: [
        {
            id: 'payment1',
            propertyId: 'prop1',
            month: new Date().getMonth() + 1, // Last month (Corrected to be 1-indexed)
            year: new Date().getFullYear(),
            rentBillAmount: 1500,
            rentPaidAmount: 1500,
            utilities: [
                { category: 'Water', billAmount: 50, paidAmount: 50 },
                { category: 'Electricity', billAmount: 85, paidAmount: 85 },
                { category: 'Internet', billAmount: 60, paidAmount: 0 },
            ],
            paymentDate: new Date().toISOString()
        }
    ],
    repairs: [],
    contractors: [
        { id: 'c1', name: 'Bob Smith', contact: '555-PLUMBER', companyName: 'Reliable Plumbing', email: 'bob@reliable.com', companyAddress: '123 Pipe St, Plumberville', comments: 'Available 24/7 for emergencies.' },
        { id: 'c2', name: 'Jane Spark', contact: '555-SPARKY', companyName: 'Sparky Electricians', email: 'jane@sparky.com', companyAddress: '456 Circuit Ave, Ohmstown', comments: '' }
    ],
};


interface AppContextType {
  properties: Property[];
  payments: Payment[];
  repairs: Repair[];
  contractors: Contractor[];
  isLoading: boolean;
  addProperty: (property: Omit<Property, 'id'>) => void;
  updateProperty: (updatedProperty: Property) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (updatedPayment: Payment) => void;
  addRepair: (repair: Omit<Repair, 'id'>) => void;
  updateRepair: (updatedRepair: Repair) => void;
  addContractor: (contractor: Omit<Contractor, 'id'>) => Contractor;
  updateContractor: (updatedContractor: Contractor) => void;
  getPropertyById: (id: string) => Property | undefined;
  getContractorById: (id: string) => Contractor | undefined;
  getPaymentsForProperty: (propertyId: string) => Payment[];
  getRepairsForProperty: (propertyId: string) => Repair[];
  searchProperties: (query: string) => Property[];
  getSiteHealthScore: (propertyId: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// This provider handles data for GUEST users using localStorage
const GuestDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const propertiesInitialValue = useMemo(() => localStorage.getItem('pmpr_guest_properties') === null ? initialGuestData.properties : [], []);
    const paymentsInitialValue = useMemo(() => localStorage.getItem('pmpr_guest_payments') === null ? initialGuestData.payments : [], []);
    const repairsInitialValue = useMemo(() => localStorage.getItem('pmpr_guest_repairs') === null ? initialGuestData.repairs : [], []);
    const contractorsInitialValue = useMemo(() => localStorage.getItem('pmpr_guest_contractors') === null ? initialGuestData.contractors : [], []);

    const [properties, setProperties] = useLocalStorage<Property[]>('pmpr_guest_properties', propertiesInitialValue);
    const [payments, setPayments] = useLocalStorage<Payment[]>('pmpr_guest_payments', paymentsInitialValue);
    const [repairs, setRepairs] = useLocalStorage<Repair[]>('pmpr_guest_repairs', repairsInitialValue);
    const [contractors, setContractors] = useLocalStorage<Contractor[]>('pmpr_guest_contractors', contractorsInitialValue);
    
    // Guest-specific data logic
    const addProperty = (property: Omit<Property, 'id'>) => setProperties(p => [...p, { ...property, id: crypto.randomUUID() }]);
    const updateProperty = (updated: Property) => setProperties(p => p.map(prop => prop.id === updated.id ? updated : prop));
    const addPayment = (payment: Omit<Payment, 'id'>) => setPayments(p => [...p, { ...payment, id: crypto.randomUUID() }]);
    const updatePayment = (updated: Payment) => setPayments(p => p.map(pay => pay.id === updated.id ? updated : pay));
    const addRepair = (repair: Omit<Repair, 'id'>) => setRepairs(r => [...r, { ...repair, id: crypto.randomUUID() }]);
    const updateRepair = (updated: Repair) => setRepairs(r => r.map(rep => rep.id === updated.id ? updated : rep));
    const addContractor = (contractor: Omit<Contractor, 'id'>) => {
        const newContractor = { ...contractor, id: crypto.randomUUID() };
        setContractors(c => [...c, newContractor]);
        return newContractor;
    };
    const updateContractor = (updated: Contractor) => setContractors(c => c.map(con => con.id === updated.id ? updated : con));

    const value = useMemo(() => ({
        properties, payments, repairs, contractors, addProperty, updateProperty, addPayment, updatePayment, addRepair, updateRepair, addContractor, updateContractor
    }), [properties, payments, repairs, contractors]);

    return <AppProviderLogic data={value} isLoading={false}>{children}</AppProviderLogic>;
};

// This provider handles data for AUTHENTICATED users using FIREBASE FIRESTORE
const AuthenticatedDataProvider: React.FC<{ user: User, children: React.ReactNode }> = ({ user, children }) => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [repairs, setRepairs] = useState<Repair[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isFirebaseConfigured || !db) {
            console.error("Firestore is not configured. Data cannot be loaded.");
            setIsLoading(false);
            return;
        }

        const collections = ['properties', 'payments', 'repairs', 'contractors'];
        const setters = [setProperties, setPayments, setRepairs, setContractors];
        const unsubscribes = collections.map((collectionName, index) => {
            return db.collection(collectionName)
                .where('userId', '==', user.id)
                .onSnapshot((snapshot: any) => {
                    const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
                    setters[index](data as any); // Using 'any' due to varied types
                    setIsLoading(false); // Set loading to false after first data load
                }, (error: any) => {
                    console.error(`Error fetching ${collectionName}: `, error);
                    setIsLoading(false);
                });
        });

        // Cleanup function to detach listeners
        return () => unsubscribes.forEach(unsub => unsub());

    }, [user.id]);
    
    const addProperty = (property: Omit<Property, 'id'>) => { db.collection('properties').add({ ...property, userId: user.id }); };
    const updateProperty = (updated: Property) => { const { id, ...data } = updated; db.collection('properties').doc(id).set(data, { merge: true }); };
    
    const addPayment = (payment: Omit<Payment, 'id'>) => { db.collection('payments').add({ ...payment, userId: user.id }); };
    const updatePayment = (updated: Payment) => { const { id, ...data } = updated; db.collection('payments').doc(id).set(data, { merge: true }); };

    const addRepair = (repair: Omit<Repair, 'id'>) => { db.collection('repairs').add({ ...repair, userId: user.id }); };
    const updateRepair = (updated: Repair) => { const { id, ...data } = updated; db.collection('repairs').doc(id).set(data, { merge: true }); };

    const addContractor = (contractor: Omit<Contractor, 'id'>) => {
        const newContractor = { ...contractor, userId: user.id };
        const docRef = db.collection('contractors').doc();
        docRef.set(newContractor);
        return { ...newContractor, id: docRef.id };
    };
    const updateContractor = (updated: Contractor) => { const { id, ...data } = updated; db.collection('contractors').doc(id).set(data, { merge: true }); };


    const value = useMemo(() => ({
        properties, payments, repairs, contractors, addProperty, updateProperty, addPayment, updatePayment, addRepair, updateRepair, addContractor, updateContractor
    }), [properties, payments, repairs, contractors]);
    
    return <AppProviderLogic data={value} isLoading={isLoading}>{children}</AppProviderLogic>;
};


// This component contains the shared logic (getters, health score) that both providers use.
const AppProviderLogic: React.FC<{data: any, isLoading: boolean, children: React.ReactNode}> = ({ data, isLoading, children }) => {
    const { properties, payments, repairs, contractors } = data;

    const getPropertyById = (id: string) => properties.find((p: Property) => p.id === id);
    const getContractorById = (id: string) => contractors.find((c: Contractor) => c.id === id);
    const getPaymentsForProperty = (propertyId: string) => payments.filter((p: Payment) => p.propertyId === propertyId);
    const getRepairsForProperty = (propertyId: string) => repairs.filter((r: Repair) => r.propertyId === propertyId);
    
    const searchProperties = (query: string) => {
        if (!query) return properties;
        const lowerCaseQuery = query.toLowerCase();
        return properties.filter((p: Property) => 
            p.name.toLowerCase().includes(lowerCaseQuery) ||
            p.address.toLowerCase().includes(lowerCaseQuery) ||
            p.tenants.some(t => t.name.toLowerCase().includes(lowerCaseQuery))
        );
    };

    const getSiteHealthScore = (propertyId: string) => {
        const propertyPayments = getPaymentsForProperty(propertyId);
        const propertyRepairs = getRepairsForProperty(propertyId);
        let score = 100;
        if (propertyPayments.length === 0) return 75;
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        propertyPayments.forEach((payment: Payment) => {
            if (payment.year < currentYear || (payment.year === currentYear && payment.month < currentMonth)) {
                if (payment.rentPaidAmount < payment.rentBillAmount) {
                    score -= 10;
                }
                const unpaidUtils = payment.utilities.filter(u => u.paidAmount < u.billAmount).length;
                score -= unpaidUtils * 2;
            }
        });
        const openRepairs = propertyRepairs.filter((r: Repair) => r.status !== RepairStatus.COMPLETE).length;
        score -= openRepairs * 5;
        return Math.max(0, Math.min(100, score));
    };

    const value = useMemo(() => ({
        ...data,
        isLoading,
        getPropertyById,
        getContractorById,
        getPaymentsForProperty,
        getRepairsForProperty,
        searchProperties,
        getSiteHealthScore
    }), [data, isLoading]);

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

    // This is the placeholder data provider for when the app is loading or uninitialized.
    const loadingData = {
      properties: [],
      payments: [],
      repairs: [],
      contractors: [],
      addProperty: () => { console.warn("Data context not ready."); },
      updateProperty: () => { console.warn("Data context not ready."); },
      addPayment: () => { console.warn("Data context not ready."); },
      updatePayment: () => { console.warn("Data context not ready."); },
      addRepair: () => { console.warn("Data context not ready."); },
      updateRepair: () => { console.warn("Data context not ready."); },
      addContractor: (c: Omit<Contractor, 'id'>) => {
        console.warn("Data context not ready.");
        return { ...c, id: 'loading-id' };
      },
      updateContractor: () => { console.warn("Data context not ready."); }
    };

    return <AppProviderLogic data={loadingData} isLoading={true}>{children}</AppProviderLogic>;
};


export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};