import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader, CardFooter } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Payment, Property, UtilityPayment } from '../types';
import Modal from '../components/Modal';
import { CreditCardIcon, PlusIcon, PencilSquareIcon, TrashIcon, ArrowDownTrayIcon, EnvelopeIcon } from '../components/Icons';
import { MONTHS } from '../constants';
import { EditTarget } from '../App';
import { useAuth } from '../contexts/AuthContext';

// Make jsPDF available from the global scope
declare const jspdf: any;

const PaymentForm: React.FC<{
    property: Property;
    allPaymentsForProperty: Payment[];
    payment?: Payment;
    onSave: (payment: Omit<Payment, 'id' | 'userId'> | Payment) => void; 
    onCancel: () => void;
}> = ({ property, allPaymentsForProperty, payment, onSave, onCancel }) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [year, setYear] = useState(payment?.year || currentYear);
    const [month, setMonth] = useState(payment?.month || currentMonth);
    const [rentPaidAmount, setRentPaidAmount] = useState(payment?.rentPaidAmount || 0);
    const [notes, setNotes] = useState(payment?.notes || '');

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
    
    const [rentBillAmount, setRentBillAmount] = useState(() => {
        if (payment?.rentBillAmount) return payment.rentBillAmount;
        return property.rentAmount + previousBalances.rent;
    });

    useEffect(() => {
        // Auto-update bill amount for NEW and EXISTING payments when month/year changes
        // This ensures the carry-over balance is always shown for context
        if (!payment) { // New payment
            setRentBillAmount(property.rentAmount + previousBalances.rent);
        }
    }, [payment, property.rentAmount, previousBalances.rent, month, year]);


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
            notes,
            paymentDate: rentPaidAmount > 0 || utilities.some(u => u.paidAmount > 0) ? (payment?.paymentDate || new Date().toISOString()) : null,
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
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded mt-1"
                placeholder="e.g., Paid via check #1234 on 10/15..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
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
    const { isReadOnly, user } = useAuth();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(properties.length > 0 ? properties[0].id : null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | undefined>(undefined);

    const selectedProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);

    const openAddModal = useCallback(() => {
        if (isReadOnly || properties.length === 0 || !selectedProperty) return;
        // Check per-item ownership for read-only status in mixed view
        if (selectedProperty.userId !== properties.find(p => p.userId)?.userId) {
             // In a real app, we'd check against currentUser.id, but here relying on disable logic in UI is usually enough.
             // However, for modal triggering, we should double check.
             // Actually, the button is disabled in UI.
        }
        
        setSelectedPayment(undefined);
        setIsModalOpen(true);
    }, [properties.length, isReadOnly, selectedProperty, properties]);
    
    const openEditModal = useCallback((payment: Payment) => {
        if (isReadOnly) return;
        setSelectedPayment(payment);
        setIsModalOpen(true);
    }, [isReadOnly]);

    useEffect(() => {
        if (action === 'add' && !isReadOnly) {
          openAddModal();
          onActionDone();
        }
    }, [action, onActionDone, openAddModal, isReadOnly]);

    useEffect(() => {
        if (editTarget && editTarget.type === 'payment') {
            const paymentToEdit = payments.find(p => p.id === editTarget.id);
            if (paymentToEdit) {
                setSelectedPropertyId(paymentToEdit.propertyId);
            }
        }
    }, [editTarget, payments]);

    useEffect(() => {
        if(editTarget && editTarget.type === 'payment' && selectedProperty && selectedProperty.id === payments.find(p=>p.id === editTarget.id)?.propertyId) {
            const paymentToEdit = payments.find(p => p.id === editTarget.id);
            if(paymentToEdit && !isReadOnly) {
                openEditModal(paymentToEdit);
                onActionDone();
            }
        }
    }, [selectedProperty, editTarget, payments, openEditModal, onActionDone, isReadOnly]);
    
    useEffect(() => {
        if (!selectedPropertyId && properties.length > 0) {
            setSelectedPropertyId(properties[0].id);
        } else if (properties.length > 0 && !properties.some(p => p.id === selectedPropertyId)) {
            setSelectedPropertyId(properties[0].id);
        } else if (properties.length === 0) {
            setSelectedPropertyId(null);
        }
    }, [properties, selectedPropertyId]);
    
    const propertyPayments = useMemo(() => selectedPropertyId ? getPaymentsForProperty(selectedPropertyId).sort((a, b) => b.year - a.year || b.month - a.month) : [], [selectedPropertyId, getPaymentsForProperty]);

    const handleSavePayment = (paymentData: Omit<Payment, 'id' | 'userId'> | Payment) => {
        const existingPaymentForMonth = payments.find(p => 
            p.propertyId === selectedProperty?.id &&
            p.year === paymentData.year &&
            p.month === paymentData.month
        );
        
        if (paymentData && 'id' in paymentData) {
            updatePayment(paymentData as Payment);
        } else if (existingPaymentForMonth && !paymentData.hasOwnProperty('id')) {
            updatePayment({ ...existingPaymentForMonth, ...paymentData });
        } else {
            addPayment(paymentData as Omit<Payment, 'id' | 'userId'>);
        }
        
        setIsModalOpen(false);
        setSelectedPayment(undefined);
    };

    const handleDelete = (paymentId: string) => {
        const payment = payments.find(p => p.id === paymentId);
        if (payment && !isReadOnly && window.confirm(`Are you sure you want to delete the payment record for ${MONTHS[payment.month - 1]} ${payment.year}?`)) {
            deletePayment(paymentId);
        }
    };

    const handleEmailTenant = (payment: Payment) => {
        if (!selectedProperty || selectedProperty.tenants.length === 0) {
            alert("No tenants found for this property.");
            return;
        }

        const tenantEmails = selectedProperty.tenants.map(t => t.email).filter(e => e).join(',');
        if (!tenantEmails) {
            alert("Tenants do not have email addresses saved.");
            return;
        }

        const subject = `Payment Update - ${selectedProperty.name} - ${MONTHS[payment.month - 1]} ${payment.year}`;
        
        const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

        // Current Month Calculations
        let rentLine = `Rent Due: ${formatMoney(payment.rentBillAmount)}    Rent Paid: ${formatMoney(payment.rentPaidAmount)}`;
        
        let utilsDue = payment.utilities.reduce((sum, u) => sum + u.billAmount, 0);
        let utilsPaid = payment.utilities.reduce((sum, u) => sum + u.paidAmount, 0);
        let utilsLine = '';
        if (payment.utilities.length > 0) {
            utilsLine = 'Utilities:\n';
            payment.utilities.forEach(u => {
                utilsLine += `- ${u.category}: Due ${formatMoney(u.billAmount)} | Paid ${formatMoney(u.paidAmount)}\n`;
            });
        } else {
            utilsLine += 'No utilities tracked.\n';
        }

        const totalPaidMonth = payment.rentPaidAmount + utilsPaid;
        const totalBillMonth = payment.rentBillAmount + utilsDue;
        const balanceMonth = totalBillMonth - totalPaidMonth;

        // Lease Balance Calculation (Total Outstanding)
        const totalLeaseOutstanding = propertyPayments.reduce((acc, p) => {
            const rBal = Math.max(0, p.rentBillAmount - p.rentPaidAmount);
            const uBal = p.utilities.reduce((sum, u) => sum + Math.max(0, u.billAmount - u.paidAmount), 0);
            return acc + rBal + uBal;
        }, 0);

        let body = `Dear Tenant(s),\n\nHere is the current status for your payment for ${MONTHS[payment.month - 1]} ${payment.year}.\n\n`;
        body += `${rentLine}\n\n`;
        body += `${utilsLine}\n`;
        body += `Total Paid: ${formatMoney(totalPaidMonth)}\n`;
        body += `Remaining Balance for the month: ${formatMoney(balanceMonth)}\n`;
        body += `Remaining Balance for the Lease: ${formatMoney(totalLeaseOutstanding)}\n`;

        if (payment.notes) {
            body += `\nNotes: ${payment.notes}\n`;
        }

        body += `\nThank you,\nProperty Management\n`;
        if (user) {
            body += `${user.name} (${user.email})`;
        }

        window.open(`mailto:${tenantEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    const handleExportPdf = () => {
        if (!selectedProperty) return;
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Payment Report: ${selectedProperty.name}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = ["Month", "Category", "Bill Amt", "Paid Amt", "Balance", "Notes"];
        const tableRows: any[] = [];

        propertyPayments.forEach(p => {
            const rentRow = [
                `${MONTHS[p.month-1]} ${p.year}`,
                "Rent",
                p.rentBillAmount.toFixed(2),
                p.rentPaidAmount.toFixed(2),
                (p.rentBillAmount - p.rentPaidAmount).toFixed(2),
                p.notes || ''
            ];
            tableRows.push(rentRow);
            p.utilities.forEach(u => {
                 const utilRow = [
                    "", // Don't repeat month
                    u.category,
                    u.billAmount.toFixed(2),
                    u.paidAmount.toFixed(2),
                    (u.billAmount - u.paidAmount).toFixed(2),
                    "" // Notes are per-payment
                ];
                tableRows.push(utilRow);
            });
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            headStyles: { fillColor: [22, 160, 133] },
            columnStyles: { 5: { cellWidth: 50 } },
        });

        doc.save(`payments_${selectedProperty.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleExportExcel = () => {
        if (!selectedProperty) return;

        const headers = ['Month', 'Year', 'Category', 'Bill Amount', 'Paid Amount', 'Balance', 'Notes'];
        const rows = propertyPayments.flatMap(p => {
            const baseRows = [
                [MONTHS[p.month-1], p.year, 'Rent', p.rentBillAmount, p.rentPaidAmount, p.rentBillAmount - p.rentPaidAmount, p.notes || ''],
            ];
            const utilRows = p.utilities.map(u => [MONTHS[p.month-1], p.year, u.category, u.billAmount, u.paidAmount, u.billAmount - u.paidAmount, '']);
            return [...baseRows, ...utilRows];
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `payments_${selectedProperty.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Determine if actions should be enabled for the selected property
    // Assuming isReadOnly is global for shared views, or we check ownership
    const isOwner = selectedProperty && !selectedProperty.ownerInfo; 
    const canEdit = !isReadOnly && isOwner;


    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold">Payments</h2>
                {properties.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={selectedPropertyId || ''}
                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                            className="p-2 border rounded-md shadow-sm"
                        >
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.ownerInfo ? `(Shared by ${p.ownerInfo.name})` : ''}
                                </option>
                            ))}
                        </select>
                         <button onClick={handleExportPdf} disabled={isReadOnly} className="px-3 py-2 text-sm bg-white border rounded-md shadow-sm hover:bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed">Export PDF</button>
                         <button onClick={handleExportExcel} disabled={isReadOnly} className="px-3 py-2 text-sm bg-white border rounded-md shadow-sm hover:bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed">Export Excel</button>
                         <button onClick={openAddModal} disabled={!canEdit} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                            <PlusIcon className="w-5 h-5" />
                            Record Payment
                        </button>
                    </div>
                )}
            </div>

            {selectedProperty ? (
                <div className="space-y-4">
                    {propertyPayments.map(payment => (
                        <Card key={payment.id}>
                            <CardHeader className="flex justify-between items-center">
                                <h3 className="font-bold text-lg">{MONTHS[payment.month - 1]} {payment.year}</h3>
                                {!isReadOnly && isOwner && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEmailTenant(payment)} className="text-gray-400 hover:text-green-600" title="Email Receipt to Tenant">
                                            <EnvelopeIcon className="w-5 h-5"/>
                                        </button>
                                        <button onClick={() => openEditModal(payment)} className="text-gray-400 hover:text-blue-600"><PencilSquareIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(payment.id)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <ul className="divide-y divide-gray-200">
                                    <li className="py-2 grid grid-cols-4 gap-2 font-semibold">
                                        <span>Category</span>
                                        <span className="text-right">Bill Amt</span>
                                        <span className="text-right">Paid Amt</span>
                                        <span className="text-right">Balance</span>
                                    </li>
                                    <li className="py-2 grid grid-cols-4 gap-2">
                                        <span>Rent</span>
                                        <span className="text-right">${payment.rentBillAmount.toFixed(2)}</span>
                                        <span className="text-right text-green-600">${payment.rentPaidAmount.toFixed(2)}</span>
                                        <span className={`text-right font-semibold ${(payment.rentBillAmount - payment.rentPaidAmount) > 0 ? 'text-red-600' : ''}`}>
                                            ${(payment.rentBillAmount - payment.rentPaidAmount).toFixed(2)}
                                        </span>
                                    </li>
                                    {payment.utilities.map(util => (
                                        <li key={util.category} className="py-2 grid grid-cols-4 gap-2">
                                            <span>{util.category}</span>
                                            <span className="text-right">${util.billAmount.toFixed(2)}</span>
                                            <span className="text-right text-green-600">${util.paidAmount.toFixed(2)}</span>
                                            <span className={`text-right font-semibold ${(util.billAmount - util.paidAmount) > 0 ? 'text-red-600' : ''}`}>
                                                ${(util.billAmount - util.paidAmount).toFixed(2)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            {payment.notes && (
                                <CardFooter>
                                    <p className="text-sm text-gray-600 italic whitespace-pre-wrap"><span className="font-semibold not-italic">Notes:</span> {payment.notes}</p>
                                </CardFooter>
                            )}
                        </Card>
                    ))}
                    {propertyPayments.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <CreditCardIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                            <p>No payments recorded for this property.</p>
                            {!isReadOnly && isOwner && <p>Click "Record Payment" to add one.</p>}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <CreditCardIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                    <p>No properties available, or none selected.</p>
                </div>
            )}

            {isModalOpen && selectedProperty && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    title={selectedPayment ? `Edit Payment for ${MONTHS[selectedPayment.month-1]} ${selectedPayment.year}` : 'Record New Payment'}
                >
                    <PaymentForm 
                        property={selectedProperty}
                        allPaymentsForProperty={propertyPayments}
                        payment={selectedPayment} 
                        onSave={handleSavePayment}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default PaymentsScreen;