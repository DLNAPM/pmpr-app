
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Property, Tenant } from '../types';
import Card, { CardContent, CardHeader } from '../components/Card';

interface ReportItem {
    date: string;
    propertyName: string;
    tenantName?: string;
    type: 'Rent' | 'Utility' | 'Repair';
    category: string;
    billAmount: number;
    paidAmount: number;
    balance: number;
}

const ReportingScreen: React.FC = () => {
    const { properties, payments, repairs } = useAppContext();
    
    const [filters, setFilters] = useState({
        type: 'all',
        propertyId: 'all',
        tenantId: 'all',
        startDate: '',
        endDate: '',
    });

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

            // Add rent item
            allItems.push({
                date: new Date(p.year, p.month - 1, 1).toISOString(),
                propertyName: property.name,
                tenantName: property.tenants[0]?.name,
                type: 'Rent',
                category: 'Monthly Rent',
                billAmount: p.rentBillAmount,
                paidAmount: p.rentPaidAmount,
                balance: p.rentBillAmount - p.rentPaidAmount,
            });

            // Add utility items
            p.utilities.forEach(u => {
                allItems.push({
                    date: new Date(p.year, p.month - 1, 1).toISOString(),
                    propertyName: property.name,
                    tenantName: property.tenants[0]?.name,
                    type: 'Utility',
                    category: u.category,
                    billAmount: u.billAmount,
                    paidAmount: u.paidAmount,
                    balance: u.billAmount - u.paidAmount,
                });
            });
        });

        repairs.forEach(r => {
            const property = properties.find(prop => prop.id === r.propertyId);
            if (!property) return;
            allItems.push({
                date: r.repairDate || r.requestDate,
                propertyName: property.name,
                tenantName: property.tenants[0]?.name,
                type: 'Repair',
                category: r.description.substring(0, 30),
                billAmount: r.cost,
                paidAmount: r.status === 'Complete' ? r.cost : 0, // Assuming cost is paid on completion for reporting
                balance: r.status === 'Complete' ? 0 : r.cost,
            });
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
            if (endDate) {
                // include the whole day
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                if (itemDate > endOfDay) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [filters, payments, repairs, properties]);

    const totals = useMemo(() => {
        return filteredData.reduce((acc, item) => {
            acc.billAmount += item.billAmount;
            acc.paidAmount += item.paidAmount;
            acc.balance += item.balance;
            return acc;
        }, { billAmount: 0, paidAmount: 0, balance: 0 });
    }, [filteredData]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Reporting</h2>
            <Card>
                <CardHeader><h3 className="font-semibold">Filters</h3></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full p-2 border rounded">
                        <option value="all">All Types</option>
                        <option value="rent">Rent</option>
                        <option value="utility">Utilities</option>
                        <option value="repair">Repairs</option>
                    </select>
                    <select name="propertyId" value={filters.propertyId} onChange={handleFilterChange} className="w-full p-2 border rounded">
                        <option value="all">All Properties</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select name="tenantId" value={filters.tenantId} onChange={handleFilterChange} disabled={filters.propertyId === 'all'} className="w-full p-2 border rounded disabled:bg-gray-100">
                        <option value="all">All Tenants</option>
                        {tenantsForSelectedProperty.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded" />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded" />
                </CardContent>
            </Card>
            
            <Card>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Category</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Billed</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredData.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.propertyName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="font-semibold">{item.type}</span>
                                            <br/>
                                            <span className="text-xs text-gray-500">{item.category}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.billAmount)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(item.paidAmount)}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${item.balance > 0 ? 'text-red-600' : ''}`}>{formatCurrency(item.balance)}</td>
                                    </tr>
                                ))}
                                {filteredData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-gray-500">No data matches your filters.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-100">
                                <tr>
                                    <td colSpan={3} className="px-6 py-3 text-right text-sm font-bold uppercase">Totals:</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold">{formatCurrency(totals.billAmount)}</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-green-700">{formatCurrency(totals.paidAmount)}</td>
                                    <td className={`px-6 py-3 text-right text-sm font-bold ${totals.balance > 0 ? 'text-red-700' : ''}`}>{formatCurrency(totals.balance)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportingScreen;