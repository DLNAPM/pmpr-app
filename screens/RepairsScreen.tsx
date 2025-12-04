import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader, CardFooter } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Repair, RepairStatus, Contractor, Property } from '../types';
import { PlusIcon, WrenchScrewdriverIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { REPAIR_STATUS_OPTIONS } from '../constants';
import { EditTarget } from '../App';
import { useAuth } from '../contexts/AuthContext';

const ContractorForm: React.FC<{onSave: (contractor: Omit<Contractor, 'id' | 'userId'>) => void; onCancel: () => void;}> = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', contact: '', companyName: '', companyAddress: '', email: '', comments: '', });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(prev => ({...prev, [name]: value})); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (formData.name && formData.contact) { onSave(formData); } else { alert("Contact Person Name and Phone are required."); } };
    return ( <form onSubmit={handleSubmit} className="space-y-4"> <h4 className="font-semibold text-lg">Add New Contractor</h4> <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Contact Person Name" required className="w-full p-2 border rounded" /> <input type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="Contact Phone" required className="w-full p-2 border rounded" /> <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company Name" className="w-full p-2 border rounded" /> <input type="text" name="companyAddress" value={formData.companyAddress} onChange={handleChange} placeholder="Company Address" className="w-full p-2 border rounded" /> <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" className="w-full p-2 border rounded" /> <textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Comments..." rows={3} className="w-full p-2 border rounded" /> <div className="flex justify-end gap-2 pt-4"> <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button> <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Contractor</button> </div> </form> );
}

const RepairForm: React.FC<{ repair?: Repair; properties: Property[]; contractors: Contractor[]; onSave: (repair: Omit<Repair, 'id' | 'userId'> | Repair) => void; onCancel: () => void; onAddContractor: (contractor: Omit<Contractor, 'id' | 'userId'>) => Contractor; }> = ({ repair, properties, contractors, onSave, onCancel, onAddContractor }) => {
    const [formData, setFormData] = useState({ propertyId: repair?.propertyId || (properties.length > 0 ? properties[0].id : ''), description: repair?.description || '', status: repair?.status || RepairStatus.PENDING_REPAIRMEN, cost: repair?.cost || 0, contractorId: repair?.contractorId || '', notes: repair?.notes || '', repairDate: repair?.repairDate?.split('T')[0] || '', });
    const [isAddingContractor, setIsAddingContractor] = useState(false);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const { name, value } = e.target; if (name === 'contractorId' && value === 'add_new') { setIsAddingContractor(true); } else { setFormData(prev => ({...prev, [name]: name === 'cost' ? parseFloat(value) || 0 : value })); } };
    const handleSaveNewContractor = (newContractorData: Omit<Contractor, 'id'| 'userId'>) => { const newContractor = onAddContractor(newContractorData); setFormData(prev => ({ ...prev, contractorId: newContractor.id })); setIsAddingContractor(false); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(!formData.propertyId) { alert('Please select a property.'); return; } const repairData = { ...formData, requestDate: repair?.requestDate || new Date().toISOString(), repairDate: formData.repairDate ? new Date(formData.repairDate).toISOString() : undefined, completionDate: formData.status === RepairStatus.COMPLETE && !repair?.completionDate ? new Date().toISOString() : repair?.completionDate, }; onSave(repair ? { ...repairData, id: repair.id, userId: repair.userId } : repairData); };
    if (isAddingContractor) { return <ContractorForm onSave={handleSaveNewContractor} onCancel={() => setIsAddingContractor(false)} /> }
    return ( <form onSubmit={handleSubmit} className="space-y-4"> <select name="propertyId" value={formData.propertyId} onChange={handleChange} className="w-full p-2 border rounded" disabled={!!repair}> <option value="">Select a Property</option> {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description of issue" required rows={3} className="w-full p-2 border rounded" /> <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div> <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label> <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded mt-1"> {REPAIR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)} </select> </div> <div> <label htmlFor="repairDate" className="block text-sm font-medium text-gray-700">Repair Date</label> <input id="repairDate" type="date" name="repairDate" value={formData.repairDate} onChange={handleChange} className="w-full p-2 border rounded mt-1" /> </div> </div> <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div> <label htmlFor="cost" className="block text-sm font-medium text-gray-700">Cost</label> <input id="cost" type="number" name="cost" value={formData.cost} onChange={handleChange} placeholder="Cost" className="w-full p-2 border rounded mt-1" /> </div> <div> <label htmlFor="contractorId" className="block text-sm font-medium text-gray-700">Contractor</label> <select id="contractorId" name="contractorId" value={formData.contractorId} onChange={handleChange} className="w-full p-2 border rounded mt-1"> <option value="">Select a Contractor</option> {contractors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.companyName || 'N/A'})</option>)} <option value="add_new" className="font-bold text-blue-600">-- Add New Contractor --</option> </select> </div> </div> <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" rows={2} className="w-full p-2 border rounded" /> <div className="flex justify-end gap-2 pt-4"> <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button> <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Repair</button> </div> </form> );
};

