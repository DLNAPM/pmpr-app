import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Tab } from '../App';
import { UserCircleIcon, ShareIcon, QuestionMarkCircleIcon, UsersIcon, DocumentChartBarIcon, BellIcon } from '../components/Icons';
import Card, { CardContent } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';

interface AccountScreenProps {
  onNavigate: (tab: Tab) => void;
  onOpenShare: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
}

const AccountScreen: React.FC<AccountScreenProps> = ({ onNavigate, onOpenShare, onOpenHelp, onLogout }) => {
  const { user, authStatus, isReadOnly } = useAuth();
  const { notifications } = useAppContext();

  const unacknowledgedCount = React.useMemo(() => {
    if (!user) return 0;
    return notifications.filter(n => n.recipientEmail.toLowerCase() === user.email.toLowerCase() && !n.isAcknowledged).length;
  }, [notifications, user]);

  const menuItems = [
    { label: 'Contractors', icon: UsersIcon, tab: 'contractors' as Tab, badge: 0 },
    { label: 'Reporting', icon: DocumentChartBarIcon, tab: 'reporting' as Tab, badge: 0 },
    { label: 'Notifications', icon: BellIcon, tab: 'notifications' as Tab, badge: unacknowledgedCount },
  ];
  
  const actionItems = [
    { label: 'Share Data', icon: ShareIcon, action: onOpenShare, requiresAuth: true, requiresOwner: true },
    { label: 'Help', icon: QuestionMarkCircleIcon, action: onOpenHelp, requiresAuth: false, requiresOwner: false },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Account</h2>

      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <UserCircleIcon className="w-16 h-16 text-slate-400" />
            <div className="flex-1">
              <p className="text-xl font-semibold">{user?.name || 'Guest User'}</p>
              <p className="text-sm text-slate-500">{user?.email || 'guest@local.com'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">More Sections</h3>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <ul className="divide-y divide-gray-200">
                {menuItems.map(item => (
                    <li key={item.tab}>
                        <button onClick={() => onNavigate(item.tab)} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50">
                           <div className="flex items-center gap-4">
                                <item.icon className="w-6 h-6 text-slate-500" />
                                <span className="font-medium text-gray-800">{item.label}</span>
                           </div>
                           {item.badge > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{item.badge}</span>}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Actions</h3>
         <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <ul className="divide-y divide-gray-200">
                {actionItems.map(item => {
                    if (item.requiresAuth && authStatus === 'guest') return null;
                    if (item.requiresOwner && isReadOnly) return null;
                    return (
                        <li key={item.label}>
                            <button onClick={item.action} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50">
                                <item.icon className="w-6 h-6 text-slate-500" />
                                <span className="font-medium text-gray-800">{item.label}</span>
                            </button>
                        </li>
                    );
                })}
                 {authStatus !== 'guest' && (
                    <li>
                        <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-500"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                            <span className="font-medium text-red-600">Logout</span>
                        </button>
                    </li>
                 )}
            </ul>
        </div>
      </div>

    </div>
  );
};

export default AccountScreen;
