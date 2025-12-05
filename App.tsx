
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import PropertiesScreen from './screens/PropertiesScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import RepairsScreen from './screens/RepairsScreen';
import ReportingScreen from './screens/ReportingScreen';
import ContractorsScreen from './screens/ContractorsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import { BuildingOfficeIcon, ChartPieIcon, CreditCardIcon, WrenchScrewdriverIcon, UserCircleIcon, DocumentChartBarIcon, QuestionMarkCircleIcon, UsersIcon, ShareIcon, BellIcon } from './components/Icons';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import HelpModal from './components/HelpModal';
import ShareDataModal from './screens/ShareDataModal';
import DatabaseSelectionScreen from './screens/DatabaseSelectionScreen';
import { useAppContext } from './contexts/AppContext';

type Tab = 'dashboard' | 'properties' | 'payments' | 'repairs' | 'contractors' | 'reporting' | 'notifications';
export type ReportFilter = { 
  status?: 'all' | 'collected' | 'outstanding';
  repairStatus?: 'all' | 'open' | 'completed';
};
export type EditTarget = { type: 'payment' | 'repair', id: string };

const App: React.FC = () => {
  const { authStatus, user, isReadOnly, logout, activeDbOwner } = useAuth();
  const { notifications } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [reportFilter, setReportFilter] = useState<ReportFilter | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const unacknowledgedCount = useMemo(() => {
    if (!user) return 0;
    return notifications.filter(n => n.recipientEmail.toLowerCase() === user.email.toLowerCase() && !n.isAcknowledged).length;
  }, [notifications, user]);

  const handleAction = (tab: Tab, action?: string) => {
    setAction(action || null);
    setActiveTab(tab);
  };
  
  const handleEditItem = (target: EditTarget) => {
    setEditTarget(target);
    setActiveTab(target.type === 'payment' ? 'payments' : 'repairs');
  }

  const handleActionDone = () => {
    setAction(null);
    setEditTarget(null);
  };
  
  const handleNavigateToReport = (filter: ReportFilter) => {
    setReportFilter(filter);
    setActiveTab('reporting');
  };

  const onFilterApplied = useCallback(() => {
    setReportFilter(null);
  }, []);
  
  // Custom hook to play notification sound
  useEffect(() => {
    const playSound = () => {
      audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
    };
    window.addEventListener('play-notification-sound', playSound);
    return () => {
      window.removeEventListener('play-notification-sound', playSound);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartPieIcon },
    { id: 'properties', label: 'Properties', icon: BuildingOfficeIcon },
    { id: 'payments', label: 'Payments', icon: CreditCardIcon },
    { id: 'repairs', label: 'Repairs', icon: WrenchScrewdriverIcon },
    { id: 'contractors', label: 'Contractors', icon: UsersIcon },
    { id: 'reporting', label: 'Reporting', icon: DocumentChartBarIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon, badge: unacknowledgedCount },
  ];

  if (authStatus === 'idle' || authStatus === 'loading') {
    return <LoginScreen />;
  }
  if (authStatus === 'selecting_db') {
    return <DatabaseSelectionScreen />;
  }

  return (
    <>
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-slate-800 text-white flex flex-col">
        <div className="px-6 py-4 border-b border-slate-700">
          <h1 className="text-2xl font-bold tracking-tight">PMPR</h1>
          <p className="text-xs text-slate-400">Property Management</p>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors group ${activeTab === item.id ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
            >
              <item.icon className={`mr-3 h-6 w-6 ${activeTab === item.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && item.badge > 0 && <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-2 py-2">
            <UserCircleIcon className="w-10 h-10 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{user?.name || 'Guest User'}</p>
              <p className="text-xs text-slate-400">{user?.email || 'guest@local.com'}</p>
              {isReadOnly && activeDbOwner && <p className="text-xs text-yellow-400 font-bold">Viewing: {activeDbOwner.name}</p>}
            </div>
          </div>
          <div className="mt-2 space-y-2">
             {!isReadOnly && user && (
                 <button onClick={() => setIsShareModalOpen(true)} className="w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-700 hover:text-white">
                    <ShareIcon className="w-5 h-5 mr-3"/>
                    Share Data
                </button>
             )}
             <button onClick={() => setIsHelpModalOpen(true)} className="w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-700 hover:text-white">
                <QuestionMarkCircleIcon className="w-5 h-5 mr-3"/>
                Help
            </button>
          </div>
          {authStatus !== 'guest' && (
            <button onClick={logout} className="mt-2 w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-red-800 rounded-md">Logout</button>
          )}
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'dashboard' && <DashboardScreen onAction={handleAction} onNavigateToReport={handleNavigateToReport} />}
        {activeTab === 'properties' && <PropertiesScreen action={action} onActionDone={handleActionDone} />}
        {activeTab === 'payments' && <PaymentsScreen action={action} editTarget={editTarget} onActionDone={handleActionDone} />}
        {activeTab === 'repairs' && <RepairsScreen action={action} editTarget={editTarget} onActionDone={handleActionDone} />}
        {activeTab === 'contractors' && <ContractorsScreen />}
        {activeTab === 'reporting' && <ReportingScreen initialFilter={reportFilter} onFilterApplied={onFilterApplied} onEditItem={handleEditItem} />}
        {activeTab === 'notifications' && <NotificationsScreen />}
      </main>
    </div>
    {isHelpModalOpen && <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />}
    {isShareModalOpen && <ShareDataModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />}
    {isReadOnly && activeDbOwner && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 text-center text-sm font-semibold p-2 z-50">
            You are viewing {activeDbOwner.name}'s ({activeDbOwner.email}) database in Read-Only mode.
        </div>
    )}
    <footer className="w-full bg-slate-100 p-4 text-xs text-gray-500 text-center">
      © 2025 C&SH Group Properties, LLC. Created for free using Google AIStudio and Render.com
    </footer>
     <audio ref={audioRef} src="data:audio/mpeg;base64,SUQzBAAAAAAAI..."></audio>
    </>
  );
};

export default App;
