
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import PropertiesScreen from './screens/PropertiesScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import RepairsScreen from './screens/RepairsScreen';
import ReportingScreen from './screens/ReportingScreen';
import ContractorsScreen from './screens/ContractorsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AccountScreen from './screens/AccountScreen';
import { BuildingOfficeIcon, ChartPieIcon, CreditCardIcon, WrenchScrewdriverIcon, UserCircleIcon, DocumentChartBarIcon, QuestionMarkCircleIcon, UsersIcon, ShareIcon, BellIcon, ArrowUpTrayIcon } from './components/Icons';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import HelpModal from './components/HelpModal';
import ShareDataModal from './screens/ShareDataModal';
import DatabaseSelectionScreen from './screens/DatabaseSelectionScreen';
import { useAppContext } from './contexts/AppContext';
import Modal from './components/Modal';

export type Tab = 'dashboard' | 'properties' | 'payments' | 'repairs' | 'contractors' | 'reporting' | 'notifications' | 'account';
export type ReportFilter = { 
  status?: 'all' | 'collected' | 'outstanding';
  repairStatus?: 'all' | 'open' | 'completed';
};
export type EditTarget = { type: 'payment' | 'repair', id: string };

const App: React.FC = () => {
  const { authStatus, user, isReadOnly, logout, activeDbOwner } = useAuth();
  const { notifications, hasGuestData, migrateGuestData, clearGuestData, isLoading } = useAppContext();
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

  const desktopNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartPieIcon },
    { id: 'properties', label: 'Properties', icon: BuildingOfficeIcon },
    { id: 'payments', label: 'Payments', icon: CreditCardIcon },
    { id: 'repairs', label: 'Repairs', icon: WrenchScrewdriverIcon },
    { id: 'contractors', label: 'Contractors', icon: UsersIcon },
    { id: 'reporting', label: 'Reporting', icon: DocumentChartBarIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon, badge: unacknowledgedCount },
  ];

  const mobileNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartPieIcon },
    { id: 'properties', label: 'Properties', icon: BuildingOfficeIcon },
    { id: 'payments', label: 'Payments', icon: CreditCardIcon },
    { id: 'repairs', label: 'Repairs', icon: WrenchScrewdriverIcon },
    { id: 'account', label: 'Account', icon: UserCircleIcon, badge: unacknowledgedCount > 0 ? 'dot' : 0 },
  ];
  
  if (authStatus === 'idle' || authStatus === 'loading') {
    return <LoginScreen />;
  }
  if (authStatus === 'selecting_db') {
    return <DatabaseSelectionScreen />;
  }
  
  const revision = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `rev.${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }, []);

  return (
    <>
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-slate-800 text-white flex-col">
          <div className="px-6 py-4 border-b border-slate-700">
            <h1 className="text-2xl font-bold tracking-tight">PMPR</h1>
            <p className="text-xs text-slate-400">Property Management</p>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {desktopNavItems.map(item => (
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
                   <button onClick={() => setIsShareModalOpen(true)} title="Share Your Properties (Read-Only)" className="w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-700 hover:text-white">
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

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative">
          {isLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-30 flex items-center justify-center">
                  <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-semibold text-slate-700 tracking-tight">Connecting to cloud database...</p>
                  </div>
              </div>
          )}
          <div className="p-6">
            {isReadOnly && activeDbOwner && (
                <div className="bg-yellow-400 text-yellow-900 text-center text-sm font-semibold p-2 rounded-lg mb-6">
                    You are viewing {activeDbOwner.name}'s ({activeDbOwner.email}) database in Read-Only mode.
                </div>
            )}
            {activeTab === 'dashboard' && <DashboardScreen onAction={handleAction} onNavigateToReport={handleNavigateToReport} />}
            {activeTab === 'properties' && <PropertiesScreen action={action} onActionDone={handleActionDone} />}
            {activeTab === 'payments' && <PaymentsScreen action={action} editTarget={editTarget} onActionDone={handleActionDone} />}
            {activeTab === 'repairs' && <RepairsScreen action={action} editTarget={editTarget} onActionDone={handleActionDone} />}
            {activeTab === 'contractors' && <ContractorsScreen />}
            {activeTab === 'reporting' && <ReportingScreen initialFilter={reportFilter} onFilterApplied={onFilterApplied} onEditItem={handleEditItem} />}
            {activeTab === 'notifications' && <NotificationsScreen />}
            {activeTab === 'account' && <AccountScreen onNavigate={setActiveTab} onOpenShare={() => setIsShareModalOpen(true)} onOpenHelp={() => setIsHelpModalOpen(true)} onLogout={logout} />}
          </div>
        </main>
      </div>
      
      {/* Footer */}
      <footer className="w-full bg-gray-100 p-4 text-xs text-gray-500 flex justify-between items-center border-t md:pl-72">
        <span>© 2025 C&SH Group Properties, LLC. Created for free using Google AIStudio and Render.com</span>
        <span>{revision}</span>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 text-white flex justify-around border-t border-slate-700">
        {mobileNavItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={`flex flex-col items-center justify-center p-2 w-full ${activeTab === item.id ? 'text-blue-400' : 'text-slate-400'}`}
          >
            <div className="relative">
              <item.icon className="h-6 w-6"/>
              {item.badge === 'dot' && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-800"></span>}
            </div>
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
    
    {/* Modals and Audio */}
    {isHelpModalOpen && <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />}
    {isShareModalOpen && <ShareDataModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />}
    
    {/* Automatic Migration Modal for Cloud Users with Local Data */}
    {authStatus === 'authenticated' && !isReadOnly && hasGuestData && (
        <Modal 
          isOpen={true} 
          onClose={() => {}} // Non-closable to force decision
          title="Data Found in Browser"
        >
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <ArrowUpTrayIcon className="w-10 h-10 text-blue-600" />
                    <p className="text-sm text-blue-900 leading-relaxed font-medium">
                        We found property data stored locally in this browser. Would you like to sync it to your Google Cloud account so you can access it from any device?
                    </p>
                </div>
                <div className="flex flex-col gap-2 pt-4">
                    <button 
                      onClick={migrateGuestData}
                      disabled={isLoading}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:bg-slate-300"
                    >
                        {isLoading ? 'Syncing...' : 'Sync Data to Cloud Now'}
                    </button>
                    <button 
                      onClick={clearGuestData}
                      disabled={isLoading}
                      className="w-full py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        Ignore and Start Fresh
                    </button>
                </div>
                <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest pt-2">
                    Applies to all devices logged into {user?.email}
                </p>
            </div>
        </Modal>
    )}

    <audio ref={audioRef} src="data:audio/mpeg;base64,SUQzBAAAAAAAI..."></audio>
    </>
  );
};

export default App;
