
import React, { useMemo } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import { useAppContext } from '../contexts/AppContext';
import { BuildingOfficeIcon, CreditCardIcon, WrenchScrewdriverIcon, MapPinIcon, CurrencyDollarIcon, ArrowTopRightOnSquareIcon } from '../components/Icons';
import { RepairStatus } from '../types';
import { ReportFilter } from '../App';

interface DashboardScreenProps {
  onAction: (tab: 'properties' | 'payments' | 'repairs' | 'reporting' | 'contractors', action?: string) => void;
  onNavigateToReport: (filter: ReportFilter) => void;
}

// Helper to generate a deterministic, fake property value for the demo
const getFakeRedfinValue = (propertyId: string) => {
    let hash = 0;
    for (let i = 0; i < propertyId.length; i++) {
        const char = propertyId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    const baseValue = 250000;
    const randomPart = Math.abs(hash) % 700000;
    return baseValue + randomPart;
};


const DashboardScreen: React.FC<DashboardScreenProps> = ({ onAction, onNavigateToReport }) => {
    const { properties, payments, repairs, getSiteHealthScore } = useAppContext();

    // New summary for ALL-TIME financial data
    const overallSummary = useMemo(() => {
        const paymentTotals = payments.reduce((acc, p) => {
            acc.billed += p.rentBillAmount;
            acc.collected += p.rentPaidAmount;
            p.utilities.forEach(u => {
                acc.billed += u.billAmount;
                acc.collected += u.paidAmount;
            });
            return acc;
        }, { collected: 0, billed: 0 });

        const repairTotals = repairs.reduce((acc, r) => {
            acc.billed += r.cost; // All repairs are a bill
            if (r.status === RepairStatus.COMPLETE) {
                acc.collected += r.cost; // Only completed repairs are considered paid
            }
            return acc;
        }, { collected: 0, billed: 0 });
        
        const totalCollected = paymentTotals.collected + repairTotals.collected;
        const totalBilled = paymentTotals.billed + repairTotals.billed;
        const totalOutstanding = totalBilled - totalCollected;

        return { totalCollected, totalBilled, totalOutstanding };
    }, [payments, repairs]);


    // Summary for THIS MONTH's payment data
    const monthlySummary = useMemo(() => {
        let totalCollected = 0;
        let totalBilled = 0;
        let categoryBreakdown: { [key: string]: { paid: number, total: number } } = {};

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        payments.filter(p => p.year === currentYear && p.month === currentMonth).forEach(p => {
            totalCollected += p.rentPaidAmount;
            totalBilled += p.rentBillAmount;
            
            if (!categoryBreakdown['Rent']) categoryBreakdown['Rent'] = { paid: 0, total: 0 };
            categoryBreakdown['Rent'].paid += p.rentPaidAmount;
            categoryBreakdown['Rent'].total += p.rentBillAmount;

            p.utilities.forEach(u => {
                totalCollected += u.paidAmount;
                totalBilled += u.billAmount;

                if (!categoryBreakdown[u.category]) categoryBreakdown[u.category] = { paid: 0, total: 0 };
                categoryBreakdown[u.category].paid += u.paidAmount;
                categoryBreakdown[u.category].total += u.billAmount;
            });
        });

        const overallCollectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 100;

        return { overallCollectionRate, categoryBreakdown };
    }, [payments]);

    const repairSummary = useMemo(() => {
        const openRequests = repairs.filter(r => r.status !== RepairStatus.COMPLETE).length;
        const totalCost = repairs.filter(r => r.status === RepairStatus.COMPLETE).reduce((sum, r) => sum + r.cost, 0);
        return { openRequests, totalCost };
    }, [repairs]);
    
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

                {/* Summary Cards (All-Time) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card onClick={() => onNavigateToReport({ status: 'collected' })}><CardContent><p className="text-sm text-gray-500">Total Collected</p><p className="text-2xl font-bold text-green-600">{formatCurrency(overallSummary.totalCollected)}</p></CardContent></Card>
                    <Card onClick={() => onNavigateToReport({ status: 'outstanding' })}><CardContent><p className="text-sm text-gray-500">Outstanding</p><p className="text-2xl font-bold text-red-600">{formatCurrency(overallSummary.totalOutstanding)}</p></CardContent></Card>
                    <Card onClick={() => onNavigateToReport({ status: 'all' })}><CardContent><p className="text-sm text-gray-500">Total Billed</p><p className="text-2xl font-bold text-blue-800">{formatCurrency(overallSummary.totalBilled)}</p></CardContent></Card>
                </div>

                {/* Overall Collection (This Month) */}
                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Overall Collection Rate (This Month)</h3></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <span className="text-3xl font-bold text-blue-700">{monthlySummary.overallCollectionRate.toFixed(1)}%</span>
                            <ProgressBar value={monthlySummary.overallCollectionRate} />
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Breakdown (This Month) */}
                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Payment Breakdown (This Month)</h3></CardHeader>
                    <CardContent className="space-y-4">
                        {Object.entries(monthlySummary.categoryBreakdown).map(([category, data]) => {
                            const typedData = data as { paid: number, total: number };
                            return (
                                <div key={category}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium">{category}</span>
                                        <span className="text-sm text-gray-600">{formatCurrency(typedData.paid)} / {formatCurrency(typedData.total)}</span>
                                    </div>
                                    <ProgressBar value={typedData.total > 0 ? (typedData.paid / typedData.total) * 100 : 0} />
                                </div>
                            );
                        })}
                         {Object.keys(monthlySummary.categoryBreakdown).length === 0 && <p className="text-gray-500 text-center py-4">No payments recorded for the current month.</p>}
                    </CardContent>
                </Card>
            </div>

            {/* Side Column */}
            <div className="space-y-6">
                 <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Properties & Repairs</h3></CardHeader>
                    <CardContent className="divide-y divide-gray-200">
                        <div className="pb-4">
                            <p className="text-sm text-gray-500">Active Properties</p>
                            <p className="text-4xl font-bold text-blue-800">{properties.length}</p>
                        </div>
                        <div className="pt-4">
                            <p className="text-sm text-gray-500">Repairs Overview</p>
                            <div className="flex justify-between items-baseline mt-1">
                                <button onClick={() => onNavigateToReport({ repairStatus: 'open' })} className="text-left hover:bg-slate-100 p-2 rounded-lg">
                                    <p className="text-2xl font-bold text-yellow-600">{repairSummary.openRequests}</p>
                                    <p className="text-xs text-gray-500">Open Requests</p>
                                </button>
                                <button onClick={() => onNavigateToReport({ repairStatus: 'completed' })} className="text-right hover:bg-slate-100 p-2 rounded-lg">
                                    <p className="text-2xl font-bold text-slate-700">{formatCurrency(repairSummary.totalCost)}</p>
                                    <p className="text-xs text-gray-500">Completed Cost</p>
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Site Health & Ranking</h3></CardHeader>
                    <CardContent>
                        {properties.length > 0 ? (
                            <ul className="space-y-4">
                                {sortedProperties.map((prop, index) => {
                                    const score = getSiteHealthScore(prop.id);
                                    return (
                                        <li key={prop.id} className="flex items-start justify-between">
                                            <div className="flex-1 pr-4">
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
                                                <div className="flex items-center justify-between mt-1.5">
                                                    <a
                                                      href={`https://www.redfin.com/stingray/search?search_location=${encodeURIComponent(prop.address)}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="group inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
                                                    >
                                                      <ArrowTopRightOnSquareIcon className="w-3 h-3 text-gray-400 group-hover:text-red-500 transition-colors" />
                                                      <span>Redfin.com</span>
                                                    </a>
                                                    <div className="flex items-center gap-1 text-xs text-gray-800 font-semibold">
                                                        <CurrencyDollarIcon className="w-3.5 h-3.5 text-green-500" />
                                                        <span>{formatCurrency(getFakeRedfinValue(prop.id)).replace('.00', '')}</span>
                                                    </div>
                                                </div>
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
