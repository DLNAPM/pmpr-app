
import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Tab } from '../App';
import { UserCircleIcon, ShareIcon, QuestionMarkCircleIcon, UsersIcon, DocumentChartBarIcon, BellIcon, ArrowUpTrayIcon, CheckCircleIcon, BuildingOfficeIcon, TrashIcon, PlusIcon } from '../components/Icons';
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
  const [companyPhone, setCompanyPhone] = useState(user?.companyPhone || '');
  const [companyLogo, setCompanyLogo] = useState(user?.companyLogo || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const unacknowledgedCount = React.useMemo(() => {
    if (!user) return 0;
    return notifications.filter(n => n.recipientEmail.toLowerCase() === user.email.toLowerCase() && !n.isAcknowledged).length;
  }, [notifications, user]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) { // 500kb limit
        alert("Logo file is too large. Please select an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setCompanyLogo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          await updateProfile({ companyName, companyAddress, companyPhone, companyLogo });
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
    <div className="max-w-5xl mx-auto pb-10">
      <h2 className="text-3xl font-extrabold text-slate-900 mb-8">Account & Profile</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              {/* User Identity Card */}
              <Card className="border-none shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-visible relative">
                <CardContent className="pt-8 pb-8 px-8">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="bg-white/20 p-1 rounded-full backdrop-blur-sm shadow-xl relative group">
                      {companyLogo ? (
                        <img src={companyLogo} className="w-24 h-24 rounded-full object-cover border-2 border-white/50" alt="Company Logo" />
                      ) : (
                        <UserCircleIcon className="w-24 h-24 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-2xl font-bold">{companyName || user?.name || 'Guest User'}</p>
                      <p className="text-blue-100 opacity-90">{user?.email || 'guest@local.com'}</p>
                      <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                        {authStatus === 'authenticated' && !isReadOnly && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white border border-white/30">
                            <CheckCircleIcon className="w-3.5 h-3.5 mr-1" /> Cloud Account
                          </span>
                        )}
                        {isReadOnly && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">
                             Viewer Access
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Profile Section */}
              {authStatus === 'authenticated' && !isReadOnly && (
                <Card className="shadow-lg border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-8">
                      <div className="flex items-center gap-3">
                        <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                        <h3 className="font-bold text-xl text-slate-800 tracking-tight">Company Profile & Branding</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <p className="text-sm text-slate-500 mb-8 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                           <QuestionMarkCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                           <span>This information acts as your professional header on <strong>Monthly Rental Statements</strong> and other tenant communications.</span>
                        </p>
                        <form onSubmit={handleSaveProfile} className="space-y-8">
                            <div className="flex flex-col sm:flex-row gap-8 items-start">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Company Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                                            {companyLogo ? (
                                                <img src={companyLogo} className="w-full h-full object-cover" alt="Preview" />
                                            ) : (
                                                <BuildingOfficeIcon className="w-10 h-10 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                                            >
                                                Upload Logo
                                            </button>
                                            {companyLogo && (
                                                <button 
                                                    type="button" 
                                                    onClick={removeLogo}
                                                    className="px-4 py-2 text-sm font-bold text-red-600 hover:text-red-700 text-left flex items-center gap-1"
                                                >
                                                    <TrashIcon className="w-4 h-4" /> Remove
                                                </button>
                                            )}
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleLogoUpload} 
                                                accept="image/*" 
                                                className="hidden" 
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 italic">Best results with square images. PNG/JPG under 500KB.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Company Name</label>
                                    <input 
                                        type="text" 
                                        value={companyName} 
                                        onChange={(e) => setCompanyName(e.target.value)} 
                                        placeholder="e.g., C&SH Group Properties, LLC"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Business Phone</label>
                                    <input 
                                        type="tel" 
                                        value={companyPhone} 
                                        onChange={(e) => setCompanyPhone(e.target.value)} 
                                        placeholder="000-000-0000"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Business Address</label>
                                <textarea 
                                    value={companyAddress} 
                                    onChange={(e) => setCompanyAddress(e.target.value)} 
                                    placeholder="Street, City, ST ZIP"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none resize-none"
                                />
                            </div>
                            <div className="flex items-center justify-between pt-4">
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:bg-blue-300 flex items-center gap-2"
                                >
                                    {isSaving ? 'Saving Changes...' : 'Save Profile & Branding'}
                                </button>
                                {saveSuccess && (
                                    <span className="text-green-600 font-bold flex items-center gap-1.5 animate-pulse">
                                        <CheckCircleIcon className="w-5 h-5" /> All Changes Saved
                                    </span>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
              )}
          </div>

          {/* Sidebar Navigation */}
          <div className="space-y-6">
              {authStatus === 'authenticated' && !isReadOnly && hasGuestData && (
                <Card className="border-blue-200 bg-blue-50 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className="bg-blue-100 p-4 rounded-full shadow-inner">
                        <ArrowUpTrayIcon className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-900 text-lg">Unsynced Data Detected</h3>
                        <p className="text-sm text-blue-700 mt-1">You have property records stored in this browser. Move them to your cloud account to sync across all devices.</p>
                      </div>
                      <button 
                        onClick={migrateGuestData}
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        {isLoading ? 'Processing...' : 'Migrate to Cloud'}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  <div className="px-6 py-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Management tools</h4>
                  </div>
                  {menuItems.map(item => (
                      <button key={item.tab} onClick={() => onNavigate(item.tab)} className="w-full flex justify-between items-center px-6 py-5 text-left hover:bg-blue-50 transition-colors group">
                         <div className="flex items-center gap-4">
                              <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <item.icon className="w-6 h-6" />
                              </div>
                              <span className="font-bold text-slate-700">{item.label}</span>
                         </div>
                         {item.badge > 0 && <span className="bg-red-500 text-white text-xs font-black rounded-full h-6 w-6 flex items-center justify-center shadow-lg shadow-red-200">{item.badge}</span>}
                      </button>
                  ))}
                  {actionItems.map(item => {
                      if (item.requiresAuth && authStatus === 'guest') return null;
                      if (item.requiresOwner && isReadOnly) return null;
                      return (
                          <button key={item.label} onClick={item.action} className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-blue-50 transition-colors group">
                              <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <item.icon className="w-6 h-6" />
                              </div>
                              <span className="font-bold text-slate-700">{item.label}</span>
                          </button>
                      );
                  })}
                   {authStatus !== 'idle' && (
                      <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-red-50 transition-colors group border-t border-slate-100 mt-2">
                          <div className="p-2 bg-red-50 rounded-lg text-red-500 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                          </div>
                          <span className="font-bold text-red-600">Logout Session</span>
                      </button>
                   )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default AccountScreen;
