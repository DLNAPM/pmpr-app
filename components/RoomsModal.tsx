import React, { useState } from 'react';
import Modal from './Modal';
import { Property, Room, Tenant } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    PlusIcon, 
    TrashIcon, 
    PencilSquareIcon, 
    DocumentTextIcon, 
    UserIcon, 
    CurrencyDollarIcon, 
    ClockIcon, 
    BuildingOfficeIcon,
    CalendarDaysIcon
} from './Icons';
import { formatDate, generateLeaseNumber } from '../utils';
import LeaseGeneratorModal from './LeaseGeneratorModal';

interface RoomsModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: Property;
}

const ROOM_TYPES = ['Bedroom', 'Studio', 'Entire Suite', 'Living Room', 'Loft', 'Other'];

const RoomsModal: React.FC<RoomsModalProps> = ({ isOpen, onClose, property }) => {
    const { updateProperty } = useAppContext();
    const { isReadOnly } = useAuth();
    
    // UI states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    
    // Room form state
    const [title, setTitle] = useState('');
    const [type, setType] = useState('Bedroom');
    const [squareFootage, setSquareFootage] = useState(150);
    const [maxOccupancy, setMaxOccupancy] = useState(1);
    
    // Room Lease details (Optional for active rentals)
    const [hasActiveLease, setHasActiveLease] = useState(false);
    const [rentAmount, setRentAmount] = useState<number>(0);
    const [securityDeposit, setSecurityDeposit] = useState<number>(0);
    const [leaseStart, setLeaseStart] = useState('');
    const [leaseEnd, setLeaseEnd] = useState('');
    const [tenants, setTenants] = useState<Tenant[]>([{ id: crypto.randomUUID(), name: '', email: '', phone: '' }]);
    const [leaseNumber, setLeaseNumber] = useState('');

    // Active room for generating lease
    const [selectedLeaseRoom, setSelectedLeaseRoom] = useState<Room | null>(null);

    const openCreateForm = () => {
        setEditingRoom(null);
        setTitle('');
        setType('Bedroom');
        setSquareFootage(150);
        setMaxOccupancy(1);
        setHasActiveLease(false);
        setRentAmount(0);
        setSecurityDeposit(0);
        setLeaseStart('');
        setLeaseEnd('');
        setTenants([{ id: crypto.randomUUID(), name: '', email: '', phone: '' }]);
        setLeaseNumber(generateLeaseNumber());
        setIsFormOpen(true);
    };

    const openEditForm = (room: Room) => {
        setEditingRoom(room);
        setTitle(room.title);
        setType(room.type);
        setSquareFootage(room.squareFootage);
        setMaxOccupancy(room.maxOccupancy);
        
        const hasLease = !!(room.tenants && room.tenants[0]?.name);
        setHasActiveLease(hasLease);
        setRentAmount(room.rentAmount || 0);
        setSecurityDeposit(room.securityDeposit || 0);
        setLeaseStart(room.leaseStart ? room.leaseStart.split('T')[0] : '');
        setLeaseEnd(room.leaseEnd ? room.leaseEnd.split('T')[0] : '');
        setTenants(room.tenants && room.tenants.length > 0 ? room.tenants : [{ id: crypto.randomUUID(), name: '', email: '', phone: '' }]);
        setLeaseNumber(room.leaseNumber || generateLeaseNumber());
        setIsFormOpen(true);
    };

    const handleTenantChange = (index: number, field: keyof Omit<Tenant, 'id'>, value: string) => {
        const updated = [...tenants];
        updated[index] = { ...updated[index], [field]: value };
        setTenants(updated);
    };

    const addTenantField = () => {
        setTenants([...tenants, { id: crypto.randomUUID(), name: '', email: '', phone: '' }]);
    };

    const removeTenantField = (index: number) => {
        if (tenants.length <= 1) return;
        setTenants(tenants.filter((_, i) => i !== index));
    };

    const handleSaveRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;

        // Clean room tenants list
        const activeTenants = hasActiveLease 
            ? tenants.filter(t => t.name.trim() !== '') 
            : [];

        const roomData: Room = {
            id: editingRoom?.id || crypto.randomUUID(),
            title,
            type,
            squareFootage: Number(squareFootage) || 0,
            maxOccupancy: Number(maxOccupancy) || 1,
            rentAmount: hasActiveLease ? Number(rentAmount) : undefined,
            securityDeposit: hasActiveLease ? Number(securityDeposit) : undefined,
            leaseStart: hasActiveLease && leaseStart ? new Date(leaseStart).toISOString() : undefined,
            leaseEnd: hasActiveLease && leaseEnd ? new Date(leaseEnd).toISOString() : undefined,
            tenants: activeTenants.length > 0 ? activeTenants : undefined,
            leaseNumber: activeTenants.length > 0 ? (leaseNumber || generateLeaseNumber()) : undefined
        };

        const currentRooms = property.rooms || [];
        let updatedRooms: Room[] = [];

        if (editingRoom) {
            updatedRooms = currentRooms.map(r => r.id === editingRoom.id ? roomData : r);
        } else {
            updatedRooms = [...currentRooms, roomData];
        }

        updateProperty({
            ...property,
            rooms: updatedRooms
        });

        setIsFormOpen(false);
    };

    const handleDeleteRoom = (roomId: string) => {
        if (isReadOnly) return;
        if (!window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) return;

        const updatedRooms = (property.rooms || []).filter(r => r.id !== roomId);
        updateProperty({
            ...property,
            rooms: updatedRooms
        });
    };

    const handleGenerateLeaseForRoom = (room: Room) => {
        setSelectedLeaseRoom(room);
    };

    // Prepare room lease payload for dynamic modal reuse
    const roomLeasePayloadPayload = selectedLeaseRoom ? {
        id: `room_${selectedLeaseRoom.id}`,
        propertyId: property.id,
        roomId: selectedLeaseRoom.id,
        leaseNumber: selectedLeaseRoom.leaseNumber || 'N/A',
        leaseStart: selectedLeaseRoom.leaseStart || new Date().toISOString(),
        leaseEnd: selectedLeaseRoom.leaseEnd || new Date().toISOString(),
        rentAmount: selectedLeaseRoom.rentAmount || 0,
        securityDeposit: selectedLeaseRoom.securityDeposit,
        tenants: selectedLeaseRoom.tenants || [],
        status: 'active' as const
    } : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage Rooms & Occupancy - ${property.name}`}>
            <div className="space-y-6">
                
                {/* Header Action */}
                <div className="flex justify-between items-center pb-4 border-b">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700">Property Configuration</h4>
                        <p className="text-xs text-slate-500">{property.address}</p>
                    </div>
                    {!isReadOnly && !isFormOpen && (
                        <button 
                            onClick={openCreateForm}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition"
                        >
                            <PlusIcon className="w-4 h-4" /> Add Room
                        </button>
                    )}
                </div>

                {isFormOpen ? (
                    <form onSubmit={handleSaveRoom} className="p-4 bg-slate-50 border rounded-xl space-y-4">
                        <h4 className="font-bold text-slate-800 text-sm border-b pb-2 mb-2">
                            {editingRoom ? "Edit Room Details" : "Configure New Room"}
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Room Title / No.</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Master Bedroom" 
                                    required 
                                    className="w-full text-xs p-2 border rounded bg-white shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Room Type</label>
                                <select 
                                    value={type} 
                                    onChange={e => setType(e.target.value)}
                                    className="w-full text-xs p-2 border rounded bg-white shadow-sm"
                                >
                                    {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Square Footage (sq ft)</label>
                                <input 
                                    type="number" 
                                    value={squareFootage} 
                                    onChange={e => setSquareFootage(Number(e.target.value))}
                                    required 
                                    className="w-full text-xs p-2 border rounded bg-white shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Max Occupancy</label>
                                <input 
                                    type="number" 
                                    value={maxOccupancy} 
                                    onChange={e => setMaxOccupancy(Number(e.target.value))}
                                    required 
                                    className="w-full text-xs p-2 border rounded bg-white shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Room level lease/tenant togglable */}
                        <div className="border-t pt-4">
                            <label className="flex items-center gap-2 cursor-pointer mb-3 select-none">
                                <input 
                                    type="checkbox" 
                                    checked={hasActiveLease}
                                    onChange={e => setHasActiveLease(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600"
                                />
                                <span className="text-xs font-semibold text-slate-700">This Room is Currently Rented (Active Lease)</span>
                            </label>

                            {hasActiveLease && (
                                <div className="space-y-4 p-3 bg-white border rounded-lg shadow-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Monthly Rent ($)</label>
                                            <input 
                                                type="number" 
                                                value={rentAmount} 
                                                onChange={e => setRentAmount(Number(e.target.value))}
                                                required={hasActiveLease}
                                                className="w-full text-xs p-2 border rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Security Deposit ($)</label>
                                            <input 
                                                type="number" 
                                                value={securityDeposit} 
                                                onChange={e => setSecurityDeposit(Number(e.target.value))}
                                                className="w-full text-xs p-2 border rounded"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Lease Start</label>
                                            <input 
                                                type="date" 
                                                value={leaseStart} 
                                                required={hasActiveLease}
                                                onChange={e => setLeaseStart(e.target.value)}
                                                className="w-full text-xs p-2 border rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Lease End</label>
                                            <input 
                                                type="date" 
                                                value={leaseEnd} 
                                                required={hasActiveLease}
                                                onChange={e => setLeaseEnd(e.target.value)}
                                                className="w-full text-xs p-2 border rounded"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-600">Room Tenants</label>
                                            <button 
                                                type="button" 
                                                onClick={addTenantField}
                                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                                            >
                                                <PlusIcon className="w-3 h-3" /> Add Tenant
                                            </button>
                                        </div>

                                        {tenants.map((ten, idx) => (
                                            <div key={ten.id} className="p-3 border rounded-lg bg-slate-50 relative space-y-2 mb-2">
                                                {tenants.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeTenantField(idx)}
                                                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <input 
                                                    type="text" 
                                                    value={ten.name} 
                                                    placeholder="Tenant Full Name"
                                                    required={hasActiveLease && idx === 0}
                                                    onChange={e => handleTenantChange(idx, 'name', e.target.value)}
                                                    className="w-full text-xs p-1.5 border rounded bg-white"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input 
                                                        type="email" 
                                                        value={ten.email} 
                                                        placeholder="Email address"
                                                        onChange={e => handleTenantChange(idx, 'email', e.target.value)}
                                                        className="w-full text-[11px] p-1.5 border rounded bg-white"
                                                    />
                                                    <input 
                                                        type="tel" 
                                                        value={ten.phone} 
                                                        placeholder="Phone number"
                                                        onChange={e => handleTenantChange(idx, 'phone', e.target.value)}
                                                        className="w-full text-[11px] p-1.5 border rounded bg-white"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">Lease Code:</div>
                                        <div className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                            {leaseNumber || "Generating..."}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button 
                                type="button" 
                                onClick={() => setIsFormOpen(false)}
                                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-slate-700 rounded text-xs px-4"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold px-4"
                            >
                                Save Room
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        {!property.rooms || property.rooms.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm">No rooms configured for this property.</p>
                                <p className="text-xs text-slate-400 mt-1">Configure individual bedrooms, desks or suites to lease them out separately.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 max-h-[450px] overflow-y-auto pr-1">
                                {property.rooms.map(room => {
                                    const isOccupied = room.tenants && room.tenants.length > 0 && room.tenants[0].name.trim() !== '';
                                    return (
                                        <div 
                                            key={room.id} 
                                            className={`p-4 border rounded-xl hover:shadow-md transition-all relative group bg-white ${
                                                isOccupied ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-100 bg-white'
                                            }`}
                                        >
                                            {/* Action headers */}
                                            {!isReadOnly && (
                                                <div className="absolute top-3 right-3 flex gap-2">
                                                    <button 
                                                        onClick={() => openEditForm(room)}
                                                        className="text-slate-400 hover:text-blue-600 p-1 rounded transition"
                                                        title="Edit Room"
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteRoom(room.id)}
                                                        className="text-slate-400 hover:text-red-500 p-1 rounded transition"
                                                        title="Delete Room"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg ${isOccupied ? 'bg-indigo-100/50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    <BuildingOfficeIcon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 pr-12">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h5 className="font-bold text-slate-800 text-sm leading-snug">{room.title}</h5>
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                            {room.type}
                                                        </span>
                                                        {isOccupied ? (
                                                            <span className="text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded-full uppercase">
                                                                Occupied
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-gray-100 text-gray-500 font-medium px-1.5 py-0.5 rounded-full uppercase">
                                                                Vacant
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                                        <span>Size: <strong>{room.squareFootage} sq ft</strong></span>
                                                        <span>Max guests: <strong>{room.maxOccupancy}</strong></span>
                                                    </div>

                                                    {/* Active occupancy lease details */}
                                                    {isOccupied && (
                                                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                                <span>Active Room Rental (Short/Long term)</span>
                                                                <span className="font-mono text-indigo-700">Lease: {room.leaseNumber}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                <div className="flex items-center gap-1 text-slate-700 font-medium">
                                                                    <CurrencyDollarIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span>${room.rentAmount}/mo USD</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-slate-700">
                                                                    <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span>Expires: {room.leaseEnd ? formatDate(room.leaseEnd) : 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-1 text-xs text-slate-600 pt-1">
                                                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                <span>
                                                                    Tenants: <strong>{room.tenants?.map(t => t.name).join(', ')}</strong>
                                                                </span>
                                                            </div>

                                                            <div className="pt-2 flex justify-start">
                                                                <button 
                                                                    onClick={() => handleGenerateLeaseForRoom(room)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-600 hover:text-white transition shadow-sm"
                                                                >
                                                                    <DocumentTextIcon className="w-3.5 h-3.5" />
                                                                    Generate Lease Doc
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                        Close Panel
                    </button>
                </div>
            </div>

            {/* Inner Nested Lease Doc Generator modal for room lease */}
            {selectedLeaseRoom && roomLeasePayloadPayload && (
                <LeaseGeneratorModal 
                    isOpen={!!selectedLeaseRoom}
                    onClose={() => setSelectedLeaseRoom(null)}
                    property={property}
                    lease={roomLeasePayloadPayload}
                />
            )}
        </Modal>
    );
};

export default RoomsModal;
