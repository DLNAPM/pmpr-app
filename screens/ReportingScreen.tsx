
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
        status: initialFilter?.status || 'all' as 'all' | 'collected' | 'outstanding',
        repairStatus: initialFilter?.repairStatus || 'all' as 'all' | 'open' | 'completed',
    });
    
    useEffect(() => {
        if (initialFilter) {
            setFilters(prev => ({
                ...prev,
                status: initialFilter.status || 'all',
                repairStatus: initialFilter.repairStatus || 'all'
            }));
            onFilterApplied();
        }
    }, [initialFilter, onFilterApplied]);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
    const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
    const [duplicatePayments, setDuplicatePayments] = useState<Payment[][]>([]);
    const [duplicateRepairs, setDuplicateRepairs] = useState<Repair[][]>([]);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const tenants = useMemo(() => properties.flatMap(p => p.tenants), [properties]);
    const reportData = useMemo(() => {
        const items: ReportItem[] = [];
        
        payments.forEach(p => {
            const property = properties.find(prop => prop.id === p.propertyId);
            if (!property) return;
            
            // Rent item
            items.push({
                date: new Date(p.year, p.month - 1, 1).toISOString(),
                propertyName: property.name,
                tenantName: property.tenants[0]?.name,
                type: 'Rent',
                category: 'Rent',
                billAmount: p.rentBillAmount,
                paidAmount: p.rentPaidAmount,
                balance: p.rentBillAmount - p.rentPaidAmount,
                originalId: p.id
            });
            
            // Utility items
            p.utilities.forEach(u => {
                items.push({
                    date: new Date(p.year, p.month - 1, 1).toISOString(),
                    propertyName: property.name,
                    tenantName: property.tenants[0]?.name,
                    type: 'Utility',
                    category: u.category,
                    billAmount: u.billAmount,
                    paidAmount: u.paidAmount,
                    balance: u.billAmount - u.paidAmount,
                    originalId: p.id
                });
            });
        });
        
        repairs.forEach(r => {
            const property = properties.find(prop => prop.id === r.propertyId);
            if (!property) return;

            items.push({
                date: r.requestDate,
                propertyName: property.name,
                tenantName: property.tenants[0]?.name,
                type: 'Repair',
                category: 'Repair',
                billAmount: r.cost,
                paidAmount: r.status === RepairStatus.COMPLETE ? r.cost : 0,
                balance: r.status === RepairStatus.COMPLETE ? 0 : r.cost,
                repairStatus: r.status,
                originalId: r.id
            });
        });
        
        return items.filter(item => {
            if (filters.type !== 'all' && item.type !== filters.type) return false;
            const property = properties.find(p => p.name === item.propertyName);
            if (filters.propertyId !== 'all' && property?.id !== filters.propertyId) return false;
            const tenant = tenants.find(t => t.name === item.tenantName);
            if (filters.tenantId !== 'all' && tenant?.id !== filters.tenantId) return false;
            
            const itemDate = new Date(item.date);
            if (filters.startDate && itemDate < new Date(filters.startDate)) return false;
            if (filters.endDate && itemDate > new Date(filters.endDate)) return false;

            if (filters.status === 'collected' && item.paidAmount <= 0) return false;
            if (filters.status === 'outstanding' && item.balance <= 0) return false;

            if (item.type === 'Repair') {
                if (filters.repairStatus === 'open' && item.repairStatus === RepairStatus.COMPLETE) return false;
                if (filters.repairStatus === 'completed' && item.repairStatus !== RepairStatus.COMPLETE) return false;
            } else if (filters.repairStatus !== 'all') { // Hide non-repair items if filtering by repair status
                return false;
            }
            
            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [payments, repairs, properties, tenants, filters]);
    
    const totals = useMemo(() => {
        return reportData.reduce((acc, item) => {
            acc.billAmount += item.billAmount;
            acc.paidAmount += item.paidAmount;
            acc.balance += item.balance;
            return acc;
        }, { billAmount: 0, paidAmount: 0, balance: 0 });
    }, [reportData]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({...prev, [name]: value}));
    };
    
    const handleExport = () => {
        const headers = ['Date', 'Property Name', 'Type', 'Category', 'Bill Amount', 'Paid Amount', 'Balance'];
        const rows = reportData.map(item => [
            new Date(item.date).toLocaleDateString(),
            `"${item.propertyName.replace(/"/g, '""')}"`,
            item.type,
            item.category,
            item.billAmount,
            item.paidAmount,
            item.balance
        ].join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `pmpr_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => processCsv(e.target?.result as string);
            reader.readAsText(file);
        }
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const processCsv = (csvText: string) => {
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        const preview: ImportPreview = { validRecords: [], errors: [] };

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            // Fix: Correctly type the accumulator and parse numbers to create a valid CsvRow object.
            const record = headers.reduce((obj: any, header, index) => {
                const value = values[index]?.trim();
                if (header === 'Bill Amount' || header === 'Paid Amount') {
                    obj[header] = Number(value) || 0;
                } else {
                    obj[header] = value;
                }
                return obj;
            }, {}) as CsvRow;

            if (!properties.some(p => p.name === record['Property Name'])) {
                preview.errors.push({ row: i + 1, message: `Property "${record['Property Name']}" not found.` });
                continue;
            }
            preview.validRecords.push(record);
        }
        setImportPreview(preview);
        setIsImportModalOpen(true);
    };
    
    const handleConfirmImport = async () => {
        if (!importPreview) return;
        let paymentsAdded = 0;
        let repairsAdded = 0;

        for (const record of importPreview.validRecords) {
            const property = properties.find(p => p.name === record['Property Name']);
            if (!property) continue;
            
            const date = new Date(record.Date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            
            if (record.Type === 'Repair') {
                addRepair({
                    propertyId: property.id,
                    description: record.Category,
                    cost: Number(record['Bill Amount']),
                    status: Number(record['Paid Amount']) > 0 ? RepairStatus.COMPLETE : RepairStatus.PENDING_REPAIRMEN,
                    requestDate: date.toISOString()
                });
                repairsAdded++;
            } else {
                 const existing = payments.find(p => p.propertyId === property.id && p.year === year && p.month === month);
                 if (existing) {
                    const updated = { ...existing };
                    if (record.Type === 'Rent') {
                        updated.rentBillAmount = Number(record['Bill Amount']);
                        updated.rentPaidAmount = Number(record['Paid Amount']);
                    } else {
                        const util = updated.utilities.find(u => u.category === record.Category);
                        if (util) {
                            util.billAmount = Number(record['Bill Amount']);
                            util.paidAmount = Number(record['Paid Amount']);
                        } else {
                            updated.utilities.push({ category: record.Category, billAmount: Number(record['Bill Amount']), paidAmount: Number(record['Paid Amount']) });
                        }
                    }
                    await updatePayment(updated, [], []);
                 } else {
                     await addPayment({
                         propertyId: property.id, year, month,
                         rentBillAmount: record.Type === 'Rent' ? Number(record['Bill Amount']) : 0,
                         rentPaidAmount: record.Type === 'Rent' ? Number(record['Paid Amount']) : 0,
                         utilities: record.Type === 'Utility' ? [{ category: record.Category, billAmount: Number(record['Bill Amount']), paidAmount: Number(record['Paid Amount'])}] : [],
                     }, []);
                 }
                 paymentsAdded++;
            }
        }
        alert(`${paymentsAdded} payment records and ${repairsAdded} repair records imported successfully.`);
        setIsImportModalOpen(false);
        setImportPreview(null);
    };

    const handleReconcile = () => {
        // Fix: Explicitly type the accumulator for `reduce` to ensure `Object.values` returns a strongly typed array.
        const paymentGroups = Object.values(payments.reduce<Record<string, Payment[]>>((acc, p) => {
            const key = `${p.propertyId}-${p.year}-${p.month}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
        }, {})).filter(group => group.length > 1);

        // Fix: Explicitly type the accumulator for `reduce` to ensure `Object.values` returns a strongly typed array.
        const repairGroups = Object.values(repairs.reduce<Record<string, Repair[]>>((acc, r) => {
            const key = `${r.propertyId}-${r.description}-${r.cost}-${new Date(r.requestDate).toLocaleDateString()}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(r);
            return acc;
        }, {})).filter(group => group.length > 1);
        
        setDuplicatePayments(paymentGroups);
        setDuplicateRepairs(repairGroups);

        // Pre-select the one to keep (e.g., the one with the latest payment date or most info)
        const initialSelections: Record<string, string> = {};
        paymentGroups.forEach((group, index) => {
            const best = group.sort((a,b) => (b.paymentDate ? 1: -1) - (a.paymentDate ? 1 : -1) )[0];
            initialSelections[`payment-${index}`] = best.id;
        });
        repairGroups.forEach((group, index) => {
            const best = group.sort((a,b) => (b.completionDate ? 1: -1) - (a.completionDate ? 1 : -1) )[0];
            initialSelections[`repair-${index}`] = best.id;
        });
        setSelections(initialSelections);

        setIsReconcileModalOpen(true);
    };
    
    const handleConfirmReconciliation = () => {
        const recordsToDelete: {type: 'payment' | 'repair', id: string}[] = [];
        
        duplicatePayments.forEach((group, index) => {
            const keepId = selections[`payment-${index}`];
            group.forEach(p => { if (p.id !== keepId) recordsToDelete.push({type: 'payment', id: p.id}) });
        });

        duplicateRepairs.forEach((group, index) => {
            const keepId = selections[`repair-${index}`];
            group.forEach(r => { if (r.id !== keepId) recordsToDelete.push({type: 'repair', id: r.id}) });
        });
        
        if (window.confirm(`Are you sure you want to delete ${recordsToDelete.length} duplicate record(s)? This action cannot be undone.`)) {
            recordsToDelete.forEach(record => {
                if (record.type === 'payment') deletePayment(record.id);
                else deleteRepair(record.id);
            });
            alert(`${recordsToDelete.length} records deleted.`);
            setIsReconcileModalOpen(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Reporting</h2>
                    <div className="flex gap-2">
                        <button onClick={handleReconcile} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                            <ShieldCheckIcon className="w-4 h-4 text-green-600" /> Reconcile
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                            <ArrowUpTrayIcon className="w-4 h-4" /> Import
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden"/>
                        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                            <ArrowDownTrayIcon className="w-4 h-4" /> Export
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Filter Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                    <select name="type" value={filters.type} onChange={handleFilterChange} className="p-2 border rounded">
                        <option value="all">All Types</option>
                        <option value="Rent">Rent</option>
                        <option value="Utility">Utility</option>
                        <option value="Repair">Repair</option>
                    </select>
                    <select name="propertyId" value={filters.propertyId} onChange={handleFilterChange} className="p-2 border rounded">
                        <option value="all">All Properties</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select name="tenantId" value={filters.tenantId} onChange={handleFilterChange} className="p-2 border rounded">
                        <option value="all">All Tenants</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded">
                        <option value="all">All Status</option>
                        <option value="collected">Collected</option>
                        <option value="outstanding">Outstanding</option>
                    </select>
                    {filters.type === 'Repair' && (
                        <select name="repairStatus" value={filters.repairStatus} onChange={handleFilterChange} className="p-2 border rounded">
                            <option value="all">All Repair Status</option>
                            <option value="open">Open</option>
                            <option value="completed">Completed</option>
                        </select>
                    )}
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded"/>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded"/>
                </div>

                {/* Report Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Category</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bill</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.propertyName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`font-semibold ${item.type === 'Repair' ? 'text-yellow-700' : 'text-blue-700'}`}>{item.type}</span>
                                        {item.type !== item.category && <span className="text-gray-500"> / {item.category}</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">${item.billAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">${item.paidAmount.toFixed(2)}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${item.balance > 0 ? 'text-red-600' : ''}`}>${item.balance.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                        <button 
                                            onClick={() => onEditItem({ type: item.type === 'Repair' ? 'repair' : 'payment', id: item.originalId })}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            <PencilSquareIcon className="w-5 h-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                            <tr>
                                <td colSpan={3} className="px-6 py-3 text-right font-bold">Totals:</td>
                                <td className="px-6 py-3 text-right font-bold text-sm">${totals.billAmount.toFixed(2)}</td>
                                <td className="px-6 py-3 text-right font-bold text-sm text-green-700">${totals.paidAmount.toFixed(2)}</td>
                                <td className={`px-6 py-3 text-right font-bold text-sm ${totals.balance > 0 ? 'text-red-700' : ''}`}>${totals.balance.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </CardContent>

             {importPreview && (
                <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Preview">
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

            {isReconcileModalOpen && (
                 <Modal isOpen={isReconcileModalOpen} onClose={() => setIsReconcileModalOpen(false)} title="Reconcile Duplicate Records">
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1">
                        {(duplicatePayments.length + duplicateRepairs.length) === 0 ? (
                            <p>No duplicate records found.</p>
                        ) : (
                            <>
                            {duplicatePayments.map((group, index) => (
                                <Card key={`payment-group-${index}`}>
                                    <CardHeader><p className="font-semibold">Duplicate Payments: {properties.find(p => p.id === group[0].propertyId)?.name} - {MONTHS[group[0].month - 1]} {group[0].year}</p></CardHeader>
                                    <CardContent className="space-y-2">
                                        {group.map(p => (
                                            <label key={p.id} className="block p-2 border rounded has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                                                <input type="radio" name={`payment-group-${index}`} value={p.id} checked={selections[`payment-group-${index}`] === p.id} onChange={(e) => setSelections(s => ({...s, [`payment-group-${index}`]: e.target.value}))}/>
                                                <span className="ml-2">Rent: ${p.rentPaidAmount}/${p.rentBillAmount} | Utilities: ${p.utilities.reduce((sum, u) => sum + u.paidAmount, 0)}/${p.utilities.reduce((sum, u) => sum + u.billAmount, 0)}</span>
                                                <p className="text-xs text-gray-500 ml-5">Last Updated: {p.paymentDate ? new Date(p.paymentDate).toLocaleString() : 'N/A'}</p>
                                            </label>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                             {duplicateRepairs.map((group, index) => (
                                <Card key={`repair-group-${index}`}>
                                    <CardHeader><p className="font-semibold">Duplicate Repairs: {properties.find(p => p.id === group[0].propertyId)?.name}</p></CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-sm italic">{group[0].description}</p>
                                        {group.map(r => (
                                            <label key={r.id} className="block p-2 border rounded has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                                                <input type="radio" name={`repair-group-${index}`} value={r.id} checked={selections[`repair-group-${index}`] === r.id} onChange={(e) => setSelections(s => ({...s, [`repair-group-${index}`]: e.target.value}))}/>
                                                <span className="ml-2">Cost: ${r.cost} | Status: {r.status}</span>
                                                <p className="text-xs text-gray-500 ml-5">Completed: {r.completionDate ? new Date(r.completionDate).toLocaleDateString() : 'N/A'}</p>
                                            </label>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                            </>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setIsReconcileModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button onClick={handleConfirmReconciliation} disabled={(duplicatePayments.length + duplicateRepairs.length) === 0} className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-gray-400">
                                Confirm & Delete
                            </button>
                        </div>
                    </div>
                 </Modal>
            )}

        </Card>
    );
};

export default ReportingScreen;