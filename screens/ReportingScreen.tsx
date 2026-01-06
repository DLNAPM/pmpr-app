import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Property, Tenant, Payment, RepairStatus, Repair } from '../types';
import Card, { CardContent, CardHeader } from '../components/Card';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PencilSquareIcon, ShieldCheckIcon, CreditCardIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { ReportFilter, EditTarget } from '../App';
import { MONTHS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

// Declare jsPDF globally
declare const jspdf: any;

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
  userId: string; 
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
    const { properties, payments, repairs, addPayment, updatePayment, addRepair } = useAppContext();
    const { isReadOnly, user } = useAuth();
    
    const [filters, setFilters] = useState({ 
        type: 'all', 
        propertyId: 'all', 
        tenantId: 'all', 
        startDate: '', 
        endDate: '', 
        status: (initialFilter?.status || 'all') as 'all' | 'collected' | 'outstanding', 
        repairStatus: (initialFilter?.repairStatus || 'all') as 'all' | 'open' | 'completed',
        reportMonth: new Date().getMonth() + 1,
        reportYear: new Date().getFullYear()
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const tenants = useMemo(() => properties.flatMap(p => p.tenants.map(t => ({...t, propertyName: p.name, propertyId: p.id}))), [properties]);
    
    const reportData = useMemo(() => { 
        const items: ReportItem[] = []; 
        payments.forEach(p => { 
            const property = properties.find(prop => prop.id === p.propertyId); 
            if (!property) return; 
            const tenantName = property.tenants.map(t => t.name).join(', ');
            items.push({ date: new Date(p.year, p.month - 1, 1).toISOString(), propertyName: property.name, tenantName, type: 'Rent', category: 'Rent', billAmount: p.rentBillAmount, paidAmount: p.rentPaidAmount, balance: p.rentBillAmount - p.rentPaidAmount, originalId: p.id, userId: p.userId }); 
            p.utilities.forEach(u => { items.push({ date: new Date(p.year, p.month - 1, 1).toISOString(), propertyName: property.name, tenantName, type: 'Utility', category: u.category, billAmount: u.billAmount, paidAmount: u.paidAmount, balance: u.billAmount - u.paidAmount, originalId: p.id, userId: p.userId }); }); 
        }); 
        repairs.forEach(r => { 
            const property = properties.find(prop => prop.id === r.propertyId); 
            if (!property) return; 
            const tenantName = property.tenants.map(t => t.name).join(', ');
            items.push({ date: r.requestDate, propertyName: property.name, tenantName, type: 'Repair', category: 'Repair', billAmount: r.cost, paidAmount: r.status === RepairStatus.COMPLETE ? r.cost : 0, balance: r.status === RepairStatus.COMPLETE ? 0 : r.cost, repairStatus: r.status, originalId: r.id, userId: r.userId }); 
        }); 

        return items.filter(item => { 
            if (filters.type !== 'all' && item.type !== filters.type) return false; 
            const property = properties.find(p => p.id === filters.propertyId);
            if (filters.propertyId !== 'all' && item.propertyName !== property?.name) return false; 
            if (filters.tenantId !== 'all') {
                const tenant = tenants.find(t => t.id === filters.tenantId);
                if (!tenant || item.propertyName !== tenant.propertyName) return false;
            }
            const itemDate = new Date(item.date); 
            if (filters.startDate && itemDate < new Date(filters.startDate)) return false; 
            if (filters.endDate && itemDate > new Date(filters.endDate)) return false; 
            if (filters.status === 'collected' && item.paidAmount <= 0) return false; 
            if (filters.status === 'outstanding' && item.balance <= 0) return false; 
            if (item.type === 'Repair') { 
                if (filters.repairStatus === 'open' && item.repairStatus === RepairStatus.COMPLETE) return false; 
                if (filters.repairStatus === 'completed' && item.repairStatus !== RepairStatus.COMPLETE) return false; 
            } else if (filters.repairStatus !== 'all') { return false; } 
            return true; 
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
    }, [payments, repairs, properties, tenants, filters]);

    const totals = useMemo(() => reportData.reduce((acc, item) => { acc.billAmount += item.billAmount; acc.paidAmount += item.paidAmount; acc.balance += item.balance; return acc; }, { billAmount: 0, paidAmount: 0, balance: 0 }), [reportData]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { 
        const { name, value } = e.target;
        setFilters(prev => ({...prev, [name]: (name === 'reportMonth' || name === 'reportYear') ? parseInt(value) : value})); 
    };

    const handleExport = () => { 
        const headers = ['Date', 'Property Name', 'Type', 'Category', 'Bill Amount', 'Paid Amount', 'Balance']; 
        const rows = reportData.map(item => [ new Date(item.date).toLocaleDateString(), `"${item.propertyName.replace(/"/g, '""')}"`, item.type, item.category, item.billAmount, item.paidAmount, item.balance ].join(',')); 
        const csvContent = [headers.join(','), ...rows].join('\n'); 
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement('a'); 
        link.setAttribute('href', URL.createObjectURL(blob)); 
        link.setAttribute('download', `pmpr_report_${new Date().toISOString().split('T')[0]}.csv`); 
        document.body.appendChild(link); 
        link.click(); 
        document.body.removeChild(link); 
    };
    
    const handleGenerateRentalStatement = () => {
        if (filters.propertyId === 'all') {
            alert("Please select a specific Property to generate a statement.");
            return;
        }

        const selectedProperty = properties.find(p => p.id === filters.propertyId);
        if (!selectedProperty) return;

        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        const brandBlue = [51, 102, 204];
        const textDark = [50, 50, 50];

        doc.setFontSize(28);
        doc.setTextColor(...brandBlue);
        doc.setFont('helvetica', 'bold');
        doc.text('STATEMENT', 140, 25);

        if (user?.companyLogo) {
            try {
                doc.addImage(user.companyLogo, 'JPEG', 20, 10, 20, 20);
            } catch (e) {
                console.error("Could not add logo to PDF", e);
            }
        }

        doc.setFontSize(14);
        doc.setTextColor(...textDark);
        const headerTextY = user?.companyLogo ? 35 : 25;
        doc.text(user?.companyName || user?.name || '[Company Name]', 20, headerTextY);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const companyLines = (user?.companyAddress || '[Company Address]\n[City, ST ZIP]').split('\n');
        companyLines.forEach((line, i) => {
            doc.text(line, 20, headerTextY + 6 + (i * 5));
        });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', 20, 85);
        doc.setFont('helvetica', 'normal');
        const mainTenant = selectedProperty.tenants[0];
        doc.text(mainTenant?.name || '[Tenant Name]', 35, 85);
        doc.text(selectedProperty.address, 35, 91);

        const currentMonthPayment = payments.find(p => p.propertyId === selectedProperty.id && p.year === filters.reportYear && p.month === filters.reportMonth);
        const tableBody = [];
        if (currentMonthPayment) {
            tableBody.push([`${filters.reportMonth}/01/${filters.reportYear}`, 'INV-RENT', `Rent for ${MONTHS[filters.reportMonth-1]}`, currentMonthPayment.rentBillAmount.toFixed(2)]);
            currentMonthPayment.utilities.forEach(u => {
                if (u.billAmount > 0) tableBody.push([`${filters.reportMonth}/01/${filters.reportYear}`, 'INV-UTIL', u.category, u.billAmount.toFixed(2)]);
            });
            const totalPaid = currentMonthPayment.rentPaidAmount + currentMonthPayment.utilities.reduce((s, u) => s + u.paidAmount, 0);
            if (totalPaid > 0) tableBody.push(['', 'PMT-RCVD', 'Payment Received', `-${totalPaid.toFixed(2)}`]);
        }

        doc.autoTable({
            head: [['DATE', 'REF', 'DESCRIPTION', 'AMOUNT']],
            body: tableBody,
            startY: 110,
            theme: 'striped',
            headStyles: { fillColor: brandBlue }
        });

        doc.save(`Statement_${selectedProperty.name}_${MONTHS[filters.reportMonth-1]}.pdf`);
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
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.trim()); 
        const preview: ImportPreview = { validRecords: [], errors: [] }; 
        for (let i = 1; i < lines.length; i++) { 
            const values = lines[i].split(','); 
            const record = headers.reduce((obj: Record<string, any>, header, index) => { 
                const value = values[index]?.trim()?.replace(/^"|"$/g, ''); 
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

    const handleConfirmImport = () => { 
        if (!importPreview) return; 
        importPreview.validRecords.forEach(record => {
            const property = properties.find(p => p.name === record['Property Name']);
            if (!property) return;
            const date = new Date(record.Date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            if (record.Type === 'Repair') {
                addRepair({
                    propertyId: property.id,
                    description: record.Category,
                    cost: record['Bill Amount'],
                    status: record['Paid Amount'] > 0 ? RepairStatus.COMPLETE : RepairStatus.PENDING_REPAIRMEN,
                    requestDate: date.toISOString()
                });
            } else {
                const existing = payments.find(p => p.propertyId === property.id && p.year === year && p.month === month);
                if (existing) {
                    const updated = { ...existing };
                    if (record.Type === 'Rent') {
                        updated.rentBillAmount = record['Bill Amount'];
                        updated.rentPaidAmount = record['Paid Amount'];
                    } else {
                        const uIdx = updated.utilities.findIndex(u => u.category === record.Category);
                        if (uIdx > -1) {
                            updated.utilities[uIdx].billAmount = record['Bill Amount'];
                            updated.utilities[uIdx].paidAmount = record['Paid Amount'];
                        } else {
                            updated.utilities.push({ category: record.Category, billAmount: record['Bill Amount'], paidAmount: record['Paid Amount'] });
                        }
                    }
                    updatePayment(updated);
                } else {
                    addPayment({
                        propertyId: property.id,
                        year,
                        month,
                        rentBillAmount: record.Type === 'Rent' ? record['Bill Amount'] : 0,
                        rentPaidAmount: record.Type === 'Rent' ? record['Paid Amount'] : 0,
                        utilities: record.Type === 'Utility' ? [{ category: record.Category, billAmount: record['Bill Amount'], paidAmount: record['Paid Amount'] }] : [],
                        paymentDate: record['Paid Amount'] > 0 ? new Date().toISOString() : undefined
                    });
                }
            }
        });
        setIsImportModalOpen(false);
        setImportPreview(null);
        alert('Import completed.');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold">Reporting & Analytics</h2>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setIsReconcileModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors">
                        <ShieldCheckIcon className="w-5 h-5" />
                        Reconcile Data
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                        <ArrowUpTrayIcon className="w-5 h-5" />
                        Import CSV
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden" />
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardContent><p className="text-sm text-gray-500">Total Billed</p><p className="text-2xl font-bold text-slate-800">${totals.billAmount.toFixed(2)}</p></CardContent></Card>
                <Card><CardContent><p className="text-sm text-gray-500">Total Collected</p><p className="text-2xl font-bold text-green-600">${totals.paidAmount.toFixed(2)}</p></CardContent></Card>
                <Card><CardContent><p className="text-sm text-gray-500">Total Outstanding</p><p className="text-2xl font-bold text-red-600">${totals.balance.toFixed(2)}</p></CardContent></Card>
            </div>

            <Card>
                <CardHeader><h3 className="font-semibold">Report Filters</h3></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Type</label>
                            <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full p-2 border rounded">
                                <option value="all">All Types</option>
                                <option value="Rent">Rent</option>
                                <option value="Utility">Utility</option>
                                <option value="Repair">Repair</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Property</label>
                            <select name="propertyId" value={filters.propertyId} onChange={handleFilterChange} className="w-full p-2 border rounded">
                                <option value="all">All Properties</option>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Tenant</label>
                            <select name="tenantId" value={filters.tenantId} onChange={handleFilterChange} className="w-full p-2 border rounded">
                                <option value="all">All Tenants</option>
                                {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.propertyName})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Status</label>
                            <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border rounded">
                                <option value="all">All Statuses</option>
                                <option value="collected">Fully Paid</option>
                                <option value="outstanding">Outstanding</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase">
                                <th className="p-4 border-b">Date</th>
                                <th className="p-4 border-b">Property</th>
                                <th className="p-4 border-b text-right">Bill</th>
                                <th className="p-4 border-b text-right">Paid</th>
                                <th className="p-4 border-b text-right">Balance</th>
                                <th className="p-4 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reportData.map((item, idx) => (
                                <tr key={`${item.originalId}-${idx}`} className="hover:bg-gray-50 transition-colors text-sm">
                                    <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="p-4">{item.propertyName}</td>
                                    <td className="p-4 text-right">${item.billAmount.toFixed(2)}</td>
                                    <td className="p-4 text-right text-green-600">${item.paidAmount.toFixed(2)}</td>
                                    <td className={`p-4 text-right font-bold ${item.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                        ${item.balance.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => onEditItem({ type: item.type === 'Repair' ? 'repair' : 'payment', id: item.originalId })}
                                            className="text-gray-400 hover:text-blue-600 p-1"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {reportData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-gray-500">No records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isImportModalOpen && importPreview && (
                <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import CSV Preview">
                    <div className="space-y-4">
                        <p className="text-sm">Valid: {importPreview.validRecords.length}, Errors: {importPreview.errors.length}</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button onClick={handleConfirmImport} disabled={importPreview.validRecords.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded">Import</button>
                        </div>
                    </div>
                </Modal>
            )}

            {isReconcileModalOpen && (
                <Modal isOpen={isReconcileModalOpen} onClose={() => setIsReconcileModalOpen(false)} title="Reconciliation">
                    <div className="py-4 text-center text-gray-500 italic">No duplicate entries found.</div>
                    <div className="flex justify-end pt-4"><button onClick={() => setIsReconcileModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded">Close</button></div>
                </Modal>
            )}
        </div>
    );
};

export default ReportingScreen;
