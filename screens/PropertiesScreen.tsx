
import React, { useState, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader, CardFooter } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Property, Tenant } from '../types';
import { BuildingOfficeIcon, PlusIcon, UserIcon, PencilSquareIcon, MapPinIcon, TrashIcon, CalendarDaysIcon, CurrencyDollarIcon, ClockIcon, DocumentTextIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { UTILITY_CATEGORIES, MONTHS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import LeaseGeneratorModal from '../components/LeaseGeneratorModal';
import LeaseRenewalModal from '../components/LeaseRenewalModal';
import RoomsModal from '../components/RoomsModal';
import { formatDate } from '../utils';

import { Lease } from '../types';

const LeaseForm: React.FC<{
    propertyId: string;
    lease?: Lease;
    onSave: (lease: Omit<Lease, 'id'> | Lease) => void;
    onCancel: () => void;
    defaultTenants?: Tenant[];
}> = ({ propertyId, lease, onSave, onCancel, defaultTenants }) => {
    const [formData, setFormData] = useState<Omit<Lease, 'id'>>({
        propertyId,
        leaseStart: lease?.leaseStart?.split('T')[0] || '',
        leaseEnd: lease?.leaseEnd?.split('T')[0] || '',
        rentAmount: lease?.rentAmount || 0,
        securityDeposit: lease?.securityDeposit || 0,
        tenants: lease?.tenants || defaultTenants?.map(t => ({...t, id: crypto.randomUUID()})) || [{ id: crypto.randomUUID(), name: '', email: '', phone: '' }],
        status: lease?.status || 'historic',
        notes: lease?.notes || ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: (name === 'rentAmount' || name === 'securityDeposit') ? parseFloat(value) || 0 : value 
        }));
    };

    const handleTenantChange = (index: number, field: keyof Omit<Tenant, 'id'>, value: string) => {
        const newTenants = [...formData.tenants];
        newTenants[index] = {...newTenants[index], [field]: value};
        setFormData(prev => ({ ...prev, tenants: newTenants }));
    };

    const addTenant = () => {
        setFormData(prev => ({ ...prev, tenants: [...prev.tenants, {id: crypto.randomUUID(), name: '', email: '', phone: ''}] }));
    };

    const removeTenant = (index: number) => {
        if (formData.tenants.length <= 1) return;
        setFormData(prev => ({ ...prev, tenants: prev.tenants.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const leaseData = {
            ...formData,
            leaseStart: new Date(formData.leaseStart).toISOString(),
            leaseEnd: new Date(formData.leaseEnd).toISOString(),
        };
        onSave(lease ? { ...leaseData, id: lease.id } as Lease : leaseData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lease Start</label>
                    <input type="date" name="leaseStart" value={formData.leaseStart} onChange={handleChange} required className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lease End</label>
                    <input type="date" name="leaseEnd" value={formData.leaseEnd} onChange={handleChange} required className="w-full p-2 border rounded" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Rent</label>
                    <input type="number" name="rentAmount" value={formData.rentAmount} onChange={handleChange} required className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Security Deposit</label>
                    <input type="number" name="securityDeposit" value={formData.securityDeposit} onChange={handleChange} className="w-full p-2 border rounded" />
                </div>
            </div>
            
            <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tenants (for this period)</h3>
                {formData.tenants.map((tenant, index) => (
                    <div key={tenant.id} className="p-3 border rounded mb-2 space-y-2 bg-slate-50 relative">
                         {formData.tenants.length > 1 && (
                            <button type="button" onClick={() => removeTenant(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                                <TrashIcon className="w-4 h-4"/>
                            </button>
                        )}
                        <input type="text" value={tenant.name} onChange={(e) => handleTenantChange(index, 'name', e.target.value)} placeholder="Tenant Name" required className="w-full p-2 border rounded text-sm" />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="email" value={tenant.email} onChange={(e) => handleTenantChange(index, 'email', e.target.value)} placeholder="Email" className="w-full p-2 border rounded text-sm" />
                            <input type="tel" value={tenant.phone} onChange={(e) => handleTenantChange(index, 'phone', e.target.value)} placeholder="Phone" className="w-full p-2 border rounded text-sm" />
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addTenant} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold">
                    <PlusIcon className="w-3 h-3" /> Add Another Tenant
                </button>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded">
                    <option value="historic">Historic (Past Lease)</option>
                    <option value="active">Active (Current Lease)</option>
                    <option value="upcoming">Upcoming</option>
                </select>
                <p className="mt-1 text-[10px] text-gray-500 italic">Changing to 'Active' will update the property's current rent, dates, and tenants.</p>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Notes / Terms</label>
                <textarea 
                    name="notes" 
                    value={formData.notes} 
                    onChange={handleChange} 
                    placeholder="Key terms, renewal conditions, or payment exceptions..."
                    className="w-full p-2 border rounded text-sm h-20"
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-sm font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold shadow-sm">Save Lease Record</button>
            </div>
        </form>
    );
};

const LeaseHistory: React.FC<{propertyId: string; onGenerate: (lease: any) => void}> = ({ propertyId, onGenerate }) => {
    const { leases, payments, properties, addLease, updateLease, deleteLease, updateProperty } = useAppContext();
    const { isReadOnly } = useAuth();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLease, setEditingLease] = useState<Lease | undefined>(undefined);

    const property = properties.find(p => p.id === propertyId);
    let propertyLeases = leases.filter(l => l.propertyId === propertyId).sort((a,b) => new Date(b.leaseStart).getTime() - new Date(a.leaseStart).getTime());

    // If no explicit lease records, use property data as active lease
    if (propertyLeases.length === 0 && property) {
        propertyLeases = [{
            id: 'current_placeholder',
            propertyId: property.id,
            leaseStart: property.leaseStart,
            leaseEnd: property.leaseEnd,
            rentAmount: property.rentAmount,
            tenants: property.tenants,
            status: 'active'
        }];
    }

    const handleSaveLease = async (leaseData: any) => {
        if ('id' in leaseData) {
            if (leaseData.id === 'current_placeholder') {
                // If they edit the placeholder, we actually create it as a real record
                const { id, ...rest } = leaseData;
                await addLease(rest);
            } else {
                await updateLease(leaseData);
            }
        } else {
            await addLease(leaseData);
        }

        // If the lease is marked as active, sync current property info
        if (leaseData.status === 'active' && property) {
            updateProperty({
                ...property,
                leaseStart: leaseData.leaseStart,
                leaseEnd: leaseData.leaseEnd,
                rentAmount: leaseData.rentAmount,
                tenants: leaseData.tenants,
                securityDeposit: leaseData.securityDeposit || property.securityDeposit
            });
        }
        
        setIsFormOpen(false);
        setEditingLease(undefined);
    };

    const handleDeleteLease = async (id: string) => {
        if (id === 'current_placeholder') return;
        if (window.confirm('Delete this lease record? This won\'t delete payments, but historical accuracy for this period might be lost in reports.')) {
            await deleteLease(id);
        }
    };

    const getLeaseStats = (leaseId: string) => {
        const lease = propertyLeases.find(l => l.id === leaseId);
        if (!lease) return { billed: 0, paid: 0 };

        const start = new Date(lease.leaseStart);
        const end = new Date(lease.leaseEnd);

        const leasePayments = payments.filter(p => {
            if (p.propertyId !== propertyId) return false;
            const pDate = new Date(p.year, p.month - 1, 1);
            return pDate >= start && pDate <= end;
        });

        const billed = leasePayments.reduce((sum, p) => sum + p.rentBillAmount + p.utilities.reduce((s, u) => s + u.billAmount, 0), 0);
        const paid = leasePayments.reduce((sum, p) => sum + p.rentPaidAmount + p.utilities.reduce((s, u) => s + u.paidAmount, 0), 0);
        
        return { billed, paid };
    };

    if (isFormOpen) {
        return (
            <LeaseForm 
                propertyId={propertyId}
                lease={editingLease}
                onSave={handleSaveLease}
                onCancel={() => { setIsFormOpen(false); setEditingLease(undefined); }}
                defaultTenants={property?.tenants}
            />
        );
    }

    return (
        <div className="space-y-4">
            {!isReadOnly && (
                <button 
                    onClick={() => setIsFormOpen(true)}
                    className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-1"
                >
                    <PlusIcon className="w-4 h-4" /> Add Past/Manual Lease Record
                </button>
            )}

            {propertyLeases.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No lease history found.</p>
            ) : (
                propertyLeases.map(lease => {
                    const stats = getLeaseStats(lease.id);
                    const isCurrent = lease.status === 'active';
                    return (
                        <div key={lease.id} className={`p-4 border rounded-xl relative group ${isCurrent ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-gray-100 shadow-sm'}`}>
                            {!isReadOnly && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => { setEditingLease(lease); setIsFormOpen(true); }}
                                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Edit Lease Record"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                    {lease.id !== 'current_placeholder' && (
                                        <button 
                                            onClick={() => handleDeleteLease(lease.id)}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Delete Lease Record"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800">
                                            {formatDate(lease.leaseStart)} - {formatDate(lease.leaseEnd)}
                                        </h4>
                                        {isCurrent && (
                                            <span className="px-1.5 py-0.5 bg-blue-600 text-[10px] text-white font-bold rounded uppercase tracking-wider">Current</span>
                                        )}
                                        {lease.status === 'upcoming' && (
                                            <span className="px-1.5 py-0.5 bg-green-100 text-[10px] text-green-700 font-bold rounded uppercase tracking-wider">Upcoming</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <CurrencyDollarIcon className="w-3 h-3" />
                                        <span className="font-bold text-slate-700">${lease.rentAmount}/mo</span> rent
                                    </p>
                                </div>
                                <div className="text-right pt-8 sm:pt-0">
                                    <button 
                                        onClick={() => onGenerate(lease)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        title="Generate Lease Agreement"
                                    >
                                        <DocumentTextIcon className="w-3 h-3" />
                                        Lease Doc
                                    </button>
                                    <button 
                                        onClick={() => {
                                            // Trigger navigation to reporting tab with this lease filtered
                                            window.location.hash = `reporting?propertyId=${propertyId}&leaseId=${lease.id}`;
                                            window.dispatchEvent(new HashChangeEvent('hashchange'));
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        title="View Financial Report for this Period"
                                    >
                                        <ClockIcon className="w-3 h-3" />
                                        Report
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3 mt-2">
                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                    <UserIcon className="w-3 h-3" /> 
                                    {lease.tenants.length} Tenant(s): {lease.tenants.map(t => t.name).join(', ')}
                                </span>
                                <span className="flex items-center gap-1 border-l pl-3 border-slate-200"><ClockIcon className="w-3 h-3" /> {Math.round((new Date(lease.leaseEnd).getTime() - new Date(lease.leaseStart).getTime()) / (1000 * 60 * 60 * 24 * 30))} Months</span>
                                {lease.securityDeposit && <span className="flex items-center gap-1 text-slate-400 border-l pl-3 border-slate-200">SD: ${lease.securityDeposit}</span>}
                            </div>

                            {lease.notes && (
                                <div className="mb-3 p-2 bg-slate-50/50 rounded text-[10px] text-slate-500 italic border-l-2 border-slate-200">
                                    "{lease.notes.length > 100 ? lease.notes.substring(0, 100) + '...' : lease.notes}"
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Lease Totals</p>
                                    <p className="text-sm font-black text-slate-700">${stats.billed.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Balance</p>
                                    <p className={`text-sm font-black ${(stats.billed - stats.paid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ${(stats.billed - stats.paid).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

const PropertyForm: React.FC<{property?: Property; onSave: (property: Omit<Property, 'id' | 'userId'> | Property) => void; onCancel: () => void}> = ({ property, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Omit<Property, 'id' | 'userId' | 'ownerInfo'>>({
        name: property?.name || '',
        address: property?.address || '',
        rentAmount: property?.rentAmount || 0,
        securityDeposit: property?.securityDeposit || 0,
        leaseStart: property?.leaseStart?.split('T')[0] || '',
        leaseEnd: property?.leaseEnd?.split('T')[0] || '',
        tenants: property?.tenants || [{ id: crypto.randomUUID(), name: '', email: '', phone: '' }],
        utilitiesToTrack: property?.utilitiesToTrack || []
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'rentAmount' || name === 'securityDeposit' ? parseFloat(value) || 0 : value }));
    };

    const handleTenantChange = (index: number, field: keyof Omit<Tenant, 'id'>, value: string) => {
        const newTenants = [...formData.tenants];
        newTenants[index] = {...newTenants[index], [field]: value};
        setFormData(prev => ({ ...prev, tenants: newTenants }));
    };

    const addTenant = () => {
        setFormData(prev => ({ ...prev, tenants: [...prev.tenants, {id: crypto.randomUUID(), name: '', email: '', phone: ''}] }));
    };

    const removeTenant = (index: number) => {
        if (formData.tenants.length <= 1) return; // Must have at least one tenant
        setFormData(prev => ({ ...prev, tenants: prev.tenants.filter((_, i) => i !== index) }));
    };

    const handleUtilityToggle = (utility: string) => {
        setFormData(prev => {
            const newUtils = prev.utilitiesToTrack.includes(utility)
                ? prev.utilitiesToTrack.filter(u => u !== utility)
                : [...prev.utilitiesToTrack, utility];
            return { ...prev, utilitiesToTrack: newUtils };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const propertyData = {
            ...formData,
            leaseStart: new Date(formData.leaseStart).toISOString(),
            leaseEnd: new Date(formData.leaseEnd).toISOString(),
        };
        onSave(property ? { ...propertyData, id: property.id, userId: property.userId } : propertyData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Property Name (e.g., Unit 101)" required className="w-full p-2 border rounded" />
            <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Address" required className="w-full p-2 border rounded" />
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="rentAmount" className="block text-sm font-medium text-gray-700">Rent Amount</label>
                    <input id="rentAmount" type="number" name="rentAmount" value={formData.rentAmount} onChange={handleChange} placeholder="Rent Amount" required className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                    <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700">Security Deposit</label>
                    <input id="securityDeposit" type="number" name="securityDeposit" value={formData.securityDeposit} onChange={handleChange} placeholder="Security Deposit" required className="w-full p-2 border rounded mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="leaseStart" className="block text-sm font-medium text-gray-700">Lease Start</label>
                    <input id="leaseStart" type="date" name="leaseStart" value={formData.leaseStart} onChange={handleChange} required className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                    <label htmlFor="leaseEnd" className="block text-sm font-medium text-gray-700">Lease End</label>
                    <input id="leaseEnd" type="date" name="leaseEnd" value={formData.leaseEnd} onChange={handleChange} required className="w-full p-2 border rounded mt-1" />
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-2">Tenant Information</h3>
                {formData.tenants.map((tenant, index) => (
                    <div key={tenant.id} className="p-3 border rounded mb-2 space-y-2 bg-slate-50 relative">
                         {formData.tenants.length > 1 && (
                            <button type="button" onClick={() => removeTenant(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        )}
                        <input type="text" value={tenant.name} onChange={(e) => handleTenantChange(index, 'name', e.target.value)} placeholder={`Tenant ${index + 1} Name`} required className="w-full p-2 border rounded" />
                        <input type="email" value={tenant.email} onChange={(e) => handleTenantChange(index, 'email', e.target.value)} placeholder="Tenant Email" required className="w-full p-2 border rounded" />
                        <input type="tel" value={tenant.phone} onChange={(e) => handleTenantChange(index, 'phone', e.target.value)} placeholder="Tenant Phone" required className="w-full p-2 border rounded" />
                    </div>
                ))}
                <button type="button" onClick={addTenant} className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                    <PlusIcon className="w-4 h-4" /> Add Another Tenant
                </button>
            </div>
             <div>
                <h3 className="font-semibold mb-2">Utilities to Track</h3>
                <div className="flex flex-wrap gap-2">
                    {UTILITY_CATEGORIES.map(util => (
                        <button type="button" key={util} onClick={() => handleUtilityToggle(util)} className={`px-3 py-1 rounded-full text-sm ${formData.utilitiesToTrack.includes(util) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                            {util}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Property</button>
            </div>
        </form>
    );
};

interface PropertiesScreenProps {
  action: string | null;
  onActionDone: () => void;
}

const PropertiesScreen: React.FC<PropertiesScreenProps> = ({ action, onActionDone }) => {
    const { properties, addProperty, updateProperty, deleteProperty } = useAppContext();
    const { isReadOnly } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(undefined);

    const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
    const [roomsProperty, setRoomsProperty] = useState<Property | null>(null);

    const openRoomsModal = (property: Property) => {
        setRoomsProperty(property);
        setIsRoomsModalOpen(true);
    };

    const openAddModal = useCallback(() => {
        if (isReadOnly) return;
        setSelectedProperty(undefined);
        setIsModalOpen(true);
    }, [isReadOnly]);

    const openEditModal = (property: Property) => {
        if (isReadOnly) return;
        setSelectedProperty(property);
        setIsModalOpen(true);
    };

    useEffect(() => {
        if (action === 'add') {
          openAddModal();
          onActionDone();
        }
    }, [action, onActionDone, openAddModal]);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyPropertyId, setHistoryPropertyId] = useState<string | null>(null);

    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [generatorLease, setGeneratorLease] = useState<any>(null);

    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [renewalProperty, setRenewalProperty] = useState<Property | null>(null);

    const openHistoryModal = (propertyId: string) => {
        setHistoryPropertyId(propertyId);
        setIsHistoryModalOpen(true);
    };

    const handleOpenGenerator = (lease: any) => {
        setGeneratorLease(lease);
        setIsGeneratorOpen(true);
    };

    const handleOpenRenewal = (property: Property) => {
        setRenewalProperty(property);
        setIsRenewalModalOpen(true);
    };

    const { renewLease } = useAppContext();

    const handleSave = (propertyData: Omit<Property, 'id' | 'userId'> | Property) => {
        if ('id' in propertyData) {
            updateProperty(propertyData as Property);
        } else {
            addProperty(propertyData);
        }
        setIsModalOpen(false);
        setSelectedProperty(undefined);
    };

    const handleDelete = (propertyId: string) => {
        const property = properties.find(p => p.id === propertyId);
        if (!property || isReadOnly) return;
        if (window.confirm(`Are you sure you want to delete "${property.name}"? This will also delete ALL associated payment and repair records. This action cannot be undone.`)) {
            deleteProperty(propertyId);
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Properties</h2>
                <button onClick={openAddModal} disabled={isReadOnly} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                    <PlusIcon className="w-5 h-5" />
                    Add Property
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(prop => (
                    <Card key={prop.id}>
                        <CardHeader className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                                <h3 className="font-bold text-lg text-blue-800">{prop.name}</h3>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prop.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                  <MapPinIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                  <span>{prop.address}</span>
                                </a>
                            </div>
                           {!isReadOnly && (
                             <div className="flex items-center flex-shrink-0">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); openEditModal(prop); }} 
                                    className="text-gray-400 hover:text-blue-600 p-1 rounded-full transition-colors"
                                    aria-label="Edit Property"
                                >
                                    <PencilSquareIcon className="w-5 h-5"/>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(prop.id); }} 
                                    className="text-gray-400 hover:text-red-600 p-1 rounded-full transition-colors"
                                    aria-label="Delete Property"
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                           )}
                        </CardHeader>
                         <CardContent>
                            {prop.tenants.map((tenant, index) => (
                                <div key={tenant.id} className={`flex items-center gap-3 ${index > 0 ? 'mt-3 pt-3 border-t' : ''}`}>
                                    <UserIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium">{tenant.name}</p>
                                        <p className="text-xs text-gray-500">{tenant.email} &bull; {tenant.phone}</p>
                                    </div>
                                </div>
                            ))}
                            {prop.rooms && prop.rooms.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <BuildingOfficeIcon className="w-4 h-4 text-slate-400" />
                                        Rooms & Occupancy
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {prop.rooms.map(r => {
                                            const isRoomOccupied = r.tenants && r.tenants.length > 0 && r.tenants[0].name.trim() !== '';
                                            return (
                                                <span key={r.id} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                    isRoomOccupied 
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-600'
                                                }`}>
                                                    {r.title}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                         <CardFooter className="flex justify-between items-center bg-slate-50/50 border-t border-gray-100 flex-wrap gap-2 py-3">
                             <div className="flex gap-3 flex-wrap">
                                <button 
                                    onClick={() => openHistoryModal(prop.id)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                >
                                    <ClockIcon className="w-4 h-4" />
                                    History
                                </button>
                                <button 
                                    onClick={() => {
                                        setHistoryPropertyId(prop.id);
                                        handleOpenGenerator({
                                            id: 'current',
                                            propertyId: prop.id,
                                            leaseStart: prop.leaseStart,
                                            leaseEnd: prop.leaseEnd,
                                            rentAmount: prop.rentAmount,
                                            tenants: prop.tenants,
                                            status: 'active'
                                        });
                                    }}
                                    className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                >
                                    <DocumentTextIcon className="w-4 h-4" />
                                    Lease Doc
                                </button>
                                <button 
                                    onClick={() => openRoomsModal(prop)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                                    title="Manage Rooms and Room Occupancy agreements"
                                >
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    Rooms ({prop.rooms?.length || 0})
                                </button>
                                {!isReadOnly && (
                                    <button 
                                        onClick={() => handleOpenRenewal(prop)}
                                        className="text-xs font-bold text-green-600 hover:text-green-800 flex items-center gap-1 transition-colors"
                                    >
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        Renew
                                    </button>
                                )}
                             </div>
                             <div className="text-xs font-medium text-slate-500">
                                Expires: {formatDate(prop.leaseEnd)}
                             </div>
                          </CardFooter>
                    </Card>
                ))}
                 {properties.length === 0 && (
                    <div className="md:col-span-3 text-center py-10 text-gray-500">
                        <BuildingOfficeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                        <p>No properties found.</p>
                        {!isReadOnly && <p>Click "Add Property" to get started.</p>}
                    </div>
                )}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProperty ? "Edit Property" : "Add New Property"}>
                <PropertyForm 
                    property={selectedProperty} 
                    onSave={handleSave} 
                    onCancel={() => setIsModalOpen(false)} 
                />
            </Modal>

            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Lease History">
                {historyPropertyId && <LeaseHistory propertyId={historyPropertyId} onGenerate={handleOpenGenerator} />}
            </Modal>

            {isGeneratorOpen && generatorLease && historyPropertyId && (
                <LeaseGeneratorModal 
                    isOpen={isGeneratorOpen}
                    onClose={() => setIsGeneratorOpen(false)}
                    property={properties.find(p => p.id === historyPropertyId)!}
                    lease={generatorLease}
                />
            )}

            {isRenewalModalOpen && renewalProperty && (
                <LeaseRenewalModal 
                    isOpen={isRenewalModalOpen}
                    onClose={() => setIsRenewalModalOpen(false)}
                    property={renewalProperty}
                    onRenew={renewLease}
                />
            )}

            {isRoomsModalOpen && roomsProperty && (
                <RoomsModal 
                    isOpen={isRoomsModalOpen}
                    onClose={() => {
                        setIsRoomsModalOpen(false);
                        setRoomsProperty(null);
                    }}
                    property={properties.find(p => p.id === roomsProperty.id) || roomsProperty}
                />
            )}
        </div>
    );
};

export default PropertiesScreen;
