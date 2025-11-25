
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Payment, Property, UtilityPayment } from '../types';
import Modal from '../components/Modal';
import { CreditCardIcon, PlusIcon } from '../components/Icons';
import { MONTHS } from '../constants';

const PaymentForm: React.FC<{property: Property; onSave: (payment: Omit<Payment, 'id'>) => void; onCancel: () => void;}> = ({ property, onSave, onCancel }) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [rentPaidAmount, setRentPaidAmount] = useState(0);
    const [utilities, setUtilities] = useState<UtilityPayment[]>(
        property.utilitiesToTrack.map(u => ({ category: u, billAmount: 0, paidAmount: 0 }))
    );

    const handleUtilityChange = (index: number, field: keyof UtilityPayment, value: any) => {
        const newUtils = [...utilities];
        newUtils[index] = { ...newUtils[index], [field]: parseFloat(value) || 0 };
        setUtilities(newUtils);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            propertyId: property.id,
            year,
            month,
            rentBillAmount: property.rentAmount,
            rentPaidAmount,
            utilities,
            paymentDate: rentPaidAmount > 0 || utilities.some(u => u.paidAmount > 0) ? new Date().toISOString() : undefined,
        });
    };

    return (
         <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold">{property.name}</h3>
            <div className="grid grid-cols-2 gap-4">
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full p-2 border rounded">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full p-2 border rounded" />
            </div>
            <div className="p-3 border rounded-lg space-y-2">
                <label className="font-medium">Rent</label>
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" readOnly value={property.rentAmount} className="w-full p-2 border rounded bg-gray-100" placeholder="Bill Amount" />
                    <input type="number" value={rentPaidAmount} onChange={(e) => setRentPaidAmount(parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded" placeholder="Paid Amount" />
                </div>
            </div>
            {utilities.map((util, index) => (
                <div key={util.category} className="p-3 border rounded-lg space-y-2">
                     <label className="font-medium">{util.category}</label>
                     <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={util.billAmount} onChange={(e) => handleUtilityChange(index, 'billAmount', e.target.value)} className="w-full p-2 border rounded" placeholder="Bill Amount"/>
                        <input type="number" value={util.paidAmount} onChange={(e) => handleUtilityChange(index, 'paidAmount', e.target.value)} className="w-full p-2 border rounded" placeholder="Paid Amount"/>
                    </div>
                </div>
            ))}
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Record Payment</button>
            </div>
        </form>
    );
};

interface PaymentsScreenProps {
  action: string | null;
  onActionDone: () => void;
}

const PaymentsScreen: React.FC<PaymentsScreenProps> = ({ action, onActionDone }) => {
    const { properties, payments, getPaymentsForProperty, addPayment, updatePayment } = useAppContext();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(properties.length > 0 ? properties[0].id : null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const openModal = useCallback(() => {
        if (properties.length > 0) {
            setIsModalOpen(true);
        } else {
            alert("You must add a property before you can record a payment.");
        }
    }, [properties.length]);

    useEffect(() => {
        if (action === 'add') {
          openModal();
          onActionDone();
        }
    }, [action, onActionDone, openModal]);
    
    useEffect(() => {
        if (!selectedPropertyId && properties.length > 0) {
            setSelectedPropertyId(properties[0].id);
        }
    }, [properties, selectedPropertyId]);
    
    const selectedProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);
    const propertyPayments = useMemo(() => selectedPropertyId ? getPaymentsForProperty(selectedPropertyId).sort((a,b) => b.year - a.year || b.month - a.month) : [], [selectedPropertyId, getPaymentsForProperty]);

    const handleSavePayment = (paymentData: Omit<Payment, 'id'>) => {
        const existing = payments.find(p => p.propertyId === paymentData.propertyId && p.year === paymentData.year && p.month === paymentData.month);
        if (existing) {
            updatePayment({ ...existing, ...paymentData });
        } else {
            addPayment(paymentData);
        }
        setIsModalOpen(false);
    };

    const getStatusInfo = (billed: number, paid: number) => {
        if (paid >= billed && billed > 0) return { text: 'Paid', color: 'bg-green-100 text-green-800' };
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
                    <button onClick={openModal} disabled={!selectedProperty} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400">
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
                                <CardHeader>
                                    <h3 className="font-bold text-lg">{MONTHS[payment.month - 1]} {payment.year}</h3>
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
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Payment">
                    <PaymentForm 
                        property={selectedProperty} 
                        onSave={handleSavePayment}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default PaymentsScreen;