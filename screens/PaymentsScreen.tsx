import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Payment, Property, UtilityPayment } from '../types';
import Modal from '../components/Modal';
import { CreditCardIcon, PlusIcon, PencilSquareIcon, TrashIcon } from '../components/Icons';
import { MONTHS } from '../constants';
import { EditTarget } from '../App';

const PaymentForm: React.FC<{
    property: Property;
    allPaymentsForProperty: Payment[];
    payment?: Payment;
    onSave: (payment: Omit<Payment, 'id'> | Payment) => void; 
    onCancel: () => void;
}> = ({ property, allPaymentsForProperty, payment, onSave, onCancel }) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [year, setYear] = useState(payment?.year || currentYear);
    const [month, setMonth] = useState(payment?.month || currentMonth);
    const [rentPaidAmount, setRentPaidAmount] = useState(payment?.rentPaidAmount || 0);
    
    // Calculate previous balances first
    const previousBalances = useMemo(() => {
        const prevPayment = allPaymentsForProperty
          .filter(p => p.year < year || (p.year === year && p.month < month))
          .sort((a,b) => b.year - a.year || b.month - a.month)[0];


        if (!prevPayment) return { rent: 0, utilities: {}, total: 0 };
        
        const rentBalance = Math.max(0, prevPayment.rentBillAmount - prevPayment.rentPaidAmount);
        const utilsBalances: { [key: string]: number } = {};
        prevPayment.utilities.forEach(util => {
            utilsBalances[util.category] = Math.max(0, util.billAmount - util.paidAmount);
        });
        const total = rentBalance + Object.values(utilsBalances).reduce((sum, bal) => sum + bal, 0);

        return { rent: rentBalance, utilities: utilsBalances, total };
    }, [year, month, allPaymentsForProperty]);
    
    const [rentBillAmount, setRentBillAmount] = useState(payment?.rentBillAmount || (property.rentAmount + previousBalances.rent));

    useEffect(() => {
        // This effect updates the bill amount if the user changes the month/year for a *new* payment
        if (!payment) {
            setRentBillAmount(property.rentAmount + previousBalances.rent);
        }
    }, [payment, property.rentAmount, previousBalances.rent]);


    const [utilities, setUtilities] = useState<UtilityPayment[]>(() => {
        if (payment?.utilities) {
            const savedUtils = new Map(payment.utilities.map(u => [u.category, u]));
            return property.utilitiesToTrack.map(category => 
                savedUtils.get(category) || { category, billAmount: 0, paidAmount: 0 }
            );
        }
        return property.utilitiesToTrack.map(u => ({ category: u, billAmount: 0, paidAmount: 0 }));
    });
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const handleUtilityChange = (index: number, field: keyof UtilityPayment, value: any) => {
        const newUtils = [...utilities];
        newUtils[index] = { ...newUtils[index], [field]: parseFloat(value) || 0 };
        setUtilities(newUtils);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const paymentData = {
            propertyId: property.id,
            year,
            month,
            rentBillAmount: rentBillAmount,
            rentPaidAmount,
            utilities,
            paymentDate: rentPaidAmount > 0 || utilities.some(u => u.paidAmount > 0) ? (payment?.paymentDate || new Date().toISOString()) : undefined,
        };
        
        if (payment) {
            onSave({ ...payment, ...paymentData });
        } else {
            onSave(paymentData);
        }
    };

    return (
         <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold">{property.name}</h3>
            {previousBalances.total > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                    <p className="font-semibold">
                        Total Balance Carried Forward: {formatCurrency(previousBalances.total)}
                    </p>
                    <p>This amount is from the previous month's unpaid bills.</p>
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full p-2 border rounded" disabled={!!payment}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full p-2 border rounded" disabled={!!payment} />
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-1 px-3">
                <label className="text-sm font-medium text-gray-500">Bill Amount</label>
                <label className="text-sm font-medium text-gray-500">Paid Amount</label>
            </div>

            <div className="p-3 border rounded-lg space-y-2">
                <label className="font-medium">Rent</label>
                {previousBalances.rent > 0 && (
                    <p className="text-xs text-red-600 font-medium">
                        Previous Balance: {formatCurrency(previousBalances.rent)}
                    </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={rentBillAmount} onChange={(e) => setRentBillAmount(parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded" />
                    <input type="number" value={rentPaidAmount} onChange={(e) => setRentPaidAmount(parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded" />
                </div>
            </div>
            {utilities.map((util, index) => (
                <div key={util.category} className="p-3 border rounded-lg space-y-2">
                     <label className="font-medium">{util.category}</label>
                     {previousBalances.utilities[util.category] > 0 && (
                        <p className="text-xs text-red-600 font-medium">
                            Previous Balance: {formatCurrency(previousBalances.utilities[util.category])}
                        </p>
                     )}
                     <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={util.billAmount} onChange={(e) => handleUtilityChange(index, 'billAmount', e.target.value)} className="w-full p-2 border rounded" />
                        <input type="number" value={util.paidAmount} onChange={(e) => handleUtilityChange(index, 'paidAmount', e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                </div>
            ))}
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                    {payment ? 'Save Changes' : 'Record Payment'}
                </button>
            </div>
        </form>
    );
};

interface PaymentsScreenProps {
  action: string | null;
  editTarget: EditTarget | null;
  onActionDone: () => void;
}

const PaymentsScreen: React.FC<PaymentsScreenProps> = ({ action, editTarget, onActionDone }) => {
    const { properties, payments, getPaymentsForProperty, addPayment, updatePayment, deletePayment } = useAppContext();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(properties.length > 0 ? properties[0].id : null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | undefined>(undefined);
    
    const openAddModal = useCallback(() => {
        if (properties.length > 0) {
            setSelectedPayment(undefined);
            setIsModalOpen(true);
        } else {
            alert("You must add a property before you can record a payment.");
        }
    }, [properties.length]);
    
    const openEditModal = useCallback((payment: Payment) => {
        setSelectedPayment(payment);
        setIsModalOpen(true);
    }, []);

    useEffect(() => {
        if (action === 'add') {
          openAddModal();
          onActionDone();
        }
    }, [action, onActionDone, openAddModal]);

    useEffect(() => {
        if (editTarget && editTarget.type === 'payment') {
            const paymentToEdit = payments.find(p => p.id === editTarget.id);
            if (paymentToEdit) {
                setSelectedPropertyId(paymentToEdit.propertyId);
                openEditModal(paymentToEdit);
            } else {
                alert("Could not find the payment record to edit.");
            }
            onActionDone();
        }
    }, [editTarget, onActionDone, payments, openEditModal]);
    
    useEffect(() => {
        if (!selectedPropertyId && properties.length > 0) {
            setSelectedPropertyId(properties[0].id);
        }
    }, [properties, selectedPropertyId]);
    
    const selectedProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);
    const propertyPayments = useMemo(() => selectedPropertyId ? getPaymentsForProperty(selectedPropertyId).sort((a,b) => b.year - a.year || b.month - a.month) : [], [selectedPropertyId, getPaymentsForProperty]);

    const handleSavePayment = (paymentData: Omit<Payment, 'id'> | Payment) => {
        const existingPayment = payments.find(p =>
            p.propertyId === paymentData.propertyId &&
            p.year === paymentData.year &&
            p.month === paymentData.month
        );

        if ('id' in paymentData) {
            updatePayment(paymentData);
        } else if (existingPayment) {
            updatePayment({ ...existingPayment, ...paymentData });
        } else {
            addPayment(paymentData);
        }

        setIsModalOpen(false);
        setSelectedPayment(undefined);
    };
    
    const handleDelete = (paymentId: string) => {
        if (window.confirm("Are you sure you want to delete this payment record? This will update the balance for the following month. This action cannot be undone.")) {
            deletePayment(paymentId);
        }
    };


    const getStatusInfo = (billed: number, paid: number) => {
        if (billed === 0 && paid === 0) return { text: 'Not Billed', color: 'bg-gray-100 text-gray-800' };
        if (paid >= billed) return { text: 'Paid', color: 'bg-green-100 text-green-800' };
        if (paid > 0) return { text: 'Partially Paid', color: 'bg-yellow-100 text-yellow-800' };
        return { text: 'Unpaid', color: 'bg-red-100 text-red-800' };
    };
    
    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold">Payments</h2>
                <div className="flex items-center gap-4">
                    <select value={selectedPropertyId || ''} onChange={(e) => setSelectedPropertyId(e.target.value)} className="p-2 border rounded-lg bg-white shadow-sm w-full sm:w-64">
                         {properties.length === 0 && <option>No properties available</option>}
                        {properties.map(prop => (
                            <option key={prop.id} value={prop.id}>{prop.name}</option>
                        ))}
                    </select>
                    <button onClick={openAddModal} disabled={!selectedProperty} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                        <PlusIcon className="w-5 h-5" />
                        Record
                    </button>
                </div>
            </div>

            {selectedProperty ? (
                <div className="space-y-4">
                    {propertyPayments.map(payment => {
                        const rentStatus = getStatusInfo(payment.rentBillAmount, payment.rentPaidAmount);
                        return (
                            <Card key={payment.id}>
                                <CardHeader className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg">{MONTHS[payment.month - 1]} {payment.year}</h3>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => openEditModal(payment)}
                                            className="text-gray-400 hover:text-blue-600 p-1 rounded-full transition-colors"
                                            aria-label="Edit Payment"
                                        >
                                            <PencilSquareIcon className="w-5 h-5"/>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(payment.id)}
                                            className="text-gray-400 hover:text-red-600 p-1 rounded-full transition-colors"
                                            aria-label="Delete Payment"
                                        >
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`p-3 rounded-lg ${rentStatus.color}`}>
                                        <p className="font-semibold">Rent</p>
                                        <p>Billed: ${payment.rentBillAmount.toFixed(2)}</p>
                                        <p>Paid: ${payment.rentPaidAmount.toFixed(2)}</p>
                                        <p>Status: <span className="font-bold">{rentStatus.text}</span></p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-semibold">Utilities</p>
                                        {payment.utilities.map(util => {
                                            const utilStatus = getStatusInfo(util.billAmount, util.paidAmount);
                                            return (
                                            <div key={util.category} className="flex justify-between items-center text-sm">
                                                <span>{util.category}: ${util.paidAmount.toFixed(2)} / ${util.billAmount.toFixed(2)}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${utilStatus.color}`}>
                                                    {utilStatus.text}
                                                </span>
                                            </div>
                                        )})}
                                         {payment.utilities.length === 0 && <p className="text-xs text-gray-500">No utilities tracked for this property.</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                    {propertyPayments.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <CreditCardIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                            <p>No payment records for this property.</p>
                            <p>Click "Record" to add the first payment.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <p>Please select a property to view payments, or add a property first.</p>
                </div>
            )}

            {selectedProperty && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedPayment ? "Edit Payment" : "Record Payment"}>
                    <PaymentForm 
                        property={selectedProperty}
                        payment={selectedPayment}
                        allPaymentsForProperty={propertyPayments}
                        onSave={handleSavePayment}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default PaymentsScreen;