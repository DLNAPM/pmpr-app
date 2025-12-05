import React, { useMemo, useState, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import { useAppContext } from '../contexts/AppContext';
import { BuildingOfficeIcon, CreditCardIcon, WrenchScrewdriverIcon, MapPinIcon, CurrencyDollarIcon, ArrowTopRightOnSquareIcon } from '../components/Icons';
import { RepairStatus } from '../types';
import { ReportFilter } from '../App';
import { MONTHS } from '../constants';

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

    // New state for the dynamic breakdown
    const [selectedBreakdownPropertyId, setSelectedBreakdownPropertyId] = useState<string | null>(properties.length > 0 ? properties[0].id : null);
    const [selectedBreakdownMonth, setSelectedBreakdownMonth] = useState<string>(''); // Format: 'YYYY-MM'

    // Effect to set initial property if not set or if properties change
    useEffect(() => {
        if (properties.length > 0 && !properties.some(p => p.id === selectedBreakdownPropertyId)) {
            setSelectedBreakdownPropertyId(properties[0].id);
        } else if (properties.length === 0) {
            setSelectedBreakdownPropertyId(null);
        }
    }, [properties, selectedBreakdownPropertyId]);

    // Memoize the available months for the selected property
    const availableMonths = useMemo(() => {
        const property = properties.find(p => p.id === selectedBreakdownPropertyId);
        if (!property || !property.leaseStart || !property.leaseEnd) return [];

        const start = new Date(property.leaseStart);
        const end = new Date(); // Go up to the current date
        const leaseEndDate = new Date(property.leaseEnd);
        const finalEnd = end > leaseEndDate ? leaseEndDate : end;

        const months = [];
        let current = new Date(start.getFullYear(), start.getMonth(), 1);

        while (current <= finalEnd) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            months.push({
                value: `${year}-${String(month).padStart(2, '0')}`,
                label: `${MONTHS[month - 1]} ${year}`
            });
            current.setMonth(current.getMonth() + 1);
        }
        return months.reverse(); // Show most recent first
    }, [selectedBreakdownPropertyId, properties]);

    // Effect to set the default month when property or months change
    useEffect(() => {
        if (availableMonths.length > 0) {
            if (!availableMonths.some(m => m.value === selectedBreakdownMonth)) {
                setSelectedBreakdownMonth(availableMonths[0].value);
            }
        } else {
            setSelectedBreakdownMonth('');
        }
    }, [availableMonths, selectedBreakdownMonth]);

    // New logic for a single, selected month breakdown
    const paymentBreakdownForSelectedMonth = useMemo(() => {
        if (!selectedBreakdownPropertyId || !selectedBreakdownMonth) {
            return { categoryBreakdown: {}, hasData: false };
        }

        const [yearStr, monthStr] = selectedBreakdownMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        const paymentForMonth = payments.find(p =>
            p.propertyId === selectedBreakdownPropertyId &&
            p.year === year &&
            p.month === month
        );
        
        const categoryBreakdown: { [key: string]: { paid: number, total: number } } = {};
        const property = properties.find(p => p.id === selectedBreakdownPropertyId);
        let hasData = false;
        
        if (property) {
            const categories = ['Rent', ...property.utilitiesToTrack];
            
            categories.forEach(category => {
                let paid = 0;
                let total = 0;
                if (paymentForMonth) {
                    hasData = true;
                    if (category === 'Rent') {
                        paid = paymentForMonth.rentPaidAmount;
                        total = paymentForMonth.rentBillAmount;
                    } else {
                        const utilityPayment = paymentForMonth.utilities.find(u => u.category === category);
                        paid = utilityPayment?.paidAmount || 0;
                        total = utilityPayment?.billAmount || 0;
                    }
                }
                categoryBreakdown[category] = { paid, total };
            });
        }
        
        return { categoryBreakdown, hasData: hasData || (property && !paymentForMonth) };

    }, [selectedBreakdownPropertyId, selectedBreakdownMonth, payments, properties]);

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
            acc.billed += r.cost;
            if (r.status === RepairStatus.COMPLETE) {
                acc.collected += r.cost;
            }
            return acc;
        }, { collected: 0, billed: 0 });
        
        const totalCollected = paymentTotals.collected + repairTotals.collected;
        const totalBilled = paymentTotals.billed + repairTotals.billed;
        const totalOutstanding = totalBilled - totalCollected;

        return { totalCollected, totalBilled, totalOutstanding };
    }, [payments, repairs]);

    const monthlySummary = useMemo(() => {
        let totalCollected = 0;
        let totalBilled = 0;
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        payments.filter(p => p.year === currentYear && p.month === currentMonth).forEach(p => {
            totalCollected += p.rentPaidAmount;
            totalBilled += p.rentBillAmount;
            p.utilities.forEach(u => {
                totalCollected += u.paidAmount;
                totalBilled += u.billAmount;
            });
        });
        const overallCollectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 100;
        return { overallCollectionRate };
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
            <div className="md:col-span-2 space-y-6">
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card onClick={() => onNavigateToReport({ status: 'collected' })}><CardContent><p className="text-sm text-gray-500">Total Collected</p><p className="text-2xl font-bold text-green-600">{formatCurrency(overallSummary.totalCollected)}</p></CardContent></Card>
                    <Card onClick={() => onNavigateToReport({ status: 'outstanding' })}><CardContent><p className="text-sm text-gray-500">Outstanding</p><p className="text-2xl font-bold text-red-600">{formatCurrency(overallSummary.totalOutstanding)}</p></CardContent></Card>
                    <Card onClick={() => onNavigateToReport({ status: 'all' })}><CardContent><p className="text-sm text-gray-500">Total Billed</p><p className="text-2xl font-bold text-blue-800">{formatCurrency(overallSummary.totalBilled)}</p></CardContent></Card>
                </div>

                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Overall Collection Rate (This Month)</h3></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <span className="text-3xl font-bold text-blue-700">{monthlySummary.overallCollectionRate.toFixed(1)}%</span>
                            <ProgressBar value={monthlySummary.overallCollectionRate} />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <h3 className="font-semibold text-lg">Monthly Payment Breakdown</h3>
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedBreakdownPropertyId || ''}
                                    onChange={(e) => setSelectedBreakdownPropertyId(e.target.value)}
                                    className="p-2 border rounded-md text-sm bg-white shadow-sm"
                                    disabled={properties.length === 0}
                                >
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedBreakdownMonth}
                                    onChange={(e) => setSelectedBreakdownMonth(e.target.value)}
                                    className="p-2 border rounded-md text-sm bg-white shadow-sm"
                                    disabled={availableMonths.length === 0}
                                >
                                    {availableMonths.map(month => (
                                        <option key={month.value} value={month.value}>{month.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {selectedBreakdownPropertyId && selectedBreakdownMonth ? (
                            paymentBreakdownForSelectedMonth.hasData ? (
                                <div className="space-y-4">
                                    {Object.keys(paymentBreakdownForSelectedMonth.categoryBreakdown).map(category => {
                                        const data = paymentBreakdownForSelectedMonth.categoryBreakdown[category];
                                        return (
                                            <div key={category}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-medium">{category}</span>
                                                    <span className="text-sm text-gray-600">{formatCurrency(data.paid)} / {formatCurrency(data.total)}</span>
                                                </div>
                                                <ProgressBar value={data.total > 0 ? (data.paid / data.total) * 100 : (data.paid > 0 ? 100 : 0)} />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">No payment record found for this month.</p>
                            )
                        ) : (
                            <p className="text-gray-500 text-center py-4">
                                {properties.length > 0 ? "Select a property and month to view breakdown." : "Please add a property to see payment breakdowns."}
                            </p>
                        )}
                    </CardContent>
                </Card>

            </div>

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
