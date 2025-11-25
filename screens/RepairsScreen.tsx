
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Repair, RepairStatus } from '../types';
import { PlusIcon, WrenchScrewdriverIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { REPAIR_STATUS_OPTIONS } from '../constants';

const RepairForm: React.FC<{
    repair?: Repair;
    properties: {id: string, name: string}[];
    onSave: (repair: Omit<Repair, 'id'> | Repair) => void;
    onCancel: () => void;
}> = ({ repair, properties, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        propertyId: repair?.propertyId || (properties.length > 0 ? properties[0].id : ''),
        description: repair?.description || '',
        status: repair?.status || RepairStatus.PENDING_REPAIRMEN,
        cost: repair?.cost || 0,
        contractorName: repair?.contractorName || '',
        contractorContact: repair?.contractorContact || '',
        notes: repair?.notes || '',
        repairDate: repair?.repairDate?.split('T')[0] || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: name === 'cost' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.propertyId) {
            alert('Please select a property.');
            return;
        }
        const repairData = {
            ...formData,
            requestDate: repair?.requestDate || new Date().toISOString(),
            repairDate: formData.repairDate ? new Date(formData.repairDate).toISOString() : undefined,
            completionDate: formData.status === RepairStatus.COMPLETE && !repair?.completionDate ? new Date().toISOString() : repair?.completionDate,
        };
        onSave(repair ? { ...repairData, id: repair.id } : repairData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <select name="propertyId" value={formData.propertyId} onChange={handleChange} className="w-full p-2 border rounded">
                <option value="">Select a Property</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description of issue" required rows={3} className="w-full p-2 border rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded mt-1">
                        {REPAIR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="repairDate" className="block text-sm font-medium text-gray-700">Repair Date</label>
                    <input id="repairDate" type="date" name="repairDate" value={formData.repairDate} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                </div>
            </div>
            <input type="number" name="cost" value={formData.cost} onChange={handleChange} placeholder="Cost" className="w-full p-2 border rounded" />
            <input type="text" name="contractorName" value={formData.contractorName} onChange={handleChange} placeholder="Contractor Name" className="w-full p-2 border rounded" />
            <input type="text" name="contractorContact" value={formData.contractorContact} onChange={handleChange} placeholder="Contractor Contact" className="w-full p-2 border rounded" />
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" rows={2} className="w-full p-2 border rounded" />
             <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Repair</button>
            </div>
        </form>
    );
};

interface RepairsScreenProps {
  action: string | null;
  onActionDone: () => void;
}

const RepairsScreen: React.FC<RepairsScreenProps> = ({ action, onActionDone }) => {
    const { properties, repairs, addRepair, updateRepair, getPropertyById } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRepair, setSelectedRepair] = useState<Repair | undefined>(undefined);

    const openAddModal = useCallback(() => {
        if (properties.length === 0) {
            alert("You must add a property before logging a repair.");
            return;
        }
        setSelectedRepair(undefined);
        setIsModalOpen(true);
    }, [properties.length]);

     useEffect(() => {
        if (action === 'add') {
          openAddModal();
          onActionDone();
        }
    }, [action, onActionDone, openAddModal]);

    const handleSave = (repairData: Omit<Repair, 'id'> | Repair) => {
        if ('id' in repairData) {
            updateRepair(repairData);
        } else {
            addRepair(repairData);
        }
        setIsModalOpen(false);
        setSelectedRepair(undefined);
    };

    const openEditModal = (repair: Repair) => {
        setSelectedRepair(repair);
        setIsModalOpen(true);
    };
    
    const getStatusColor = (status: RepairStatus) => {
        switch (status) {
            case RepairStatus.COMPLETE: return 'bg-green-100 text-green-800';
            case RepairStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800';
            case RepairStatus.PENDING_SUPPLY: return 'bg-yellow-100 text-yellow-800';
            case RepairStatus.PENDING_REPAIRMEN: return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const sortedRepairs = useMemo(() => {
        return [...repairs].sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }, [repairs]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Repairs</h2>
                <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
                    <PlusIcon className="w-5 h-5" />
                    Add Repair Request
                </button>
            </div>
            <div className="space-y-4">
                {sortedRepairs.map(repair => (
                    <Card key={repair.id} onClick={() => openEditModal(repair)}>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                <div>
                                    <p className="font-bold text-blue-800">{getPropertyById(repair.propertyId)?.name || 'Unknown Property'}</p>
                                    <p className="mt-1">{repair.description}</p>
                                    <div className="text-xs text-gray-500 mt-2 space-x-4">
                                      <span>Requested: {new Date(repair.requestDate).toLocaleDateString()}</span>
                                      {repair.repairDate && <span>Repaired: {new Date(repair.repairDate).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(repair.status)}`}>
                                        {repair.status}
                                    </span>
                                    <p className="text-lg font-bold mt-2">${repair.cost.toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {repairs.length === 0 && (
                     <div className="text-center py-10 text-gray-500">
                        <WrenchScrewdriverIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                        <p>No repair requests found.</p>
                        <p>Click "Add Repair Request" to create one.</p>
                    </div>
                )}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedRepair ? "Edit Repair Request" : "Add Repair Request"}>
                <RepairForm
                    repair={selectedRepair}
                    properties={properties.map(p => ({ id: p.id, name: p.name }))}
                    onSave={handleSave}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );
};

export default RepairsScreen;