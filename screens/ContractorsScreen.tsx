import React, { useState, useRef } from 'react';
import Card, { CardContent } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';
import { Contractor } from '../types';
import { PlusIcon, UsersIcon, PencilSquareIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const ContractorForm: React.FC<{ contractor?: Contractor; onSave: (contractor: Omit<Contractor, 'id' | 'userId'> | Contractor) => void; onCancel: () => void; }> = ({ contractor, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: contractor?.name || '', contact: contractor?.contact || '', companyName: contractor?.companyName || '', companyAddress: contractor?.companyAddress || '', email: contractor?.email || '', comments: contractor?.comments || '', });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(prev => ({...prev, [name]: value})); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (formData.name && formData.contact) { onSave(contractor ? { ...contractor, ...formData } : formData); } else { alert("Contact Person Name and Phone are required."); } };
    return ( <form onSubmit={handleSubmit} className="space-y-4"> <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Contact Person Name" required className="w-full p-2 border rounded" /> <input type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="Contact Phone" required className="w-full p-2 border rounded" /> <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company Name" className="w-full p-2 border rounded" /> <input type="text" name="companyAddress" value={formData.companyAddress} onChange={handleChange} placeholder="Company Address" className="w-full p-2 border rounded" /> <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" className="w-full p-2 border rounded" /> <textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Comments..." rows={3} className="w-full p-2 border rounded" /> <div className="flex justify-end gap-2 pt-4"> <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button> <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Contractor</button> </div> </form> );
};

interface ImportPreview { validRecords: Omit<Contractor, 'id' | 'userId'>[]; errors: { row: number; message: string }[]; }

const ContractorsScreen: React.FC = () => {
    const { contractors, addContractor, updateContractor } = useAppContext();
    const { isReadOnly } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContractor, setSelectedContractor] = useState<Contractor | undefined>(undefined);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const openAddModal = () => { setSelectedContractor(undefined); setIsModalOpen(true); };
    const openEditModal = (contractor: Contractor) => { setSelectedContractor(contractor); setIsModalOpen(true); };
    const handleSave = (contractorData: Omit<Contractor, 'id' | 'userId'> | Contractor) => { if ('id' in contractorData) { updateContractor(contractorData); } else { addContractor(contractorData); } setIsModalOpen(false); setSelectedContractor(undefined); };
    
    const handleExport = () => { 
      const headers = ['Name', 'Contact', 'CompanyName', 'CompanyAddress', 'Email', 'Comments']; 
      const escapeCsvCell = (cellData: string | undefined) => { if (cellData === undefined || cellData === null) return ''; const str = String(cellData); if (str.includes(',') || str.includes('"') || str.includes('\n')) { return `"${str.replace(/"/g, '""')}"`; } return str; }; 
      const rows = contractors.map(c => [c.name, c.contact, c.companyName, c.companyAddress, c.email, c.comments].map(escapeCsvCell).join(',')); 
      const csvContent = [headers.join(','), ...rows].join('\n'); 
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
      const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.setAttribute('href', url); 
      const date = new Date().toISOString().split('T')[0]; 
      link.setAttribute('download', `pmpr_contractors_${date}.csv`); 
      document.body.appendChild(link); link.click(); document.body.removeChild(link); 
    };
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { const text = e.target?.result as string; processCsv(text); }; reader.readAsText(file); };
    const processCsv = (csvText: string) => { const lines = csvText.split(/\r\n|\n/).filter(line => line.trim()); if (lines.length < 2) { alert('CSV file must have a header row and at least one data row.'); return; } const headers = lines[0].split(',').map(h => h.trim()); const requiredHeaders = ['Name', 'Contact']; if (!requiredHeaders.every(h => headers.includes(h))) { alert(`CSV is missing required headers. Must include: ${requiredHeaders.join(', ')}`); return; } const preview: ImportPreview = { validRecords: [], errors: [] }; for (let i = 1; i < lines.length; i++) { const values = lines[i].split(','); const rowData: Omit<Contractor, 'id' | 'userId'> = { name: values[headers.indexOf('Name')]?.trim() || '', contact: values[headers.indexOf('Contact')]?.trim() || '', companyName: values[headers.indexOf('CompanyName')]?.trim(), companyAddress: values[headers.indexOf('CompanyAddress')]?.trim(), email: values[headers.indexOf('Email')]?.trim(), comments: values[headers.indexOf('Comments')]?.trim(), }; if (!rowData.name || !rowData.contact) { preview.errors.push({ row: i + 1, message: 'Missing Name or Contact.' }); continue; } preview.validRecords.push(rowData); } setImportPreview(preview); setIsImportModalOpen(true); if(fileInputRef.current) fileInputRef.current.value = ""; };
    const handleConfirmImport = () => { if (!importPreview?.validRecords) return; importPreview.validRecords.forEach(contractorData => { addContractor(contractorData); }); alert(`${importPreview.validRecords.length} contractors imported successfully.`); setIsImportModalOpen(false); setImportPreview(null); };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Contractors</h2>
                 <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} disabled={isReadOnly} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed"><ArrowUpTrayIcon className="w-4 h-4" />Import</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden"/>
                    <button onClick={handleExport} disabled={isReadOnly} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed">
                        <ArrowDownTrayIcon className="w-4 h-4" /> Export
                    </button>
                    <button onClick={openAddModal} disabled={isReadOnly} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                        <PlusIcon className="w-5 h-5" /> Add Contractor
                    </button>
                </div>
            </div>
            <div className="space-y-4">
                {contractors.map(c => (
                     <Card key={c.id}>
                        <CardContent>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="font-bold text-lg text-blue-800">{c.companyName || c.name}</p>
                                    {c.companyName && <p className="font-semibold">{c.name}</p>}
                                    <p className="text-gray-600 text-sm">{c.contact}</p>
                                    {c.email && <p className="text-gray-600 text-sm">{c.email}</p>}
                                    {c.companyAddress && <p className="text-gray-600 text-sm">{c.companyAddress}</p>}
                                    {c.comments && <p className="text-sm text-gray-500 italic mt-2 p-2 bg-slate-50 rounded-md whitespace-pre-wrap">{c.comments}</p>}
                                </div>
                                {!isReadOnly && (
                                <button onClick={() => openEditModal(c)} className="text-gray-400 hover:text-blue-600 p-2 rounded-full transition-colors flex-shrink-0" aria-label="Edit Contractor">
                                    <PencilSquareIcon className="w-5 h-5"/>
                                </button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    )
                )}
                 {contractors.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                        <p>No contractors found.</p>
                        {!isReadOnly && <p>Click "Add Contractor" to create one.</p>}
                    </div>
                )}
            </div>
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedContractor ? "Edit Contractor" : "Add New Contractor"}>
                <ContractorForm contractor={selectedContractor} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
            </Modal>
            
            {importPreview && (
                 <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Contractors Preview">
                    <div className="space-y-4">
                        <p>Found <strong>{importPreview.validRecords.length}</strong> valid records and <strong>{importPreview.errors.length}</strong> errors.</p>
                        {importPreview.errors.length > 0 && ( <div> <h4 className="font-semibold text-red-600">Errors:</h4> <ul className="text-sm text-red-500 list-disc list-inside max-h-40 overflow-y-auto bg-red-50 p-2 rounded"> {importPreview.errors.map(err => <li key={err.row}>Row {err.row}: {err.message}</li>)} </ul> </div> )}
                         <p className="text-sm text-gray-600">Only valid records will be imported. Please review before continuing.</p>
                         <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button onClick={handleConfirmImport} disabled={importPreview.validRecords.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400">Confirm Import</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ContractorsScreen;