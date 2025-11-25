
import React, { useState } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Contractor } from '../types';
import { PlusIcon, UsersIcon, PencilSquareIcon } from '../components/Icons';
import Modal from '../components/Modal';

const ContractorForm: React.FC<{
    contractor?: Contractor;
    onSave: (contractor: Omit<Contractor, 'id'> | Contractor) => void;
    onCancel: () => void;
}> = ({ contractor, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: contractor?.name || '',
        contact: contractor?.contact || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(contractor ? { ...formData, id: contractor.id } : formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Contractor Name" required className="w-full p-2 border rounded" />
            <input type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="Contact Info (Phone/Email)" required className="w-full p-2 border rounded" />
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Contractor</button>
            </div>
        </form>
    );
};

const ContractorsScreen: React.FC = () => {
    const { contractors, addContractor, updateContractor } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContractor, setSelectedContractor] = useState<Contractor | undefined>(undefined);

    const openAddModal = () => {
        setSelectedContractor(undefined);
        setIsModalOpen(true);
    };
    
    const openEditModal = (contractor: Contractor) => {
        setSelectedContractor(contractor);
        setIsModalOpen(true);
    };
    
    const handleSave = (contractorData: Omit<Contractor, 'id'> | Contractor) => {
        if ('id' in contractorData && contractorData.id) {
            updateContractor(contractorData);
        } else {
            addContractor(contractorData);
        }
        setIsModalOpen(false);
        setSelectedContractor(undefined);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Contractors</h2>
                <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
                    <PlusIcon className="w-5 h-5" />
                    Add Contractor
                </button>
            </div>
            <div className="space-y-4">
                {contractors.map(c => (
                     <Card key={c.id}>
                        <CardContent className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-lg">{c.name}</p>
                                <p className="text-gray-600">{c.contact}</p>
                            </div>
                            <button 
                                onClick={() => openEditModal(c)}
                                className="text-gray-400 hover:text-blue-600 p-2 rounded-full transition-colors"
                                aria-label="Edit Contractor"
                            >
                                <PencilSquareIcon className="w-5 h-5"/>
                            </button>
                        </CardContent>
                    </Card>
                ))}
                 {contractors.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                        <p>No contractors found.</p>
                        <p>Click "Add Contractor" to create one.</p>
                    </div>
                )}
            </div>
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedContractor ? "Edit Contractor" : "Add New Contractor"}>
                <ContractorForm 
                    contractor={selectedContractor} 
                    onSave={handleSave} 
                    onCancel={() => setIsModalOpen(false)} 
                />
            </Modal>
        </div>
    );
};

export default ContractorsScreen;