interface RepairsScreenProps {
  action: string | null;
  editTarget: EditTarget | null;
  onActionDone: () => void;
}

const RepairsScreen: React.FC<RepairsScreenProps> = ({ action, editTarget, onActionDone }) => {
    const { properties, repairs, contractors, addRepair, updateRepair, addContractor, getPropertyById, getContractorById } = useAppContext();
    const { isReadOnly } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRepair, setSelectedRepair] = useState<Repair | undefined>(undefined);
    
    const openAddModal = useCallback(() => {
        if (isReadOnly) return;
        if (properties.length === 0) {
            alert("You must have a property to add a repair request.");
            return;
        }
        setSelectedRepair(undefined);
        setIsModalOpen(true);
    }, [isReadOnly, properties.length]);

    const openEditModal = useCallback((repair: Repair) => {
        if (isReadOnly) return;
        setSelectedRepair(repair);
        setIsModalOpen(true);
    }, [isReadOnly]);

    useEffect(() => { if (action === 'add') { openAddModal(); onActionDone(); } }, [action, onActionDone, openAddModal]);
    useEffect(() => { if (editTarget && editTarget.type === 'repair') { const repairToEdit = repairs.find(r => r.id === editTarget.id); if (repairToEdit && !isReadOnly) { openEditModal(repairToEdit); } onActionDone(); } }, [editTarget, onActionDone, repairs, openEditModal, isReadOnly]);

    const handleSave = (repairData: Omit<Repair, 'id' | 'userId'> | Repair) => { 
        if ('id' in repairData) { 
            updateRepair(repairData as Repair); 
        } else { 
            addRepair(repairData); 
        } 
        setIsModalOpen(false); 
        setSelectedRepair(undefined); 
    };

    const getStatusColor = (status: RepairStatus) => { switch (status) { case RepairStatus.COMPLETE: return 'bg-green-100 text-green-800'; case RepairStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800'; case RepairStatus.PENDING_SUPPLY: return 'bg-yellow-100 text-yellow-800'; case RepairStatus.PENDING_REPAIRMEN: return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; } };
    const sortedRepairs = useMemo(() => [...repairs].sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()), [repairs]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Repairs</h2>
                <button onClick={openAddModal} disabled={isReadOnly} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                    <PlusIcon className="w-5 h-5" />
                    Add Repair Request
                </button>
            </div>
            <div className="space-y-4">
                {sortedRepairs.map(repair => {
                    const property = getPropertyById(repair.propertyId);
                    return (
                        <Card key={repair.id} onClick={!isReadOnly ? () => openEditModal(repair) : undefined}>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                    <div>
                                        <p className="font-bold text-blue-800">{property?.name || 'Unknown Property'}</p>
                                        <p className="mt-1">{repair.description}</p>
                                        {repair.contractorId && <p className="text-sm text-gray-600 mt-1">Contractor: {getContractorById(repair.contractorId)?.name || 'N/A'}</p>}
                                        <div className="text-xs text-gray-500 mt-2 space-x-4">
                                          <span>Requested: {new Date(repair.requestDate).toLocaleDateString()}</span>
                                          {repair.repairDate && <span>Repaired: {new Date(repair.repairDate).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(repair.status)}`}>{repair.status}</span>
                                        <p className="text-lg font-bold mt-2">${repair.cost.toFixed(2)}</p>
                                    </div>
                                </div>
                            </CardContent>
                            {repair.notes && ( <CardFooter> <p className="text-sm text-gray-600 italic whitespace-pre-wrap"><span className="font-semibold not-italic">Notes:</span> {repair.notes}</p> </CardFooter> )}
                        </Card>
                    )
                })}
                {repairs.length === 0 && (
                     <div className="text-center py-10 text-gray-500">
                        <WrenchScrewdriverIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                        <p>No repair requests found.</p>
                        {!isReadOnly && <p>Click "Add Repair Request" to create one.</p>}
                    </div>
                )}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedRepair ? "Edit Repair Request" : "Add Repair Request"}>
                <RepairForm repair={selectedRepair} properties={properties} contractors={contractors} onSave={handleSave} onCancel={() => setIsModalOpen(false)} onAddContractor={addContractor} />
            </Modal>
        </div>
    );
};

export default RepairsScreen;
