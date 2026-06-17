import React, { useState } from 'react';
import Modal from './Modal';
import { Property, Room, Tenant } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    UserIcon, 
    CurrencyDollarIcon, 
    CalendarDaysIcon, 
    BuildingOfficeIcon, 
    PlusIcon, 
    DocumentTextIcon,
    ShieldCheckIcon
} from './Icons';
import { generateLeaseNumber } from '../utils';

interface DownsizeTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: Property;
}

const DownsizeTransferModal: React.FC<DownsizeTransferModalProps> = ({ isOpen, onClose, property }) => {
    const { updateProperty } = useAppContext();
    const { isReadOnly } = useAuth();

    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [rentAmount, setRentAmount] = useState<number>(0);
    const [securityDeposit, setSecurityDeposit] = useState<number>(0);
    const [leaseStart, setLeaseStart] = useState<string>(property.leaseStart ? property.leaseStart.split('T')[0] : '');
    const [leaseEnd, setLeaseEnd] = useState<string>(property.leaseEnd ? property.leaseEnd.split('T')[0] : '');

    // List of rooms
    const rooms = property.rooms || [];

    const handleRoomChange = (roomId: string) => {
        setSelectedRoomId(roomId);
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            // Prefill with room standard values if defined, otherwise fall back to scaled property values
            setRentAmount(room.rentAmount !== undefined ? room.rentAmount : Math.round(property.rentAmount / (rooms.length || 2)));
            setSecurityDeposit(room.securityDeposit !== undefined ? room.securityDeposit : Math.round(property.securityDeposit / (rooms.length || 2)));
        }
    };

    const handleConfirmTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!selectedRoomId) return;

        const selectedRoom = rooms.find(r => r.id === selectedRoomId);
        if (!selectedRoom) return;

        // Verify if we have active tenants
        if (!property.tenants || property.tenants.length === 0 || property.tenants[0].name.trim() === '') {
            alert('No active tenants found renting the entire property to downsize.');
            return;
        }

        const transitioningTenants = [...property.tenants];
        const newLeaseNo = generateLeaseNumber();

        // 1. Prepare updated rooms where the selected room is now leased
        const updatedRooms = rooms.map(room => {
            if (room.id === selectedRoomId) {
                return {
                    ...room,
                    tenants: transitioningTenants,
                    rentAmount: Number(rentAmount),
                    securityDeposit: Number(securityDeposit),
                    leaseStart: leaseStart ? new Date(leaseStart).toISOString() : undefined,
                    leaseEnd: leaseEnd ? new Date(leaseEnd).toISOString() : undefined,
                    leaseNumber: newLeaseNo
                };
            }
            return room;
        });

        // 2. Prepare updated Property: Clear entire property tenants and set rooms
        const updatedPropertyByTransfer: Property = {
            ...property,
            tenants: [], // Vacate entire property status
            rooms: updatedRooms
        };

        // Save
        updateProperty(updatedPropertyByTransfer);
        
        // Show success
        alert(`Successfully downsized and transferred tenancy to Room "${selectedRoom.title}"! A new Lease agreement #${newLeaseNo} has been established.`);
        onClose();
    };

    const isPropertyLeased = property.tenants && property.tenants.length > 0 && property.tenants[0].name.trim() !== '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tenant Lease Downsize & Room Transfer">
            <div className="space-y-4">
                <div className="bg-slate-50 border p-4 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Entire Property Occupant</p>
                    {isPropertyLeased ? (
                        <div>
                            <div className="flex items-center gap-2 mt-1">
                                <UserIcon className="w-4 h-4 text-slate-400" />
                                <span className="font-bold text-slate-800 text-sm">
                                    {property.tenants.map(t => t.name).join(', ')}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                                <div>Monthly Rate: <strong className="text-slate-700">${property.rentAmount}/mo</strong></div>
                                <div>Lease Ending: <strong className="text-slate-700">{property.leaseEnd ? new Date(property.leaseEnd).toLocaleDateString() : 'N/A'}</strong></div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-red-600">The entire property is not currently rented. There is no active lease to downsize or transfer.</p>
                    )}
                </div>

                {isPropertyLeased && (
                    <form onSubmit={handleConfirmTransfer} className="space-y-4">
                        {rooms.length === 0 ? (
                            <div className="p-4 border border-yellow-100 bg-yellow-50 text-yellow-800 rounded-lg text-xs space-y-2">
                                <p className="font-bold">No Rooms Added Yet</p>
                                <p>You cannot perform a room transfer. Please click on "Rooms" on the property card first and define one or more rooms (bedrooms, suites, etc.) for this property.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Select Transfer Target Room</label>
                                    <select 
                                        value={selectedRoomId}
                                        required
                                        onChange={(e) => handleRoomChange(e.target.value)}
                                        className="w-full text-xs p-2.5 border rounded-lg bg-white shadow-sm"
                                    >
                                        <option value="">-- Choose a room --</option>
                                        {rooms.map(room => {
                                            const isRoomOccupied = room.tenants && room.tenants.length > 0 && room.tenants[0].name.trim() !== '';
                                            return (
                                                <option key={room.id} value={room.id} disabled={isRoomOccupied}>
                                                    {room.title} ({room.type}) - {room.squareFootage} sqft {isRoomOccupied ? '[Currently Occupied]' : '[Vacant]'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {selectedRoomId && (
                                    <div className="p-4 border border-indigo-100 bg-indigo-50/20 rounded-xl space-y-4">
                                        <div className="text-xs font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-100 pb-1.5 flex items-center gap-1">
                                            <BuildingOfficeIcon className="w-4 h-4 text-indigo-500" />
                                            Configure Downsized Room Lease Detail
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">New Monthly Rent ($)</label>
                                                <input 
                                                    type="number" 
                                                    value={rentAmount} 
                                                    required
                                                    onChange={e => setRentAmount(Number(e.target.value))}
                                                    className="w-full text-xs p-2.5 bg-white border rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Security Deposit ($)</label>
                                                <input 
                                                    type="number" 
                                                    value={securityDeposit} 
                                                    required
                                                    onChange={e => setSecurityDeposit(Number(e.target.value))}
                                                    className="w-full text-xs p-2.5 bg-white border rounded"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Lease Start</label>
                                                <input 
                                                    type="date" 
                                                    value={leaseStart} 
                                                    required
                                                    onChange={e => setLeaseStart(e.target.value)}
                                                    className="w-full text-xs p-2.5 bg-white border rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Lease End</label>
                                                <input 
                                                    type="date" 
                                                    value={leaseEnd} 
                                                    required
                                                    onChange={e => setLeaseEnd(e.target.value)}
                                                    className="w-full text-xs p-2.5 bg-white border rounded"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-3 bg-indigo-50 rounded-lg text-[11px] text-indigo-900 border border-indigo-100 leading-relaxed">
                                            ⚠️ <strong>Lease Status Change:</strong> Confirming this transfer will automatically release the entire property from being rented and transition the tenant agreement to the selected room with the specified monthly rent. A brand-new custom Lease# code is automatically generated for tracking compliance.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isReadOnly || !selectedRoomId}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                Confirm Transfer
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default DownsizeTransferModal;
