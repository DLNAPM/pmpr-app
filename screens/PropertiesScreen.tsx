
import React, { useState, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Property, Tenant } from '../types';
import { BuildingOfficeIcon, PlusIcon, UserIcon, PencilSquareIcon, MapPinIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { UTILITY_CATEGORIES } from '../constants';

const PropertyForm: React.FC<{property?: Property; onSave: (property: Omit<Property, 'id'> | Property) => void; onCancel: () => void}> = ({ property, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Omit<Property, 'id'>>({
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
        onSave(property ? { ...propertyData, id: property.id } : propertyData);
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
                    <div key={tenant.id} className="p-2 border rounded mb-2 space-y-2">
                        <input type="text" value={tenant.name} onChange={(e) => handleTenantChange(index, 'name', e.target.value)} placeholder="Tenant Name" required className="w-full p-2 border rounded" />
                        <input type="email" value={tenant.email} onChange={(e) => handleTenantChange(index, 'email', e.target.value)} placeholder="Tenant Email" required className="w-full p-2 border rounded" />
                        <input type="tel" value={tenant.phone} onChange={(e) => handleTenantChange(index, 'phone', e.target.value)} placeholder="Tenant Phone" required className="w-full p-2 border rounded" />
                    </div>
                ))}
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
    const { properties, addProperty, updateProperty } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(undefined);

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


    const handleSave = (propertyData: Omit<Property, 'id'> | Property) => {
        if ('id' in propertyData) {
            updateProperty(propertyData);
        } else {
            addProperty(propertyData);
        }
        setIsModalOpen(false);
        setSelectedProperty(undefined);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Properties</h2>
                <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
                    <PlusIcon className="w-5 h-5" />
                    Add Property
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(prop => (
                    <Card key={prop.id} onClick={() => openEditModal(prop)}>
                        <CardHeader className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-blue-800">{prop.name}</h3>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prop.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                                >
                                  <MapPinIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                  <span>{prop.address}</span>
                                </a>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); openEditModal(prop); }} 
                                className="text-gray-400 hover:text-blue-600 p-1 rounded-full transition-colors"
                                aria-label="Edit Property"
                            >
                                <PencilSquareIcon className="w-5 h-5"/>
                            </button>
                        </CardHeader>
                        <CardContent>
                            {prop.tenants.map(tenant => (
                                <div key={tenant.id} className="flex items-center gap-3">
                                    <UserIcon className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="font-medium">{tenant.name}</p>
                                        <p className="text-xs text-gray-500">{tenant.email}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
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