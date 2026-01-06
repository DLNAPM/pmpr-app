
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Tab } from '../App';
import { UserCircleIcon, ShareIcon, QuestionMarkCircleIcon, UsersIcon, DocumentChartBarIcon, BellIcon, ArrowUpTrayIcon, CheckCircleIcon } from '../components/Icons';
import Card, { CardContent, CardHeader } from '../components/Card';
import { useAppContext } from '../contexts/AppContext';

interface AccountScreenProps {
  onNavigate: (tab: Tab) => void;
  onOpenShare: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
}

const AccountScreen: React.FC<AccountScreenProps> = ({ onNavigate, onOpenShare, onOpenHelp, onLogout }) => {
  const { user, authStatus, isReadOnly, updateProfile } = useAuth();
  const { notifications, migrateGuestData, hasGuestData, isLoading } = useAppContext();

  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [companyAddress, setCompanyAddress] = useState(user?.companyAddress || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const unacknowledgedCount = React.useMemo(() => {
    if (!user) return 0;
    return notifications.filter(n => n.recipientEmail.toLowerCase() === user.email.toLowerCase() && !n.isAcknowledged).length;
  }, [notifications, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          await updateProfile({ companyName, companyAddress, phone });
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
      } catch (e) {
          alert("Failed to save profile.");
      } finally {
          setIsSaving(false);
      }
  };

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
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Account</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <UserCircleIcon className="w-16 h-16 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-xl font-semibold">{user?.name || 'Guest User'}</p>
                      <p className="text-sm text-slate-500">{user?.email || 'guest@local.com'}</p>
                      {authStatus === 'authenticated' && !isReadOnly && (
                        <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Cloud Synced
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {authStatus === 'authenticated' && !isReadOnly && (
                <Card>
                    <CardHeader><h3 className="font-semibold text-lg">Company Information</h3></CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                                <input 
                                    type="text" 
                                    value={companyName} 
                                    onChange={(e) => setCompanyName(e.target.value)} 
                                    placeholder="e.g., C&SH Group Properties, LLC"
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Business Address</label>
                                <textarea 
                                    value={companyAddress} 
                                    onChange={(e) => setCompanyAddress(e.target.value)} 
                                    placeholder="Street, City, ST ZIP"
                                    rows={2}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Business Phone</label>
                                <input 
                                    type="tel" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    placeholder="000-000-0000"
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                {saveSuccess && (
                                    <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                                        <CheckCircleIcon className="w-5 h-5" /> Profile updated
                                    </span>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
              )}
          </div>

          <div className="space-y-6">
              {authStatus === 'authenticated' && !isReadOnly && hasGuestData && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent>
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <ArrowUpTrayIcon className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold text-blue-900">Sync Local Data</h3>
                        <p className="text-xs text-blue-700 mt-1">We detected local data. Migrate it to your Google Cloud account?</p>
                      </div>
                      <button 
                        onClick={migrateGuestData}
                        disabled={isLoading}
                        className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400"
                      >
                        {isLoading ? 'Syncing...' : 'Sync Now'}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Navigation</h3>
              <div className="bg-white rounded-lg shadow-md overflow-hidden divide-y divide-gray-200">
                  {menuItems.map(item => (
                      <button key={item.tab} onClick={() => onNavigate(item.tab)} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50">
                         <div className="flex items-center gap-4">
                              <item.icon className="w-6 h-6 text-slate-500" />
                              <span className="font-medium text-gray-800">{item.label}</span>
                         </div>
                         {item.badge > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{item.badge}</span>}
                      </button>
                  ))}
                  {actionItems.map(item => {
                      if (item.requiresAuth && authStatus === 'guest') return null;
                      if (item.requiresOwner && isReadOnly) return null;
                      return (
                          <button key={item.label} onClick={item.action} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50">
                              <item.icon className="w-6 h-6 text-slate-500" />
                              <span className="font-medium text-gray-800">{item.label}</span>
                          </button>
                      );
                  })}
                   {authStatus !== 'idle' && (
                      <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 group">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-500 group-hover:text-red-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                          <span className="font-medium text-red-600 group-hover:text-red-700">Logout</span>
                      </button>
                   )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default AccountScreen;
