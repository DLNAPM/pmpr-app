
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

        // BRANDING & COLORS
        const primaryBlue = [51, 102, 204];
        const slateGrey = [100, 116, 139];

        // 1. HEADER LOGO & TITLE
        doc.setFontSize(28);
        doc.setTextColor(...primaryBlue);
        doc.setFont('helvetica', 'bold');
        doc.text('STATEMENT', 140, 25);

        // Company Logo if exists
        if (user?.companyLogo) {
            try {
                const logoData = user.companyLogo;
                doc.addImage(logoData, 'PNG', 20, 15, 25, 25);
            } catch (e) {
                console.error("PDF Logo Error:", e);
            }
        }

        // Company Info
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        const startY = 25;
        const infoX = user?.companyLogo ? 50 : 20;
        doc.text(user?.companyName || user?.name || '[Company Name]', infoX, startY);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const companyLines = (user?.companyAddress || '[Address Not Provided]').split('\n');
        companyLines.forEach((line, i) => {
            doc.text(line, infoX, startY + 6 + (i * 5));
        });
        doc.text(`Phone: ${user?.companyPhone || '[Phone Not Provided]'}`, infoX, startY + 6 + (companyLines.length * 5));

        // CALC STATEMENT DATE: Last Wednesday of the previous month
        let prevMonth = filters.reportMonth - 1;
        let prevYear = filters.reportYear;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
        }
        // Month param in Date(year, month, 0) is 1-indexed for the '0' shortcut to work as expected here
        const statementDateObj = new Date(prevYear, prevMonth, 0);
        while (statementDateObj.getDay() !== 3) {
            statementDateObj.setDate(statementDateObj.getDate() - 1);
        }
        const statementDateStr = statementDateObj.toLocaleDateString();

        // Statement Info Box
        doc.setDrawColor(200);
        doc.rect(140, 35, 55, 14); 
        doc.line(140, 42, 195, 42); 
        doc.line(168, 35, 168, 49); 
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Statement Date', 142, 40);
        doc.text('Customer ID', 142, 47);
        doc.setFont('helvetica', 'normal');
        doc.text(statementDateStr, 170, 40);
        doc.text(selectedProperty.id.substring(0, 6).toUpperCase(), 170, 47);

        // 2. BILL TO & PROPERTY DETAILS
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', 20, 65);
        doc.setFont('helvetica', 'normal');
        const mainTenant = selectedProperty.tenants[0];
        doc.text(mainTenant?.name || '[Tenant Name]', 35, 65);
        doc.text(selectedProperty.address, 35, 71);
        doc.text(mainTenant?.phone || '[Phone]', 35, 77);

        doc.setFont('helvetica', 'bold');
        doc.text('Property:', 110, 65);
        doc.setFont('helvetica', 'normal');
        doc.text(selectedProperty.name, 130, 65);
        doc.text(selectedProperty.address, 130, 71);
        doc.text('Contract Period:', 110, 83);
        doc.text(`${new Date(selectedProperty.leaseStart).toLocaleDateString()} to ${new Date(selectedProperty.leaseEnd).toLocaleDateString()}`, 145, 83);

        // 3. ACCOUNT ACTIVITY
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Account Activity', 20, 100);

        // Calc Balance Forward (all previous history)
        const previousPayments = payments.filter(p => 
            p.propertyId === selectedProperty.id && 
            (p.year < filters.reportYear || (p.year === filters.reportYear && p.month < filters.reportMonth))
        );
        const prevBilled = previousPayments.reduce((sum, p) => sum + p.rentBillAmount + p.utilities.reduce((s, u) => s + u.billAmount, 0), 0);
        const prevPaid = previousPayments.reduce((sum, p) => sum + p.rentPaidAmount + p.utilities.reduce((s, u) => s + u.paidAmount, 0), 0);
        const balanceForward = prevBilled - prevPaid;

        // Transactions for selected month
        const currentMonthPayment = payments.find(p => p.propertyId === selectedProperty.id && p.year === filters.reportYear && p.month === filters.reportMonth);
        const tableRows: any[] = [];
        
        tableRows.push(['', '', 'Balance Forward', balanceForward.toFixed(2)]);

        if (currentMonthPayment) {
            tableRows.push([
                `${filters.reportMonth}/01/${filters.reportYear}`,
                'INV-RENT',
                `Monthly Rent - ${MONTHS[filters.reportMonth-1]}`,
                currentMonthPayment.rentBillAmount.toFixed(2)
            ]);
            currentMonthPayment.utilities.forEach(u => {
                if (u.billAmount > 0) {
                    tableRows.push([
                        `${filters.reportMonth}/01/${filters.reportYear}`,
                        'INV-UTIL',
                        u.category,
                        u.billAmount.toFixed(2)
                    ]);
                }
            });
            const totalPaid = currentMonthPayment.rentPaidAmount + currentMonthPayment.utilities.reduce((s, u) => s + u.paidAmount, 0);
            if (totalPaid > 0) {
                tableRows.push([
                    currentMonthPayment.paymentDate ? new Date(currentMonthPayment.paymentDate).toLocaleDateString() : '',
                    'PMT-RCVD',
                    'Payment Received - Thank You',
                    `-${totalPaid.toFixed(2)}`
                ]);
            }
        } else {
             tableRows.push([
                `${filters.reportMonth}/01/${filters.reportYear}`,
                'INV-RENT',
                `Monthly Rent - ${MONTHS[filters.reportMonth-1]}`,
                selectedProperty.rentAmount.toFixed(2)
            ]);
        }

        doc.autoTable({
            head: [['DATE', 'REF', 'DESCRIPTION', 'AMOUNT']],
            body: tableRows,
            startY: 105,
            theme: 'striped',
            headStyles: { fillColor: primaryBlue },
            columnStyles: { 3: { halign: 'right' } }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const currentBilled = currentMonthPayment 
            ? (currentMonthPayment.rentBillAmount + currentMonthPayment.utilities.reduce((s,u) => s + u.billAmount, 0)) 
            : selectedProperty.rentAmount;
        const currentPaid = currentMonthPayment 
            ? (currentMonthPayment.rentPaidAmount + currentMonthPayment.utilities.reduce((s,u) => s + u.paidAmount, 0)) 
            : 0;
        const totalDue = balanceForward + currentBilled - currentPaid;

        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL DUE', 135, finalY);
        
        // Ensure "TOTAL DUE" is readable by correctly setting fill color before rectangle
        doc.setFillColor(235, 240, 250);
        doc.rect(160, finalY - 6, 35, 9, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.text('$', 162, finalY);
        doc.text(totalDue.toFixed(2), 193, finalY, { align: 'right' });

        // 4. REMITTANCE SLIP
        const slipY = 240;
        doc.setLineDash([2, 2]);
        doc.setDrawColor(150);
        doc.line(20, slipY - 10, 190, slipY - 10);
        doc.setLineDash([]);
        doc.setFontSize(8);
        doc.setTextColor(...slateGrey);
        doc.text('Please detach and return this slip with your payment.', 20, slipY - 5);

        doc.setFontSize(11);
        doc.setTextColor(...primaryBlue);
        doc.setFont('helvetica', 'bold');
        doc.text('REMITTANCE SLIP', 95, slipY + 5, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text('Payee:', 20, slipY + 15);
        doc.setFont('helvetica', 'bold');
        doc.text(user?.companyName || user?.name || '[Payee Name]', 20, slipY + 21);
        doc.setFont('helvetica', 'normal');
        companyLines.forEach((line, i) => doc.text(line, 20, slipY + 27 + (i * 5)));

        doc.text('Statement Date:', 120, slipY + 15);
        doc.text(statementDateStr, 170, slipY + 15);
        doc.text('Property ID:', 120, slipY + 21);
        doc.text(selectedProperty.id.substring(0, 6).toUpperCase(), 170, slipY + 21);

        doc.setFont('helvetica', 'bold');
        doc.text('AMOUNT PAID:', 120, slipY + 46);
        doc.setDrawColor(0);
        doc.rect(155, slipY + 40, 40, 9);
        doc.text('$', 157, slipY + 46);

        doc.save(`Statement_${selectedProperty.name.replace(/\s/g, '_')}_${MONTHS[filters.reportMonth-1]}.pdf`);
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
        alert('Import completed successfully.');
    };

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
            const best = group.sort((a, b) => (b.paymentDate ? 1 : -1) - (a.paymentDate ? 1 : -1))[0];
            initialSelections[`payment-group-${index}`] = best.id;
        });
        repairGroups.forEach((group, index) => {
            const best = group.sort((a, b) => (b.completionDate ? 1 : -1) - (a.completionDate ? 1 : -1))[0];
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold">Reporting & Analytics</h2>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={handleGenerateRentalStatement} 
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors font-bold"
                    >
                        <CreditCardIcon className="w-5 h-5" />
                        Monthly Statement (PDF)
                    </button>
                    <button onClick={handleReconcile} disabled={isReadOnly} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:bg-gray-100">
                        <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                        Reconcile
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={isReadOnly} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:bg-gray-100">
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
                <CardHeader><h3 className="font-semibold text-lg">Report Filters</h3></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Property</label>
                                <select name="propertyId" value={filters.propertyId} onChange={handleFilterChange} className="w-full p-2 border rounded-md shadow-sm">
                                    <option value="all">All Properties</option>
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Target Month</label>
                                <div className="flex gap-2">
                                    <select name="reportMonth" value={filters.reportMonth} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm flex-1">
                                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                    </select>
                                    <input type="number" name="reportYear" value={filters.reportYear} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm w-24"/>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Type</label>
                                <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full p-2 border rounded-md shadow-sm">
                                    <option value="all">All Types</option>
                                    <option value="Rent">Rent</option>
                                    <option value="Utility">Utility</option>
                                    <option value="Repair">Repair</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date Range</label>
                                <div className="flex gap-2">
                                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm flex-1"/> 
                                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md shadow-sm flex-1"/> 
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</label>
                                <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border rounded-md shadow-sm">
                                    <option value="all">All Statuses</option>
                                    <option value="collected">Fully Collected</option>
                                    <option value="outstanding">Outstanding Balance</option>
                                </select>
                            </div>
                            {filters.type === 'Repair' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Repair Status</label>
                                    <select name="repairStatus" value={filters.repairStatus} onChange={handleFilterChange} className="w-full p-2 border rounded-md shadow-sm">
                                        <option value="all">All Repair States</option>
                                        <option value="open">Open Requests</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800 text-white text-xs uppercase tracking-widest">
                                <th className="p-4 border-b border-slate-700">Date</th>
                                <th className="p-4 border-b border-slate-700">Property / Tenant</th>
                                <th className="p-4 border-b border-slate-700">Description</th>
                                <th className="p-4 border-b border-slate-700 text-right">Bill</th>
                                <th className="p-4 border-b border-slate-700 text-right">Paid</th>
                                <th className="p-4 border-b border-slate-700 text-right">Balance</th>
                                <th className="p-4 border-b border-slate-700 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reportData.map((item, idx) => (
                                <tr key={`${item.originalId}-${idx}`} className="hover:bg-blue-50/50 transition-colors text-sm group">
                                    <td className="p-4 whitespace-nowrap text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <p className="font-bold text-slate-800">{item.propertyName}</p>
                                        <p className="text-xs text-slate-500">{item.tenantName}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.type === 'Repair' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {item.type}
                                        </span>
                                        <span className="ml-2 text-slate-600">{item.category}</span>
                                    </td>
                                    <td className="p-4 text-right font-medium">${item.billAmount.toFixed(2)}</td>
                                    <td className="p-4 text-right text-green-600 font-medium">${item.paidAmount.toFixed(2)}</td>
                                    <td className={`p-4 text-right font-black ${item.balance > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                                        ${item.balance.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            disabled={isReadOnly}
                                            onClick={() => onEditItem({ type: item.type === 'Repair' ? 'repair' : 'payment', id: item.originalId })}
                                            className="text-slate-300 hover:text-blue-600 p-1.5 bg-slate-50 rounded-lg transition-all hover:shadow-sm disabled:opacity-30"
                                        >
                                            <PencilSquareIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {reportData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <ShieldCheckIcon className="w-12 h-12 text-slate-200" />
                                            <p className="text-slate-400 font-medium">No results match your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {reportData.length > 0 && (
                            <tfoot className="bg-slate-50 font-black">
                                <tr>
                                    <td colSpan={3} className="p-4 text-right text-slate-500 uppercase text-xs tracking-widest">Grand Totals</td>
                                    <td className="p-4 text-right text-slate-900">${totals.billAmount.toFixed(2)}</td>
                                    <td className="p-4 text-right text-green-700">${totals.paidAmount.toFixed(2)}</td>
                                    <td className="p-4 text-right text-red-600">${totals.balance.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>

            {isImportModalOpen && importPreview && (
                <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="CSV Import Preview">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                                <p className="text-2xl font-black text-green-600">{importPreview.validRecords.length}</p>
                                <p className="text-xs text-green-800 uppercase font-bold">Valid Records</p>
                            </div>
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                                <p className="text-2xl font-black text-red-600">{importPreview.errors.length}</p>
                                <p className="text-xs text-red-800 uppercase font-bold">Errors</p>
                            </div>
                        </div>
                        {importPreview.errors.length > 0 && (
                            <div className="max-h-40 overflow-y-auto p-4 bg-slate-900 rounded-xl font-mono text-xs text-red-400">
                                {importPreview.errors.map(err => <p key={err.row}>Row {err.row}: {err.message}</p>)}
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                            <button onClick={handleConfirmImport} disabled={importPreview.validRecords.length === 0} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">Import Valid Records</button>
                        </div>
                    </div>
                </Modal>
            )}

            {isReconcileModalOpen && (
                <Modal isOpen={isReconcileModalOpen} onClose={() => setIsReconcileModalOpen(false)} title="Data Reconciliation">
                    <div className="space-y-6">
                        {(duplicatePayments.length + duplicateRepairs.length) === 0 ? (
                            <div className="text-center py-10 space-y-3">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                    <ShieldCheckIcon className="w-10 h-10" />
                                </div>
                                <p className="text-slate-600 font-medium">Your database is clean. No duplicates found.</p>
                            </div>
                        ) : (
                            <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
                                <p className="text-sm text-slate-500">We found the following potential duplicate records. Please choose which version to keep.</p>
                                
                                {duplicatePayments.map((group, gIdx) => (
                                    <div key={gIdx} className="p-4 border rounded-xl bg-slate-50 space-y-3">
                                        <p className="font-bold text-slate-800 text-xs uppercase">Duplicate Payment Group #{gIdx + 1}</p>
                                        {group.map(p => (
                                            <label key={p.id} className="flex items-start gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-300 transition-all has-[:checked]:border-blue-600 has-[:checked]:ring-1 has-[:checked]:ring-blue-600">
                                                <input type="radio" name={`payment-group-${gIdx}`} value={p.id} checked={selections[`payment-group-${gIdx}`] === p.id} onChange={(e) => setSelections(s => ({...s, [`payment-group-${gIdx}`]: e.target.value}))} className="mt-1" />
                                                <div className="flex-1 text-xs">
                                                    <p className="font-bold">ID: {p.id.substring(0,8)}</p>
                                                    <p>Rent: ${p.rentPaidAmount}/${p.rentBillAmount}</p>
                                                    <p className="text-slate-400">Date: {p.paymentDate ? new Date(p.paymentDate).toLocaleString() : 'N/A'}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ))}

                                {duplicateRepairs.map((group, gIdx) => (
                                    <div key={gIdx} className="p-4 border rounded-xl bg-slate-50 space-y-3">
                                        <p className="font-bold text-slate-800 text-xs uppercase">Duplicate Repair Group #{gIdx + 1}</p>
                                        {group.map(r => (
                                            <label key={r.id} className="flex items-start gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-300 transition-all has-[:checked]:border-blue-600 has-[:checked]:ring-1 has-[:checked]:ring-blue-600">
                                                <input type="radio" name={`repair-group-${gIdx}`} value={r.id} checked={selections[`repair-group-${gIdx}`] === r.id} onChange={(e) => setSelections(s => ({...s, [`repair-group-${gIdx}`]: e.target.value}))} className="mt-1" />
                                                <div className="flex-1 text-xs">
                                                    <p className="font-bold">{r.description}</p>
                                                    <p>Cost: ${r.cost} | Status: {r.status}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setIsReconcileModalOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold">Close</button>
                            {(duplicatePayments.length + duplicateRepairs.length) > 0 && (
                                <button onClick={handleConfirmReconciliation} className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200">Reconcile Selected</button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ReportingScreen;
