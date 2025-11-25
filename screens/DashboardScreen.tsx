
import React, { useMemo } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import { useAppContext } from '../contexts/AppContext';
import { BuildingOfficeIcon, CreditCardIcon, WrenchScrewdriverIcon, MapPinIcon } from '../components/Icons';

interface DashboardScreenProps {
  onAction: (tab: 'properties' | 'payments' | 'repairs', action?: string) => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onAction }) => {
    const { properties, payments, getSiteHealthScore } = useAppContext();

    const summary = useMemo(() => {
        let totalCollected = 0;
        let totalOutstanding = 0;
        let categoryBreakdown: { [key: string]: { paid: number, total: number } } = {};

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        payments.filter(p => p.year === currentYear && p.month === currentMonth).forEach(p => {
            if (p.rentPaid) {
                totalCollected += p.rentAmount;
                if (!categoryBreakdown['Rent']) categoryBreakdown['Rent'] = { paid: 0, total: 0 };
                categoryBreakdown['Rent'].paid += p.rentAmount;
            } else {
                totalOutstanding += p.rentAmount;
            }
            if (!categoryBreakdown['Rent']) categoryBreakdown['Rent'] = { paid: 0, total: 0 };
            categoryBreakdown['Rent'].total += p.rentAmount;

            p.utilities.forEach(u => {
                if (u.isPaid) {
                    totalCollected += u.amount;
                    if (!categoryBreakdown[u.category]) categoryBreakdown[u.category] = { paid: 0, total: 0 };
                    categoryBreakdown[u.category].paid += u.amount;
                } else {
                    totalOutstanding += u.amount;
                }
                if (!categoryBreakdown[u.category]) categoryBreakdown[u.category] = { paid: 0, total: 0 };
                categoryBreakdown[u.category].total += u.amount;
            });
        });

        const totalDue = totalCollected + totalOutstanding;
        const overallCollectionRate = totalDue > 0 ? (totalCollected / totalDue) * 100 : 100;

        return { totalCollected, totalOutstanding, totalDue, overallCollectionRate, categoryBreakdown };
    }, [payments]);
    
    const sortedProperties = useMemo(() => {
        return [...properties].sort((a, b) => getSiteHealthScore(b.id) - getSiteHealthScore(a.id));
    }, [properties, getSiteHealthScore]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    
    const getHealthColor = (score: number) => {
        if (score >= 85) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const handleRecordPaymentClick = () => {
        if (properties.length === 0) {
          alert("Please add a property before recording a payment.");
          onAction('properties', 'add');
        } else {
          onAction('payments', 'add');
        }
    };
    
    const handleLogRepairClick = () => {
        if (properties.length === 0) {
          alert("Please add a property before logging a repair.");
          onAction('properties', 'add');
        } else {
          onAction('repairs', 'add');
        }
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Column */}
            <div className="md:col-span-2 space-y-6">
                 {/* Quick Actions */}
                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Quick Actions</h3></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button onClick={() => onAction('properties', 'add')} className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                            <BuildingOfficeIcon className="w-8 h-8 text-blue-600 mb-2"/>
                            <span className="font-semibold text-blue-800">Add Property</span>
                        </button>
                        <button onClick={handleRecordPaymentClick} className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                            <CreditCardIcon className="w-8 h-8 text-green-600 mb-2"/>
                            <span className="font-semibold text-green-800">Record Payment</span>
                        </button>
                        <button onClick={handleLogRepairClick} className="flex flex-col items-center justify-center p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
                            <WrenchScrewdriverIcon className="w-8 h-8 text-yellow-600 mb-2"/>
                            <span className="font-semibold text-yellow-800">Log Repair</span>
                        </button>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card><CardContent><p className="text-sm text-gray-500">Total Collected</p><p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCollected)}</p></CardContent></Card>
                    <Card><CardContent><p className="text-sm text-gray-500">Outstanding</p><p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</p></CardContent></Card>
                    <Card><CardContent><p className="text-sm text-gray-500">Total Due</p><p className="text-2xl font-bold text-blue-800">{formatCurrency(summary.totalDue)}</p></CardContent></Card>
                </div>

                {/* Overall Collection */}
                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Overall Collection Rate (This Month)</h3></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <span className="text-3xl font-bold text-blue-700">{summary.overallCollectionRate.toFixed(1)}%</span>
                            <ProgressBar value={summary.overallCollectionRate} />
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Breakdown */}
                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Payment Breakdown (This Month)</h3></CardHeader>
                    <CardContent className="space-y-4">
                        {Object.entries(summary.categoryBreakdown).map(([category, data]) => (
                            <div key={category}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium">{category}</span>
                                    <span className="text-sm text-gray-600">{formatCurrency(data.paid)} / {formatCurrency(data.total)}</span>
                                </div>
                                <ProgressBar value={data.total > 0 ? (data.paid / data.total) * 100 : 0} />
                            </div>
                        ))}
                         {Object.keys(summary.categoryBreakdown).length === 0 && <p className="text-gray-500 text-center py-4">No payments recorded for the current month.</p>}
                    </CardContent>
                </Card>
            </div>

            {/* Side Column */}
            <div className="space-y-6">
                 <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Active Properties</h3></CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-blue-800">{properties.length}</p>
                        <p className="text-sm text-gray-500">properties being managed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Site Health & Ranking</h3></CardHeader>
                    <CardContent>
                        {properties.length > 0 ? (
                            <ul className="space-y-3">
                                {sortedProperties.map((prop, index) => {
                                    const score = getSiteHealthScore(prop.id);
                                    return (
                                        <li key={prop.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{index + 1}. {prop.name}</p>
                                                <a
                                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prop.address)}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="group inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                                                >
                                                  <MapPinIcon className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                                  <span>{prop.address}</span>
                                                </a>
                                            </div>
                                            <span className={`font-bold text-lg ${getHealthColor(score)}`}>{score.toFixed(0)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-center py-4">No properties to rank.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardScreen;
