
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
    const [rentPaid, setRentPaid] = useState(false);
    const [utilities, setUtilities] = useState<UtilityPayment[]>(
        property.utilitiesToTrack.map(u => ({ category: u, amount: 0, isPaid: false }))
    );

    const handleUtilityChange = (index: number, field: keyof UtilityPayment, value: any) => {
        const newUtils = [...utilities];
        newUtils[index] = { ...newUtils[index], [field]: value };
        setUtilities(newUtils);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            propertyId: property.id,
            year,
            month,
            rentAmount: property.rentAmount,
            rentPaid,
            utilities,
            paymentDate: rentPaid || utilities.some(u=>u.isPaid) ? new Date().toISOString() : undefined,
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
            <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                    <label htmlFor="rentPaid" className="font-medium">Rent: ${property.rentAmount}</label>
                    <input type="checkbox" id="rentPaid" checked={rentPaid} onChange={(e) => setRentPaid(e.target.checked)} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
                </div>
            </div>
            {utilities.map((util, index) => (
                <div key={util.category} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                        <label className="font-medium">{util.category}</label>
                        <input type="checkbox" checked={util.isPaid} onChange={(e) => handleUtilityChange(index, 'isPaid', e.target.checked)} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
                    </div>
                    <input type="number" placeholder="Amount" value={util.amount} onChange={(e) => handleUtilityChange(index, 'amount', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded mt-2" />
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
                    {propertyPayments.map(payment => (
                        <Card key={payment.id}>
                            <CardHeader>
                                <h3 className="font-bold text-lg">{MONTHS[payment.month - 1]} {payment.year}</h3>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-3 rounded-lg ${payment.rentPaid ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <p className="font-semibold">Rent</p>
                                    <p>Amount: ${payment.rentAmount}</p>
                                    <p>Status: <span className="font-bold">{payment.rentPaid ? 'Paid' : 'Unpaid'}</span></p>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-semibold">Utilities</p>
                                    {payment.utilities.map(util => (
                                        <div key={util.category} className="flex justify-between items-center text-sm">
                                            <span>{util.category}: ${util.amount}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${util.isPaid ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                {util.isPaid ? 'Paid' : 'Unpaid'}
                                            </span>
                                        </div>
                                    ))}
                                     {payment.utilities.length === 0 && <p className="text-xs text-gray-500">No utilities tracked for this property.</p>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
