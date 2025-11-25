
import React, { createContext, useContext, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Property, Payment, Repair, RepairStatus } from '../types';
import { useAuth, User } from './AuthContext';

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
            month: new Date().getMonth(), // Last month
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
};


interface AppContextType {
  properties: Property[];
  payments: Payment[];
  repairs: Repair[];
  isLoading: boolean;
  addProperty: (property: Omit<Property, 'id'>) => void;
  updateProperty: (updatedProperty: Property) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (updatedPayment: Payment) => void;
  addRepair: (repair: Omit<Repair, 'id'>) => void;
  updateRepair: (updatedRepair: Repair) => void;
  getPropertyById: (id: string) => Property | undefined;
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

    const [properties, setProperties] = useLocalStorage<Property[]>('pmpr_guest_properties', propertiesInitialValue);
    const [payments, setPayments] = useLocalStorage<Payment[]>('pmpr_guest_payments', paymentsInitialValue);
    const [repairs, setRepairs] = useLocalStorage<Repair[]>('pmpr_guest_repairs', repairsInitialValue);
    
    // Guest-specific data logic
    const addProperty = (property: Omit<Property, 'id'>) => setProperties(p => [...p, { ...property, id: crypto.randomUUID() }]);
    const updateProperty = (updated: Property) => setProperties(p => p.map(prop => prop.id === updated.id ? updated : prop));
    const addPayment = (payment: Omit<Payment, 'id'>) => setPayments(p => [...p, { ...payment, id: crypto.randomUUID() }]);
    const updatePayment = (updated: Payment) => setPayments(p => p.map(pay => pay.id === updated.id ? updated : pay));
    const addRepair = (repair: Omit<Repair, 'id'>) => setRepairs(r => [...r, { ...repair, id: crypto.randomUUID() }]);
    const updateRepair = (updated: Repair) => setRepairs(r => r.map(rep => rep.id === updated.id ? updated : rep));
    
    const value = useMemo(() => ({
        properties, payments, repairs, addProperty, updateProperty, addPayment, updatePayment, addRepair, updateRepair
    }), [properties, payments, repairs]);

    return <AppProviderLogic data={value} isLoading={false}>{children}</AppProviderLogic>;
};

// This provider handles data for AUTHENTICATED users
const AuthenticatedDataProvider: React.FC<{ user: User, children: React.ReactNode }> = ({ user, children }) => {
    const propertiesKey = `pmpr_user_${user.id}_properties`;
    const paymentsKey = `pmpr_user_${user.id}_payments`;
    const repairsKey = `pmpr_user_${user.id}_repairs`;

    // Authenticated users start with empty arrays if no data is in localStorage.
    const [properties, setProperties] = useLocalStorage<Property[]>(propertiesKey, []);
    const [payments, setPayments] = useLocalStorage<Payment[]>(paymentsKey, []);
    const [repairs, setRepairs] = useLocalStorage<Repair[]>(repairsKey, []);
    
    const addProperty = (property: Omit<Property, 'id'>) => setProperties(p => [...p, { ...property, id: crypto.randomUUID() }]);
    const updateProperty = (updated: Property) => setProperties(p => p.map(prop => prop.id === updated.id ? updated : prop));
    const addPayment = (payment: Omit<Payment, 'id'>) => setPayments(p => [...p, { ...payment, id: crypto.randomUUID() }]);
    const updatePayment = (updated: Payment) => setPayments(p => p.map(pay => pay.id === updated.id ? updated : pay));
    const addRepair = (repair: Omit<Repair, 'id'>) => setRepairs(r => [...r, { ...repair, id: crypto.randomUUID() }]);
    const updateRepair = (updated: Repair) => setRepairs(r => r.map(rep => rep.id === updated.id ? updated : rep));

    const value = useMemo(() => ({
        properties, payments, repairs, addProperty, updateProperty, addPayment, updatePayment, addRepair, updateRepair
    }), [properties, payments, repairs]);
    
    // isLoading is false because localStorage is synchronous.
    return <AppProviderLogic data={value} isLoading={false}>{children}</AppProviderLogic>;
};


// This component contains the shared logic (getters, health score) that both providers use.
const AppProviderLogic: React.FC<{data: any, isLoading: boolean, children: React.ReactNode}> = ({ data, isLoading, children }) => {
    const { properties, payments, repairs } = data;

    const getPropertyById = (id: string) => properties.find((p: Property) => p.id === id);
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
            // Penalize for past-due payments
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

    // Render a provider with empty data while auth status is 'idle'
    return <AppProviderLogic data={{ properties: [], payments: [], repairs: [], addProperty: () => {}, updateProperty: () => {}, addPayment: () => {}, updatePayment: () => {}, addRepair: () => {}, updateRepair: () => {} }} isLoading={true}>{children}</AppProviderLogic>;
};


export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
