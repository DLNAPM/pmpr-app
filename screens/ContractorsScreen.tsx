
import React, { useState, useRef } from 'react';
import Card, { CardContent } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Contractor } from '../types';
import { PlusIcon, UsersIcon, PencilSquareIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '../components/Icons';
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

interface ImportPreview {
    validRecords: Omit<Contractor, 'id'>[];
    errors: { row: number; message: string }[];
}


const ContractorsScreen: React.FC = () => {
    const { contractors, addContractor, updateContractor } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContractor, setSelectedContractor] = useState<Contractor | undefined>(undefined);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


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
    
    const handleExport = () => {
        const headers = ['Name', 'Contact'];
        const rows = contractors.map(c => `"${c.name}","${c.contact}"`);
        
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `pmpr_contractors_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            processCsv(text);
        };
        reader.readAsText(file);
    };

    const processCsv = (csvText: string) => {
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim());
        if (lines.length < 2) {
            alert('CSV file must have a header row and at least one data row.');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['Name', 'Contact'];
        if (!requiredHeaders.every(h => headers.includes(h))) {
            alert(`CSV is missing required headers. Must include: ${requiredHeaders.join(', ')}`);
            return;
        }

        const preview: ImportPreview = { validRecords: [], errors: [] };

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const name = values[0]?.trim();
            const contact = values[1]?.trim();

            if (!name || !contact) {
                preview.errors.push({ row: i + 1, message: 'Missing Name or Contact.' });
                continue;
            }

            preview.validRecords.push({ name, contact });
        }
        
        setImportPreview(preview);
        setIsImportModalOpen(true);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
    };
    
    const handleConfirmImport = () => {
        if (!importPreview?.validRecords) return;
        
        importPreview.validRecords.forEach(contractorData => {
            addContractor(contractorData);
        });
        
        alert(`${importPreview.validRecords.length} contractors imported successfully.`);
        setIsImportModalOpen(false);
        setImportPreview(null);
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Contractors</h2>
                 <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        Import
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden"/>
                    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Export
                    </button>
                    <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
                        <PlusIcon className="w-5 h-5" />
                        Add Contractor
                    </button>
                </div>
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
            
            {importPreview && (
                 <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Contractors Preview">
                    <div className="space-y-4">
                        <p>Found <strong>{importPreview.validRecords.length}</strong> valid records and <strong>{importPreview.errors.length}</strong> errors.</p>
                        {importPreview.errors.length > 0 && (
                             <div>
                                <h4 className="font-semibold text-red-600">Errors:</h4>
                                <ul className="text-sm text-red-500 list-disc list-inside max-h-40 overflow-y-auto bg-red-50 p-2 rounded">
                                    {importPreview.errors.map(err => <li key={err.row}>Row {err.row}: {err.message}</li>)}
                                </ul>
                            </div>
                        )}
                         <p className="text-sm text-gray-600">Only valid records will be imported. Please review before continuing.</p>
                         <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button onClick={handleConfirmImport} disabled={importPreview.validRecords.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400">
                                Confirm Import
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ContractorsScreen;
