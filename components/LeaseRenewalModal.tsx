
import React, { useState } from 'react';
import Modal from './Modal';
import { Property } from '../types';

interface LeaseRenewalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRenew: (propertyId: string, durationMonths: number, newRentAmount?: number) => void;
    property: Property;
}

const LeaseRenewalModal: React.FC<LeaseRenewalModalProps> = ({ isOpen, onClose, onRenew, property }) => {
    const [renewalType, setRenewalType] = useState<'standard' | 'custom'>('standard');
    const [customMonths, setCustomMonths] = useState(12);
    const [rentAmount, setRentAmount] = useState(property.rentAmount);

    const handleRenew = () => {
        const months = renewalType === 'standard' ? 12 : customMonths;
        onRenew(property.id, months, rentAmount);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Renew Lease: ${property.name}`}>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Renewal Type</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setRenewalType('standard')}
                            className={`p-3 border rounded-lg text-sm font-medium transition-colors ${renewalType === 'standard' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            Standard (12 Months)
                        </button>
                        <button
                            onClick={() => setRenewalType('custom')}
                            className={`p-3 border rounded-lg text-sm font-medium transition-colors ${renewalType === 'custom' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            Custom Duration
                        </button>
                    </div>
                </div>

                {renewalType === 'custom' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                        <input
                            type="number"
                            value={customMonths}
                            onChange={(e) => setCustomMonths(parseInt(e.target.value) || 1)}
                            className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent Amount</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                            type="number"
                            value={rentAmount}
                            onChange={(e) => setRentAmount(parseFloat(e.target.value) || 0)}
                            className="w-full pl-7 p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            step="0.01"
                        />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Defaults to current rent: ${property.rentAmount}</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                    </div>
                    <p className="text-xs text-blue-800 leading-relaxed">
                        Renewing sets the current lease as <strong>Historic</strong> and creates a new <strong>Active</strong> lease. All previous payment records will be preserved and linked to their respective lease periods.
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRenew}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Renew Lease
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default LeaseRenewalModal;
