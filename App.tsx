
import React, { useState } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import PropertiesScreen from './screens/PropertiesScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import RepairsScreen from './screens/RepairsScreen';
import { BuildingOfficeIcon, ChartPieIcon, CreditCardIcon, WrenchScrewdriverIcon, UserCircleIcon } from './components/Icons';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';

type Tab = 'dashboard' | 'properties' | 'payments' | 'repairs';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { authStatus, user, logout } = useAuth();

  if (authStatus === 'idle') {
    return <LoginScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'properties':
        return <PropertiesScreen />;
      case 'payments':
        return <PaymentsScreen />;
      case 'repairs':
        return <RepairsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  const NavItem: React.FC<{ tabName: Tab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors duration-200 ${
        activeTab === tabName ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'
      }`}
    >
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-800 tracking-tight">PMPR App</h1>
            <div className="flex items-center gap-4">
               <div className="text-right">
                 <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <UserCircleIcon className="w-6 h-6 text-gray-400" />
                    {user ? user.name : 'Guest'}
                 </div>
                 <div className="text-xs text-gray-500">
                    {user ? user.email : 'Local Session'}
                 </div>
               </div>
               <button onClick={logout} className="px-3 py-1.5 text-sm font-medium bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors">
                 Logout
               </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="pb-24">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 p-4">
          {renderContent()}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg flex justify-around md:hidden">
        <NavItem tabName="dashboard" label="Dashboard" icon={<ChartPieIcon className="w-6 h-6" />} />
        <NavItem tabName="properties" label="Properties" icon={<BuildingOfficeIcon className="w-6 h-6" />} />
        <NavItem tabName="payments" label="Payments" icon={<CreditCardIcon className="w-6 h-6" />} />
        <NavItem tabName="repairs" label="Repairs" icon={<WrenchScrewdriverIcon className="w-6 h-6" />} />
      </nav>
    </div>
  );
};

export default App;