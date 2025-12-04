import React, { useState, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader, CardFooter } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Property, Tenant } from '../types';
import { BuildingOfficeIcon, PlusIcon, UserIcon, PencilSquareIcon, MapPinIcon, TrashIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { UTILITY_CATEGORIES } from '../constants';
import { useAuth } from '../contexts/AuthContext';

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
    const { user, authStatus } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(undefined);

    const isOwner = (property: Property) => authStatus === 'guest' || property.userId === user?.id;

    const openAddModal = useCallback(() => {
        setSelectedProperty(undefined);
        setIsModalOpen(true);
    }, []);

    const openEditModal = (property: Property) => {
        setSelectedProperty(property);
        setIsModalOpen(true);
    };

    useEffect(() => {
        if (action === 'add') {
          openAddModal();
          onActionDone();
        }
    }, [action, onActionDone, openAddModal]);

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
        if (!property) return;
        if (window.confirm(`Are you sure you want to delete "${property.name}"? This will also delete ALL associated payment and repair records. This action cannot be undone.`)) {
            deleteProperty(propertyId);
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Properties</h2>
                <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400">
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
                           {isOwner(prop) && (
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
                        </CardContent>
                         {prop.ownerInfo && (
                            <CardFooter className="bg-slate-100">
                                <p className="text-xs text-slate-500 font-medium">Shared by: {prop.ownerInfo.name}</p>
                            </CardFooter>
                        )}
                    </Card>
                ))}
                 {properties.length === 0 && (
                    <div className="md:col-span-3 text-center py-10 text-gray-500">
                        <BuildingOfficeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                        <p>No properties found.</p>
                        <p>Click "Add Property" to get started.</p>
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
        </div>
    );
};

export default PropertiesScreen;