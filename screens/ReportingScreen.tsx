import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Property, Tenant, Payment, RepairStatus, Repair } from '../types';
import Card, { CardContent, CardHeader } from '../components/Card';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PencilSquareIcon, ShieldCheckIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { ReportFilter, EditTarget } from '../App';
import { MONTHS } from '../constants';

interface ReportItem {
    date: string;
    propertyName: string;
    tenantName?: string;
    type: 'Rent' | 'Utility' | 'Repair';
    category: string;
    billAmount: number;
    paidAmount: number;
    balance: number;
    repairStatus?: RepairStatus;
    originalId: string;
}

interface CsvRow {
    Date: string;
    'Property Name': string;
    Type: 'Rent' | 'Utility' | 'Repair';
    Category: string;
    'Bill Amount': number;
    'Paid Amount': number;
}

interface ImportPreview {
    validRecords: CsvRow[];
    errors: { row: number; message: string }[];
}

interface ReportingScreenProps {
    initialFilter: ReportFilter | null;
    onFilterApplied: () => void;
    onEditItem: (target: EditTarget) => void;
}


const ReportingScreen: React.FC<ReportingScreenProps> = ({ initialFilter, onFilterApplied, onEditItem }) => {
    const { properties, payments, repairs, addPayment, updatePayment, addRepair, deletePayment, deleteRepair } = useAppContext();
    
    const [filters, setFilters] = useState({
        type: 'all',
        propertyId: 'all',
        tenantId: 'all',
        startDate: '',
        endDate: '',
        status: 'all' as 'all' | 'collected' | 'outstanding',
        repairStatus: 'all' as 'all' | 'open' | 'completed',
    });
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
    const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
    const [duplicatePayments, setDuplicatePayments] = useState<Payment[][]>([]);
    const [duplicateRepairs, setDuplicateRepairs] = useState<Repair[][]>([]);
    const [selections, setSelections] = useState<{ [key: string]: string }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialFilter) {
            setFilters(prev => ({ 
                ...prev, 
                status: initialFilter.status || 'all',
                repairStatus: initialFilter.repairStatus || 'all',
                type: initialFilter.repairStatus ? 'repair' : prev.type,
            }));
            onFilterApplied();
        }
    }, [initialFilter, onFilterApplied]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({...prev, [name]: value}));
        if (name === 'propertyId') {
            setFilters(prev => ({...prev, tenantId: 'all' }));
        }
    };
    
    const tenantsForSelectedProperty = useMemo((): Tenant[] => {
        if (filters.propertyId === 'all') return [];
        const prop = properties.find(p => p.id === filters.propertyId);
        return prop ? prop.tenants : [];
    }, [filters.propertyId, properties]);

    const filteredData = useMemo((): ReportItem[] => {
        const allItems: ReportItem[] = [];
        payments.forEach(p => {
            const property = properties.find(prop => prop.id === p.propertyId);
            if (!property) return;
            allItems.push({ date: new Date(p.year, p.month - 1, 1).toISOString(), propertyName: property.name, tenantName: property.tenants[0]?.name, type: 'Rent', category: 'Monthly Rent', billAmount: p.rentBillAmount, paidAmount: p.rentPaidAmount, balance: p.rentBillAmount - p.rentPaidAmount, originalId: p.id });
            p.utilities.forEach(u => allItems.push({ date: new Date(p.year, p.month - 1, 1).toISOString(), propertyName: property.name, tenantName: property.tenants[0]?.name, type: 'Utility', category: u.category, billAmount: u.billAmount, paidAmount: u.paidAmount, balance: u.billAmount - u.paidAmount, originalId: p.id }));
        });
        repairs.forEach(r => {
            const property = properties.find(prop => prop.id === r.propertyId);
            if (!property) return;
            allItems.push({ date: r.repairDate || r.requestDate, propertyName: property.name, tenantName: property.tenants[0]?.name, type: 'Repair', category: r.description.substring(0, 30), billAmount: r.cost, paidAmount: r.status === 'Complete' ? r.cost : 0, balance: r.status === 'Complete' ? 0 : r.cost, repairStatus: r.status, originalId: r.id });
        });
        const startDate = filters.startDate ? new Date(filters.startDate) : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;
        return allItems.filter(item => {
            if (filters.type !== 'all' && item.type.toLowerCase() !== filters.type) return false;
            const property = properties.find(p => p.name === item.propertyName);
            if(filters.propertyId !== 'all' && property?.id !== filters.propertyId) return false;
            if(filters.tenantId !== 'all' && property?.tenants.find(t=>t.id === filters.tenantId)?.name !== item.tenantName) return false;
            const itemDate = new Date(item.date);
            if (startDate && itemDate < startDate) return false;
            if (endDate) { const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999); if (itemDate > endOfDay) return false; }
            if (filters.status === 'outstanding' && item.balance <= 0) return false;
            if (filters.status === 'collected' && item.paidAmount <= 0) return false;
            if (item.type === 'Repair') {
                if (filters.repairStatus === 'open' && item.repairStatus === RepairStatus.COMPLETE) return false;
                if (filters.repairStatus === 'completed' && item.repairStatus !== RepairStatus.COMPLETE) return false;
            } else if (filters.repairStatus !== 'all') { return false; }
            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filters, payments, repairs, properties]);

    const totals = useMemo(() => filteredData.reduce((acc, item) => { acc.billAmount += item.billAmount; acc.paidAmount += item.paidAmount; acc.balance += item.balance; return acc; }, { billAmount: 0, paidAmount: 0, balance: 0 }), [filteredData]);
    
    const handleExport = () => {
        const headers = ['Date', 'Property Name', 'Tenant Name', 'Type', 'Category', 'Bill Amount', 'Paid Amount', 'Balance'];
        const rows = filteredData.map(item => [ new Date(item.date).toLocaleDateString(), item.propertyName, item.tenantName || 'N/A', item.type, item.category, item.billAmount, item.paidAmount, item.balance ].join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `pmpr_report_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => processCsv(e.target?.result as string);
        reader.readAsText(file);
    };

    const processCsv = (csvText: string) => {
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim());
        if (lines.length < 2) { alert('CSV file must have a header row and at least one data row.'); return; }
        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['Date', 'Property Name', 'Type', 'Category', 'Bill Amount', 'Paid Amount'];
        if (!requiredHeaders.every(h => headers.includes(h))) { alert(`CSV is missing required headers. Must include: ${requiredHeaders.join(', ')}`); return; }
        const preview: ImportPreview = { validRecords: [], errors: [] };
        const propertyMap = new Map(properties.map(p => [p.name.toLowerCase(), p]));
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(','); const rowData: any = {};
            headers.forEach((header, index) => { rowData[header] = values[index]?.trim(); });
            const property = propertyMap.get(rowData['Property Name']?.toLowerCase());
            if (!property) { preview.errors.push({ row: i + 1, message: `Property '${rowData['Property Name']}' not found.` }); continue; }
            if (!['Rent', 'Utility', 'Repair'].includes(rowData.Type)) { preview.errors.push({ row: i + 1, message: `Invalid Type '${rowData.Type}'. Must be Rent, Utility, or Repair.` }); continue; }
            if (isNaN(parseFloat(rowData['Bill Amount'])) || isNaN(parseFloat(rowData['Paid Amount']))) { preview.errors.push({ row: i + 1, message: `Bill Amount or Paid Amount is not a valid number.` }); continue; }
            preview.validRecords.push({ ...rowData, 'Bill Amount': parseFloat(rowData['Bill Amount']), 'Paid Amount': parseFloat(rowData['Paid Amount']) });
        }
        setImportPreview(preview); setIsImportModalOpen(true);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleConfirmImport = () => {
        if (!importPreview?.validRecords) return;
        const paymentsToUpdate = new Map<string, Payment>();
        importPreview.validRecords.forEach(record => {
            const property = properties.find(p => p.name === record['Property Name']); if (!property) return;
            if (record.Type === 'Repair') {
                addRepair({ propertyId: property.id, description: record.Category, status: record['Paid Amount'] >= record['Bill Amount'] ? RepairStatus.COMPLETE : RepairStatus.PENDING_REPAIRMEN, cost: record['Bill Amount'], requestDate: new Date(record.Date).toISOString(), completionDate: record['Paid Amount'] >= record['Bill Amount'] ? new Date(record.Date).toISOString() : undefined });
            } else {
                const date = new Date(record.Date); const year = date.getFullYear(); const month = date.getMonth() + 1; const paymentKey = `${property.id}-${year}-${month}`;
                let payment = paymentsToUpdate.get(paymentKey) || payments.find(p => p.propertyId === property.id && p.year === year && p.month === month);
                if (!payment) { payment = { id: '', propertyId: property.id, year, month, rentBillAmount: 0, rentPaidAmount: 0, utilities: [] }; }
                if (record.Type === 'Rent') { payment.rentBillAmount = record['Bill Amount']; payment.rentPaidAmount = record['Paid Amount']; }
                else if (record.Type === 'Utility') {
                    const utilityIndex = payment.utilities.findIndex(u => u.category === record.Category);
                    if (utilityIndex > -1) { payment.utilities[utilityIndex] = { category: record.Category, billAmount: record['Bill Amount'], paidAmount: record['Paid Amount'] }; }
                    else { payment.utilities.push({ category: record.Category, billAmount: record['Bill Amount'], paidAmount: record['Paid Amount'] }); }
                }
                paymentsToUpdate.set(paymentKey, { ...payment });
            }
        });
        paymentsToUpdate.forEach(payment => {
            const existingPayment = payments.find(p => p.propertyId === payment.propertyId && p.year === payment.year && p.month === payment.month);
            if (existingPayment) { updatePayment({ ...existingPayment, ...payment }); }
            else { addPayment(payment); }
        });
        alert(`${importPreview.validRecords.length} records imported successfully.`);
        setIsImportModalOpen(false); setImportPreview(null);
    };

    const handleReconcile = () => {
        const paymentGroups = payments.reduce((acc, p) => {
            const key = `${p.propertyId}-${p.year}-${p.month}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
        }, {} as { [key: string]: Payment[] });

        const repairGroups = repairs.reduce((acc, r) => {
            const key = `${r.propertyId}-${r.description}-${r.cost}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(r);
            return acc;
        }, {} as { [key: string]: Repair[] });

        const dupPayments = Object.values(paymentGroups).filter(g => g.length > 1);
        const dupRepairs = Object.values(repairGroups).filter(g => g.length > 1);

        if (dupPayments.length === 0 && dupRepairs.length === 0) {
            alert("No potential duplicate records found.");
            return;
        }

        setDuplicatePayments(dupPayments);
        setDuplicateRepairs(dupRepairs);

        const initialSelections: { [key: string]: string } = {};
        dupPayments.forEach((group, index) => {
            const sorted = [...group].sort((a, b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
            initialSelections[`payment-${index}`] = sorted[0].id;
        });
        dupRepairs.forEach((group, index) => {
            const sorted = [...group].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
            initialSelections[`repair-${index}`] = sorted[0].id;
        });
        setSelections(initialSelections);
        setIsReconcileModalOpen(true);
    };

    const handleConfirmReconciliation = () => {
        let deletedCount = 0;
        duplicatePayments.forEach((group, index) => {
            const keepId = selections[`payment-${index}`];
            group.forEach(p => { if (p.id !== keepId) { deletePayment(p.id); deletedCount++; } });
        });
        duplicateRepairs.forEach((group, index) => {
            const keepId = selections[`repair-${index}`];
            group.forEach(r => { if (r.id !== keepId) { deleteRepair(r.id); deletedCount++; } });
        });
        alert(`${deletedCount} duplicate records have been deleted.`);
        setIsReconcileModalOpen(false);
        setDuplicatePayments([]);
        setDuplicateRepairs([]);
    };
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Reporting</h2>
                <div className="flex gap-2">
                     <button onClick={handleReconcile} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                        <ShieldCheckIcon className="w-4 h-4" />
                        Reconcile
                    </button>
                     <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        Import
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden"/>
                    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>
            <Card>
                <CardHeader><h3 className="font-semibold">Filters</h3></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                     <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border rounded"> <option value="all">All Statuses</option> <option value="collected">Collected</option> <option value="outstanding">Outstanding</option> </select>
                     <select name="repairStatus" value={filters.repairStatus} onChange={handleFilterChange} className="w-full p-2 border rounded"> <option value="all">All Repair Statuses</option> <option value="open">Open</option> <option value="completed">Completed</option> </select>
                    <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full p-2 border rounded"> <option value="all">All Types</option> <option value="rent">Rent</option> <option value="utility">Utilities</option> <option value="repair">Repairs</option> </select>
                    <select name="propertyId" value={filters.propertyId} onChange={handleFilterChange} className="w-full p-2 border rounded"> <option value="all">All Properties</option> {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select>
                    <select name="tenantId" value={filters.tenantId} onChange={handleFilterChange} disabled={filters.propertyId === 'all'} className="w-full p-2 border rounded disabled:bg-gray-100"> <option value="all">All Tenants</option> {tenantsForSelectedProperty.map(t => <option key={t.id} value={t.id}>{t.name}</option>)} </select>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded" />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded" />
                </CardContent>
            </Card>
            
            <Card>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50"> <tr> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Category</th> <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Billed</th> <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th> <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th> <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th> </tr> </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredData.map((item, index) => (
                                    <tr key={`${item.originalId}-${item.category}-${index}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.propertyName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"> <span className="font-semibold">{item.type}</span> <br/> <span className="text-xs text-gray-500">{item.category}</span> </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.billAmount)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(item.paidAmount)}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${item.balance > 0 ? 'text-red-600' : ''}`}>{formatCurrency(item.balance)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"> <button onClick={() => onEditItem({ type: item.type === 'Repair' ? 'repair' : 'payment', id: item.originalId })} className="text-blue-600 hover:text-blue-900 p-1" aria-label="Edit Item"> <PencilSquareIcon className="w-5 h-5"/> </button> </td>
                                    </tr>
                                ))}
                                {filteredData.length === 0 && ( <tr> <td colSpan={7} className="text-center py-10 text-gray-500">No data matches your filters.</td> </tr> )}
                            </tbody>
                            <tfoot className="bg-gray-100"> <tr> <td colSpan={3} className="px-6 py-3 text-right text-sm font-bold uppercase">Totals:</td> <td className="px-6 py-3 text-right text-sm font-bold">{formatCurrency(totals.billAmount)}</td> <td className="px-6 py-3 text-right text-sm font-bold text-green-700">{formatCurrency(totals.paidAmount)}</td> <td className={`px-6 py-3 text-right text-sm font-bold ${totals.balance > 0 ? 'text-red-700' : ''}`}>{formatCurrency(totals.balance)}</td> <td></td> </tr> </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>
            
            {importPreview && ( <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Preview"> <div className="space-y-4"> <p>Found <strong>{importPreview.validRecords.length}</strong> valid records and <strong>{importPreview.errors.length}</strong> errors.</p> {importPreview.errors.length > 0 && ( <div> <h4 className="font-semibold text-red-600">Errors:</h4> <ul className="text-sm text-red-500 list-disc list-inside max-h-40 overflow-y-auto bg-red-50 p-2 rounded"> {importPreview.errors.map(err => <li key={err.row}>Row {err.row}: {err.message}</li>)} </ul> </div> )} <p className="text-sm text-gray-600">Only valid records will be imported. Please review before continuing.</p> <div className="flex justify-end gap-2 pt-4"> <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button> <button onClick={handleConfirmImport} disabled={importPreview.validRecords.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"> Confirm Import </button> </div> </div> </Modal> )}
            
            <Modal isOpen={isReconcileModalOpen} onClose={() => setIsReconcileModalOpen(false)} title="Reconcile Duplicate Records">
                <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1">
                    {duplicatePayments.length === 0 && duplicateRepairs.length === 0 ? (
                        <p>No potential duplicates found.</p>
                    ) : (
                        <>
                            {duplicatePayments.map((group, groupIndex) => (
                                <Card key={`payment-group-${groupIndex}`}>
                                    <CardHeader><h4 className="font-semibold">Duplicate Payment: {properties.find(p => p.id === group[0].propertyId)?.name} - {MONTHS[group[0].month - 1]} {group[0].year}</h4></CardHeader>
                                    <CardContent className="space-y-2">
                                        {group.map(p => (
                                            <label key={p.id} className="flex items-start p-2 border rounded-md cursor-pointer hover:bg-slate-50">
                                                <input type="radio" name={`payment-group-${groupIndex}`} value={p.id} checked={selections[`payment-${groupIndex}`] === p.id} onChange={(e) => setSelections(s => ({ ...s, [`payment-${groupIndex}`]: e.target.value }))} className="mt-1" />
                                                <div className="ml-3 text-sm">
                                                    <p><strong>Rent:</strong> {formatCurrency(p.rentPaidAmount)} / {formatCurrency(p.rentBillAmount)}</p>
                                                    <p><strong>Utilities:</strong> {p.utilities.reduce((sum, u) => sum + u.paidAmount, 0)} / {p.utilities.reduce((sum, u) => sum + u.billAmount, 0)}</p>
                                                    <p className="text-xs text-gray-500">Last Payment: {p.paymentDate ? new Date(p.paymentDate).toLocaleString() : 'N/A'} (ID: ...{p.id.slice(-4)})</p>
                                                </div>
                                            </label>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                            {duplicateRepairs.map((group, groupIndex) => (
                                <Card key={`repair-group-${groupIndex}`}>
                                    <CardHeader><h4 className="font-semibold">Duplicate Repair: {properties.find(p => p.id === group[0].propertyId)?.name} - {group[0].description}</h4></CardHeader>
                                    <CardContent className="space-y-2">
                                        {group.map(r => (
                                            <label key={r.id} className="flex items-start p-2 border rounded-md cursor-pointer hover:bg-slate-50">
                                                <input type="radio" name={`repair-group-${groupIndex}`} value={r.id} checked={selections[`repair-${groupIndex}`] === r.id} onChange={(e) => setSelections(s => ({ ...s, [`repair-${groupIndex}`]: e.target.value }))} className="mt-1" />
                                                <div className="ml-3 text-sm">
                                                    <p><strong>Cost:</strong> {formatCurrency(r.cost)}</p>
                                                    <p><strong>Status:</strong> {r.status}</p>
                                                    <p className="text-xs text-gray-500">Requested: {new Date(r.requestDate).toLocaleString()} (ID: ...{r.id.slice(-4)})</p>
                                                </div>
                                            </label>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsReconcileModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                        <button onClick={handleConfirmReconciliation} disabled={duplicatePayments.length === 0 && duplicateRepairs.length === 0} className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-gray-400">
                            Confirm & Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ReportingScreen;