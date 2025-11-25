
import React, { createContext, useContext, useMemo, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Property, Payment, Repair, RepairStatus } from '../types';
import { useAuth } from './AuthContext';

// This is the initial data for a new user.
const initialDataFile = {
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
        {
            id: 'prop2',
            name: 'Downtown Lofts, #5B',
            address: '456 Main St, New York, NY',
            tenants: [{id: 't2', name: 'Jane Smith', phone: '555-5678', email: 'jane.smith@email.com'}],
            leaseStart: '2023-06-01T00:00:00.000Z',
            leaseEnd: '2024-05-31T00:00:00.000Z',
            securityDeposit: 2500,
            rentAmount: 2500,
            utilitiesToTrack: ['Electricity', 'Gas', 'Trash'],
        },
    ],
    payments: [
        {
            id: 'pay1',
            propertyId: 'prop1',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            rentAmount: 1500,
            rentPaid: true,
            utilities: [
                { category: 'Water', amount: 50, isPaid: true },
                { category: 'Electricity', amount: 75, isPaid: true },
                { category: 'Internet', amount: 60, isPaid: false },
            ],
            paymentDate: new Date().toISOString()
        }
    ],
    repairs: [
        {
            id: 'rep1',
            propertyId: 'prop2',
            description: 'Leaky faucet in kitchen sink',
            status: RepairStatus.IN_PROGRESS,
            contractorName: 'QuickFix Plumbers',
            cost: 75,
            requestDate: new Date(new Date().setDate(new Date().getDate()-5)).toISOString(),
        }
    ]
};


interface AppContextType {
  properties: Property[];
  payments: Payment[];
  repairs: Repair[];
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authStatus, user } = useAuth();
  
  const storageKeyPrefix = useMemo(() => {
    if (authStatus === 'authenticated' && user) {
        return `pmpr_${user.id}`;
    }
    if (authStatus === 'guest') {
        return 'pmpr_guest';
    }
    return null;
  }, [authStatus, user]);

  const propertiesInitialValue = useMemo(() => (
    storageKeyPrefix && localStorage.getItem(`${storageKeyPrefix}_properties`) === null
      ? initialDataFile.properties
      : []
  ), [storageKeyPrefix]);

  const paymentsInitialValue = useMemo(() => (
    storageKeyPrefix && localStorage.getItem(`${storageKeyPrefix}_payments`) === null
      ? initialDataFile.payments
      : []
  ), [storageKeyPrefix]);
  
  const repairsInitialValue = useMemo(() => (
    storageKeyPrefix && localStorage.getItem(`${storageKeyPrefix}_repairs`) === null
      ? initialDataFile.repairs
      : []
  ), [storageKeyPrefix]);

  const [properties, setProperties] = useLocalStorage<Property[]>(
    storageKeyPrefix ? `${storageKeyPrefix}_properties` : 'pmpr_temp_properties', 
    propertiesInitialValue
  );
  const [payments, setPayments] = useLocalStorage<Payment[]>(
    storageKeyPrefix ? `${storageKeyPrefix}_payments` : 'pmpr_temp_payments', 
    paymentsInitialValue
  );
  const [repairs, setRepairs] = useLocalStorage<Repair[]>(
    storageKeyPrefix ? `${storageKeyPrefix}_repairs` : 'pmpr_temp_repairs',
    repairsInitialValue
  );

  useEffect(() => {
    if (!storageKeyPrefix) {
      setProperties([]);
      setPayments([]);
      setRepairs([]);
    }
  }, [storageKeyPrefix, setProperties, setPayments, setRepairs]);

  const addProperty = (property: Omit<Property, 'id'>) => {
    const newProperty = { ...property, id: crypto.randomUUID() };
    setProperties(prev => [...prev, newProperty]);
  };
  
  const updateProperty = (updatedProperty: Property) => {
      setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
  };

  const addPayment = (payment: Omit<Payment, 'id'>) => {
    const newPayment = { ...payment, id: crypto.randomUUID() };
    setPayments(prev => [...prev, newPayment]);
  };

  const updatePayment = (updatedPayment: Payment) => {
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
  };

  const addRepair = (repair: Omit<Repair, 'id'>) => {
    const newRepair = { ...repair, id: crypto.randomUUID() };
    setRepairs(prev => [...prev, newRepair]);
  };
  
  const updateRepair = (updatedRepair: Repair) => {
    setRepairs(prev => prev.map(r => r.id === updatedRepair.id ? updatedRepair : r));
  };

  const getPropertyById = (id: string) => properties.find(p => p.id === id);
  const getPaymentsForProperty = (propertyId: string) => payments.filter(p => p.propertyId === propertyId);
  const getRepairsForProperty = (propertyId: string) => repairs.filter(r => r.propertyId === propertyId);
  
  const searchProperties = (query: string) => {
      if (!query) return properties;
      const lowerCaseQuery = query.toLowerCase();
      return properties.filter(p => 
          p.name.toLowerCase().includes(lowerCaseQuery) ||
          p.address.toLowerCase().includes(lowerCaseQuery) ||
          p.tenants.some(t => t.name.toLowerCase().includes(lowerCaseQuery))
      );
  };

  const getSiteHealthScore = (propertyId: string) => {
    const propertyPayments = getPaymentsForProperty(propertyId);
    const propertyRepairs = getRepairsForProperty(propertyId);

    let score = 100;

    if (propertyPayments.length === 0) return 75; // Neutral score for new properties

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    propertyPayments.forEach(payment => {
        // Penalty for late rent
        if (!payment.rentPaid && (payment.year < currentYear || (payment.year === currentYear && payment.month < currentMonth))) {
            score -= 10;
        }
        // Penalty for unpaid utilities
        const unpaidUtils = payment.utilities.filter(u => !u.isPaid).length;
        score -= unpaidUtils * 2;
    });

    const openRepairs = propertyRepairs.filter(r => r.status !== RepairStatus.COMPLETE).length;
    score -= openRepairs * 5;

    return Math.max(0, Math.min(100, score));
  };


  const value = useMemo(() => ({
    properties: storageKeyPrefix ? properties : [],
    payments: storageKeyPrefix ? payments : [],
    repairs: storageKeyPrefix ? repairs : [],
    addProperty,
    updateProperty,
    addPayment,
    updatePayment,
    addRepair,
    updateRepair,
    getPropertyById,
    getPaymentsForProperty,
    getRepairsForProperty,
    searchProperties,
    getSiteHealthScore
  }), [properties, payments, repairs, storageKeyPrefix]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
