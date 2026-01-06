
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

interface ReportItem { date: string; propertyName: string; tenantName?: string; type: 'Rent' | 'Utility' | 'Repair'; category: string; billAmount: number; paidAmount: number; balance: number; repairStatus?: RepairStatus; originalId: string; userId: string; }
interface CsvRow { Date: string; 'Property Name': string; Type: 'Rent' | 'Utility' | 'Repair'; Category: string; 'Bill Amount': number; 'Paid Amount': number; }
interface ImportPreview { validRecords: CsvRow[]; errors: { row: number; message: string }[]; }
interface ReportingScreenProps { initialFilter: ReportFilter | null; onFilterApplied: () => void; onEditItem: (target: EditTarget) => void; }

const ReportingScreen: React.FC<ReportingScreenProps> = ({ initialFilter, onFilterApplied, onEditItem }) => {
    const { properties, payments, repairs, addPayment, updatePayment, addRepair, deletePayment, deleteRepair } = useAppContext();
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

    useEffect(() => { if (initialFilter) { setFilters(prev => ({ ...prev, status: initialFilter.status || 'all', repairStatus: initialFilter.repairStatus || 'all' })); onFilterApplied(); } }, [initialFilter, onFilterApplied]);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
    const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
    const [duplicatePayments, setDuplicatePayments] = useState<Payment[][]>([]);
    const [duplicateRepairs, setDuplicateRepairs] = useState<Repair[][]>([]);
    const [selections, setSelections] = useState<Record<string, string>>({});
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

    const handleExport = () => { const headers = ['Date', 'Property Name', 'Type', 'Category', 'Bill Amount', 'Paid Amount', 'Balance']; const rows = reportData.map(item => [ new Date(item.date).toLocaleDateString(), `"${item.propertyName.replace(/"/g, '""')}"`, item.type, item.category, item.billAmount, item.paidAmount, item.balance ].join(',')); const csvContent = [headers.join(','), ...rows].join('\n'); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.setAttribute('href', URL.createObjectURL(blob)); link.setAttribute('download', `pmpr_report_${new Date().toISOString().split('T')[0]}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    
    const handleGenerateRentalStatement = () => {
        if (filters.propertyId === 'all') {
            alert("Please select a specific Property to generate a statement.");
            return;
        }

        const selectedProperty = properties.find(p => p.id === filters.propertyId);
        if (!selectedProperty) return;

        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        // BRANDING COLORS
        const brandBlue = [51, 102, 204];
        const textDark = [50, 50, 50];

        // 1. HEADER SECTION (Logo & Title)
        doc.setFontSize(28);
        doc.setTextColor(...brandBlue);
        doc.setFont('helvetica', 'bold');
        doc.text('STATEMENT', 140, 25);

        // Company Branding from Profile
        doc.setFontSize(14);
        doc.setTextColor(...textDark);
        doc.text(user?.companyName || '[Company Name]', 20, 25);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const companyLines = (user?.companyAddress || '[Company Address]\n[City, ST ZIP]').split('\n');
        companyLines.forEach((line, i) => {
            doc.text(line, 20, 31 + (i * 5));
        });
        doc.text(`Phone: ${user?.companyPhone || '[Company Phone]'}`, 20, 31 + (companyLines.length * 5));

        // Statement Info Box
        doc.rect(140, 38, 55, 14); // Box
        doc.line(140, 45, 195, 45); // Middle horizontal
        doc.line(168, 38, 168, 52); // Center vertical
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Statement Date', 142, 43);
        doc.text('Customer ID', 142, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString(), 170, 43);
        doc.text(selectedProperty.id.substring(0, 6).toUpperCase(), 170, 50);

        // 2. BILL TO & PROPERTY INFO
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', 20, 70);
        doc.setFont('helvetica', 'normal');
        const mainTenant = selectedProperty.tenants[0];
        doc.text(mainTenant?.name || '[Tenant Name]', 35, 70);
        doc.text(selectedProperty.address, 35, 76);
        doc.text(mainTenant?.phone || '[Phone]', 35, 82);

        doc.setFont('helvetica', 'bold');
        doc.text('Property:', 110, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(selectedProperty.name, 130, 70);
        doc.text(selectedProperty.address, 130, 76);
        doc.setFont('helvetica', 'bold');
        doc.text('Contract From:', 110, 88);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(selectedProperty.leaseStart).toLocaleDateString(), 140, 88);
        doc.setFont('helvetica', 'bold');
        doc.text('To:', 165, 88);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(selectedProperty.leaseEnd).toLocaleDateString(), 175, 88);

        // 3. ACCOUNT ACTIVITY (The Table)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Account Activity', 20, 105);

        // Calculation: Balance Forward
        const prevPayments = payments.filter(p => 
            p.propertyId === selectedProperty.id && 
            (p.year < filters.reportYear || (p.year === filters.reportYear && p.month < filters.reportMonth))
        );
        const prevBilled = prevPayments.reduce((sum, p) => sum + p.rentBillAmount + p.utilities.reduce((s, u) => s + u.billAmount, 0), 0);
        const prevPaid = prevPayments.reduce((sum, p) => sum + p.rentPaidAmount + p.utilities.reduce((s, u) => s + u.paidAmount, 0), 0);
        const balanceForward = prevBilled - prevPaid;

        // Current Month Data
        const currentMonthTransactions: any[] = [];
        const currentMonthPayment = payments.find(p => p.propertyId === selectedProperty.id && p.year === filters.reportYear && p.month === filters.reportMonth);
        
        if (currentMonthPayment) {
            // Invoice items
            currentMonthTransactions.push([
                `${filters.reportMonth}/01/${filters.reportYear.toString().slice(-2)}`,
                'INV-RENT',
                `Rent for ${MONTHS[filters.reportMonth-1]} '${filters.reportYear.toString().slice(-2)}`,
                currentMonthPayment.rentBillAmount.toFixed(2)
            ]);
            
            currentMonthPayment.utilities.forEach(u => {
                if (u.billAmount > 0) {
                    currentMonthTransactions.push([
                        `${filters.reportMonth}/01/${filters.reportYear.toString().slice(-2)}`,
                        'INV-UTIL',
                        u.category,
                        u.billAmount.toFixed(2)
                    ]);
                }
            });

            // Payment items
            if (currentMonthPayment.rentPaidAmount > 0 || currentMonthPayment.utilities.some(u => u.paidAmount > 0)) {
                const totalPaid = currentMonthPayment.rentPaidAmount + currentMonthPayment.utilities.reduce((s, u) => s + u.paidAmount, 0);
                currentMonthTransactions.push([
                    currentMonthPayment.paymentDate ? new Date(currentMonthPayment.paymentDate).toLocaleDateString() : '',
                    'PMT-RCVD',
                    'Payment Received - Thank you',
                    `-${totalPaid.toFixed(2)}`
                ]);
            }
        }

        const tableBody = [
            ['', '', 'Balance Forward', balanceForward.toFixed(2)],
            ...currentMonthTransactions
        ];

        doc.autoTable({
            head: [['DATE', 'REF', 'DESCRIPTION', 'AMOUNT']],
            body: tableBody,
            startY: 110,
            theme: 'striped',
            headStyles: { fillColor: brandBlue, textColor: [255, 255, 255] },
            columnStyles: { 3: { halign: 'right' } },
            margin: { left: 20, right: 20 }
        });

        // 4. SUMMARY & TOTALS
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const currentBilled = (currentMonthPayment?.rentBillAmount || 0) + (currentMonthPayment?.utilities.reduce((s, u) => s + u.billAmount, 0) || 0);
        const currentPaid = (currentMonthPayment?.rentPaidAmount || 0) + (currentMonthPayment?.utilities.reduce((s, u) => s + u.paidAmount, 0) || 0);
        const totalDue = balanceForward + currentBilled - currentPaid;

        doc.setFont('helvetica', 'bold');
        doc.text('BALANCE', 135, finalY);
        doc.rect(158, finalY - 6, 37, 9, 'F', [235, 240, 250]);
        doc.setTextColor(0, 0, 0);
        doc.text('$', 160, finalY);
        doc.text(totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 }), 193, finalY, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('Please pay this remaining balance. Thank you.', 135, finalY + 8);

        // 5. REMITTANCE SLIP (Bottom Part)
        const slipY = 240;
        doc.setLineDash([2, 2]);
        doc.line(20, slipY - 10, 190, slipY - 10);
        doc.setLineDash([]);
        doc.setFontSize(8);
        doc.text('Please detach the remittance slip below and return it with your payment.', 20, slipY - 5);

        doc.setFontSize(11);
        doc.setTextColor(...brandBlue);
        doc.setFont('helvetica', 'bold');
        doc.text('REMITTANCE', 95, slipY + 5);

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text('Please make checks payable to:', 20, slipY + 15);
        doc.setFont('helvetica', 'bold');
        doc.text(user?.companyName || user?.name || '[Payee Name]', 20, slipY + 21);
        doc.setFont('helvetica', 'normal');
        companyLines.forEach((line, i) => {
            doc.text(line, 20, slipY + 27 + (i * 5));
        });

        doc.text('STATEMENT DATE', 120, slipY + 15);
        doc.text(new Date().toLocaleDateString(), 170, slipY + 15);
        doc.text('CUSTOMER ID', 120, slipY + 21);
        doc.text(selectedProperty.id.substring(0, 6).toUpperCase(), 170, slipY + 21);

        doc.text('DUE DATE', 130, slipY + 36);
        doc.rect(155, slipY + 31, 40, 8);
        doc.text('UPON RECEIPT', 157, slipY + 36.5);

        doc.setFont('helvetica', 'bold');
        doc.text('BALANCE DUE', 123, slipY + 46);
        doc.rect(155, slipY + 41, 40, 8);
        doc.text('$', 157, slipY + 46.5);
        doc.text(totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 }), 193, slipY + 46.5, { align: 'right' });

        doc.save(`RentalStatement_${selectedProperty.name.replace(/\s/g, '_')}_${MONTHS[filters.reportMonth-1]}.pdf`);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = e => processCsv(e.target?.result as string); reader.readAsText(file); } if(fileInputRef.current) fileInputRef.current.value = ""; };
    const processCsv = (csvText: string) => { const lines = csvText.split(/\r\n|\n/).filter(line => line.trim()); const headers = lines[0].split(',').map(h => h.trim()); const preview: ImportPreview = { validRecords: [], errors: [] }; for (let i = 1; i < lines.length; i++) { const values = lines[i].split(','); const record = headers.reduce((obj: Record<string, any>, header, index) => { const value = values[index]?.trim(); if (header === 'Bill Amount' || header === 'Paid Amount') { obj[header] = Number(value) || 0; } else { obj[header] = value; } return obj; }, {}) as CsvRow; if (!properties.some(p => p.name === record['Property Name'])) { preview.errors.push({ row: i + 1, message: `Property "${record['Property Name']}" not found.` }); continue; } preview.validRecords.push(record); } setImportPreview(preview); setIsImportModalOpen(true); };
    const handleConfirmImport = () => { if (!importPreview) return; for (const record of importPreview.validRecords) { const property = properties.find(p => p.name === record['Property Name']); if (!property) continue; const date = new Date(record.Date); const year = date.getFullYear(); const month = date.getMonth() + 1; if (record.Type === 'Repair') { addRepair({ propertyId: property.id, description: record.Category, cost: Number(record['Bill Amount']), status: Number(record['Paid Amount']) > 0 ? RepairStatus.COMPLETE : RepairStatus.PENDING_REPAIRMEN, requestDate: date.toISOString() }); } else { const existing = payments.find(p => p.propertyId === property.id && p.year === year && p.month === month); if (existing) { const updated = { ...existing }; if (record.Type === 'Rent') { updated.rentBillAmount = Number(record['Bill Amount']); updated.rentPaidAmount = Number(record['Paid Amount']); } else { const util = updated.utilities.find(u => u.category === record.Category); if (util) { util.billAmount = Number(record['Bill Amount']); util.paidAmount = Number(record['Paid Amount']); } else { updated.utilities.push({ category: record.Category, billAmount: Number(record['Bill Amount']), paidAmount: Number(record['Paid Amount']) }); } } updatePayment(updated); } else { addPayment({ propertyId: property.id, year, month, rentBillAmount: record.Type === 'Rent' ? Number(record['Bill Amount']) : 0, rentPaidAmount: record.Type === 'Rent' ? Number(record['Paid Amount']) : 0, utilities: record.Type === 'Utility' ? [{ category: record.Category, billAmount: Number(record['Bill Amount']), paidAmount: Number(record['Paid Amount'])}] : [], }); } } } alert(`${importPreview.validRecords.length} records imported successfully.`); setIsImportModalOpen(false); setImportPreview(null); };
    
    const handleReconcile = () => {
        const paymentGroups = (Object.values(
            payments.reduce((acc: Record<string, Payment[]>, p) => {
                const key = `${p.propertyId}-${p.year}-${p.month}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(p);
                return acc;
            }, {})
        ) as Payment[][]).filter(group => group.length > 1);

        const repairGroups = (Object.values(
            repairs.reduce((acc: Record<string, Repair[]>, r) => {
                const key = `${r.propertyId}-${r.description}-${r.cost}-${new Date(
                    r.requestDate
                ).toLocaleDateString()}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(r);
                return acc;
            }, {})
        ) as Repair[][]).filter(group => group.length > 1);

        setDuplicatePayments(paymentGroups);
        setDuplicateRepairs(repairGroups);
        const initialSelections: Record<string, string> = {};
        paymentGroups.forEach((group, index) => {
            const best = group.sort(
                (a, b) => (b.paymentDate ? 1 : -1) - (a.paymentDate ? 1 : -1)
            )[0];
            initialSelections[`payment-group-${index}`] = best.id;
        });
        repairGroups.forEach((group, index) => {
            const best = group.sort(
                (a, b) => (b.completionDate ? 1 : -1) - (a.completionDate ? 1 : -1)
            )[0];
            initialSelections[`repair-group-${index}`] = best.id;
        });
        setSelections(initialSelections);
        setIsReconcileModalOpen(true);
    };

    const handleConfirmReconciliation = () => { 
        const recordsToDelete: {type: 'payment' | 'repair', id: string}[] = []; 
        duplicatePayments.forEach((group, index) => { 
            const keepId = selections[`payment-group-${index}`]; 
            group.forEach(p => { if (p.id !== keepId) recordsToDelete.push({type: 'payment', id: p.id}) }); 
        }); 
        duplicateRepairs.forEach((group, index) => { 
            const keepId = selections[`repair-group-${index}`]; 
            group.forEach(r => { if (r.id !== keepId) recordsToDelete.push({type: 'repair', id: r.id}) }); 
        }); 
        if (window.confirm(`Are you sure you want to delete ${recordsToDelete.length} duplicate record(s)?`)) { 
            recordsToDelete.forEach(record => { if (record.type === 'payment') deletePayment(record.id); else deleteRepair(record.id); }); 
            alert(`${recordsToDelete.length} records deleted.`); 
            setIsReconcileModalOpen(false); 
        } 
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-bold">Reporting</h2>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={handleGenerateRentalStatement} 
                            title="Download Professional Rental Statement"
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white border border-indigo-600 rounded-lg shadow hover:bg-indigo-700 transition-all font-bold"
                        >
                            <CreditCardIcon className="w-4 h-4" /> 
                            Rental Statement (PDF)
                        </button>
                        <button onClick={handleReconcile} disabled={isReadOnly} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:bg-gray-200">
                            <ShieldCheckIcon className="w-4 h-4 text-green-600" /> 
                            Reconcile
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} disabled={isReadOnly} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:bg-gray-200">
                            <ArrowUpTrayIcon className="w-4 h-4" /> 
                            Import
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden"/>
                        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                            <ArrowDownTrayIcon className="w-4 h-4" /> 
                            Export
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100 shadow-inner"> 
                    <select name="type" value={filters.type} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm"> <option value="all">All Types</option> <option value="Rent">Rent</option> <option value="Utility">Utility</option> <option value="Repair">Repair</option> </select> 
                    <select name="propertyId" value={filters.propertyId} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm"> <option value="all">All Properties</option> {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> 
                    <select name="tenantId" value={filters.tenantId} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm"> <option value="all">All Tenants</option> {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.propertyName})</option>)} </select> 
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm"> <option value="all">All Status</option> <option value="collected">Collected</option> <option value="outstanding">Outstanding</option> </select> 
                    {filters.type === 'Repair' && ( <select name="repairStatus" value={filters.repairStatus} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm"> <option value="all">All Repair Status</option> <option value="open">Open</option> <option value="completed">Completed</option> </select> )} 
                    <div className="flex gap-2 lg:col-span-2">
                        <select name="reportMonth" value={filters.reportMonth} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm flex-1">
                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <input type="number" name="reportYear" value={filters.reportYear} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm w-24"/>
                    </div>
                    <div className="lg:col-span-3 flex items-center gap-2">
                         <span className="text-xs font-semibold text-gray-500 uppercase">Range:</span>
                         <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm flex-1"/> 
                         <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm flex-1"/> 
                    </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"> <tr> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property / Tenant</th> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Category</th> <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bill</th> <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th> <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th> <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th> </tr> </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.map((item, index) => ( <tr key={index}> <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(item.date).toLocaleDateString()}</td> <td className="px-6 py-4 whitespace-nowrap text-sm"><div>{item.propertyName}</div><div className="text-xs text-gray-500">{item.tenantName}</div></td> <td className="px-6 py-4 whitespace-nowrap text-sm"> <span className={`font-semibold ${item.type === 'Repair' ? 'text-yellow-700' : 'text-blue-700'}`}>{item.type}</span> {item.type !== item.category && <span className="text-gray-500"> / {item.category}</span>} </td> <td className="px-6 py-4 whitespace-nowrap text-sm text-right">${item.billAmount.toFixed(2)}</td> <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">${item.paidAmount.toFixed(2)}</td> <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${item.balance > 0 ? 'text-red-600' : ''}`}>${item.balance.toFixed(2)}</td> <td className="px-6 py-4 whitespace-nowrap text-sm text-right"> <button disabled={isReadOnly} onClick={() => onEditItem({ type: item.type === 'Repair' ? 'repair' : 'payment', id: item.originalId })} className="text-blue-600 hover:text-blue-900 disabled:text-gray-300"><PencilSquareIcon className="w-5 h-5"/></button> </td> </tr> ))}
                        </tbody>
                        <tfoot className="bg-gray-100"> <tr> <td colSpan={3} className="px-6 py-3 text-right font-bold">Totals:</td> <td className="px-6 py-3 text-right font-bold text-sm">${totals.billAmount.toFixed(2)}</td> <td className="px-6 py-3 text-right font-bold text-sm text-green-700">${totals.paidAmount.toFixed(2)}</td> <td className={`px-6 py-3 text-right font-bold text-sm ${totals.balance > 0 ? 'text-red-700' : ''}`}>${totals.balance.toFixed(2)}</td> <td></td> </tr> </tfoot>
                    </table>
                </div>
            </CardContent>
             {importPreview && ( <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Preview"> <div className="space-y-4"> <p>Found <strong>{importPreview.validRecords.length}</strong> valid records and <strong>{importPreview.errors.length}</strong> errors.</p> {importPreview.errors.length > 0 && ( <div> <h4 className="font-semibold text-red-600">Errors:</h4> <ul className="text-sm text-red-500 list-disc list-inside max-h-40 overflow-y-auto bg-red-50 p-2 rounded"> {importPreview.errors.map(err => <li key={err.row}>Row {err.row}: {err.message}</li>)} </ul> </div> )} <p className="text-sm text-gray-600">Only valid records will be imported. Please review before continuing.</p> <div className="flex justify-end gap-2 pt-4"> <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button> <button onClick={handleConfirmImport} disabled={importPreview.validRecords.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400">Confirm Import</button> </div> </div> </Modal> )}
            {isReconcileModalOpen && ( <Modal isOpen={isReconcileModalOpen} onClose={() => setIsReconcileModalOpen(false)} title="Reconcile Duplicate Records"> <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1"> {(duplicatePayments.length + duplicateRepairs.length) === 0 ? ( <p>No duplicate records found.</p> ) : ( <> {duplicatePayments.map((group, index) => ( <Card key={`payment-group-${index}`}> <CardHeader><p className="font-semibold">Duplicate Payments: {properties.find(p => p.id === group[0].propertyId)?.name} - {MONTHS[group[0].month - 1]} {group[0].year}</p></CardHeader> <CardContent className="space-y-2"> {group.map(p => ( <label key={p.id} className="block p-2 border rounded has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500"> <input type="radio" name={`payment-group-${index}`} value={p.id} checked={selections[`payment-group-${index}`] === p.id} onChange={(e) => setSelections(s => ({...s, [`payment-group-${index}`]: e.target.value}))}/> <span className="ml-2">Rent: ${p.rentPaidAmount}/${p.rentBillAmount} | Utilities: ${p.utilities.reduce((sum, u) => sum + u.paidAmount, 0)}/${p.utilities.reduce((sum, u) => sum + u.billAmount, 0)}</span> <p className="text-xs text-gray-500 ml-5">Last Updated: {p.paymentDate ? new Date(p.paymentDate).toLocaleString() : 'N/A'}</p> </label> ))} </CardContent> </Card> ))} {duplicateRepairs.map((group, index) => ( <Card key={`repair-group-${index}`}> <CardHeader><p className="font-semibold">Duplicate Repairs: {properties.find(p => p.id === group[0].propertyId)?.name}</p></CardHeader> <CardContent className="space-y-2"> <p className="text-sm italic">{group[0].description}</p> {group.map(r => ( <label key={r.id} className="block p-2 border rounded has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500"> <input type="radio" name={`repair-group-${index}`} value={r.id} checked={selections[`repair-group-${index}`] === r.id} onChange={(e) => setSelections(s => ({...s, [`repair-group-${index}`]: e.target.value}))}/> <span className="ml-2">Cost: ${r.cost} | Status: {r.status}</span> <p className="text-xs text-gray-500 ml-5">Completed: {r.completionDate ? new Date(r.completionDate).toLocaleDateString() : 'N/A'}</p> </label> ))} </CardContent> </Card> ))} </> )} <div className="flex justify-end gap-2 pt-4"> <button onClick={() => setIsReconcileModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button> <button onClick={handleConfirmReconciliation} disabled={(duplicatePayments.length + duplicateRepairs.length) === 0} className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-gray-400">Confirm & Delete</button> </div> </div> </Modal> )}
        </Card>
    );
};

export default ReportingScreen;
