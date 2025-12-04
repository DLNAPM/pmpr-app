import React, { useState } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import PropertiesScreen from './screens/PropertiesScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import RepairsScreen from './screens/RepairsScreen';
import ReportingScreen from './screens/ReportingScreen';
import ContractorsScreen from './screens/ContractorsScreen';
import { BuildingOfficeIcon, ChartPieIcon, CreditCardIcon, WrenchScrewdriverIcon, UserCircleIcon, DocumentChartBarIcon, QuestionMarkCircleIcon, UsersIcon, ShareIcon } from './components/Icons';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import HelpModal from './components/HelpModal';
import DatabaseSelectionScreen from './screens/DatabaseSelectionScreen';
import ShareDataModal from './screens/ShareDataModal';

type Tab = 'dashboard' | 'properties' | 'payments' | 'repairs' | 'contractors' | 'reporting';
export type ReportFilter = { 
  status?: 'all' | 'collected' | 'outstanding';
  repairStatus?: 'all' | 'open' | 'completed';
};
export type EditTarget = { type: 'payment' | 'repair', id: string };


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [action, setAction] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [initialReportFilter, setInitialReportFilter] = useState<ReportFilter | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const { authStatus, user, logout, isReadOnly, isOwner, activeDbOwner } = useAuth();

  if (authStatus === 'idle' || authStatus === 'loading') {
    return <LoginScreen />;
  }
  
  if (authStatus === 'selecting_db') {
      return <DatabaseSelectionScreen />;
  }

  const handleAction = (tab: Tab, actionName: string = 'add') => {
    setActiveTab(tab);
    setAction(actionName);
  };
  
  const handleNavigateToReport = (filter: ReportFilter) => {
    setInitialReportFilter(filter);
    setActiveTab('reporting');
  };

  const handleEditFromReport = (target: EditTarget) => {
    setEditTarget(target);
    setActiveTab(target.type === 'payment' ? 'payments' : 'repairs');
  };

  const onActionDone = () => {
    setAction(null);
    setEditTarget(null);
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen onAction={handleAction} onNavigateToReport={handleNavigateToReport} />;
      case 'properties':
        return <PropertiesScreen action={action} onActionDone={onActionDone} />;
      case 'payments':
        return <PaymentsScreen action={action} editTarget={editTarget} onActionDone={onActionDone} />;
      case 'repairs':
        return <RepairsScreen action={action} editTarget={editTarget} onActionDone={onActionDone} />;
      case 'contractors':
        return <ContractorsScreen />;
      case 'reporting':
        return <ReportingScreen 
                  initialFilter={initialReportFilter} 
                  onFilterApplied={() => setInitialReportFilter(null)} 
                  onEditItem={handleEditFromReport}
                />;
      default:
        return <DashboardScreen onAction={handleAction} onNavigateToReport={handleNavigateToReport} />;
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

  const SideNavItem: React.FC<{ tabName: Tab; label: string; icon: React.ReactElement<{ className?: string }> }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center w-full px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors duration-200 ${
        activeTab === tabName ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-slate-200 hover:text-gray-900'
      }`}
    >
      {React.cloneElement(icon, { className: 'w-5 h-5 mr-3 flex-shrink-0' })}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800 flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-800 tracking-tight">PMPR App</h1>
            <div className="flex items-center gap-4">
               {isOwner && authStatus === 'authenticated' && (
                 <button onClick={() => setIsShareModalOpen(true)} className="text-gray-500 hover:text-blue-600 transition-colors" aria-label="Share Data">
                     <ShareIcon className="w-6 h-6" />
                 </button>
               )}
               <button onClick={() => setIsHelpModalOpen(true)} className="text-gray-500 hover:text-blue-600 transition-colors" aria-label="Help">
                   <QuestionMarkCircleIcon className="w-6 h-6" />
               </button>
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
        {isReadOnly && (
            <div className="bg-yellow-100 border-t border-b border-yellow-200 text-yellow-800 text-sm text-center py-1.5 px-4">
                You are viewing <strong>{activeDbOwner?.name}'s</strong> ({activeDbOwner?.email}) database in Read-Only mode.
            </div>
        )}
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-grow w-full">
        <aside className="hidden md:block w-56 flex-shrink-0 py-8 pr-8">
            <nav className="space-y-1">
                <SideNavItem tabName="dashboard" label="Dashboard" icon={<ChartPieIcon />} />
                <SideNavItem tabName="properties" label="Properties" icon={<BuildingOfficeIcon />} />
                <SideNavItem tabName="payments" label="Payments" icon={<CreditCardIcon />} />
                <SideNavItem tabName="repairs" label="Repairs" icon={<WrenchScrewdriverIcon />} />
                <SideNavItem tabName="contractors" label="Contractors" icon={<UsersIcon />} />
                <SideNavItem tabName="reporting" label="Reporting" icon={<DocumentChartBarIcon />} />
            </nav>
        </aside>
        
        <main className="flex-1 min-w-0 py-8 pb-24 md:pb-8">
          {renderContent()}
        </main>
      </div>
      
      <footer className="w-full text-center text-xs text-gray-500 py-4 pb-20 md:py-4">
        © 2025 C&SH Group Properties, LLC. Created for free using Google AIStudio and Render.com
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg flex justify-around md:hidden">
        <NavItem tabName="dashboard" label="Dashboard" icon={<ChartPieIcon className="w-6 h-6" />} />
        <NavItem tabName="properties" label="Properties" icon={<BuildingOfficeIcon className="w-6 h-6" />} />
        <NavItem tabName="payments" label="Payments" icon={<CreditCardIcon className="w-6 h-6" />} />
        <NavItem tabName="repairs" label="Repairs" icon={<WrenchScrewdriverIcon className="w-6 h-6" />} />
        <NavItem tabName="contractors" label="Contractors" icon={<UsersIcon className="w-6 h-6" />} />
      </nav>
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      {isOwner && <ShareDataModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />}
    </div>
  );
};

export default App;