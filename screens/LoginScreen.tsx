
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  GoogleIcon, 
  QuestionMarkCircleIcon, 
  ChartPieIcon, 
  CreditCardIcon, 
  WrenchScrewdriverIcon, 
  BuildingOfficeIcon, 
  CheckCircleIcon 
} from '../components/Icons';
import HelpModal from '../components/HelpModal';

const LoginScreen: React.FC = () => {
  const { signInWithGoogle, continueAsGuest } = useAuth();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100">
      {/* Navigation */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg p-1.5">
                  <BuildingOfficeIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">PMPR App</span>
           </div>
           <button 
             onClick={() => setIsHelpModalOpen(true)} 
             className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1"
           >
              <QuestionMarkCircleIcon className="w-4 h-4" />
              <span>About</span>
           </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                Property Management <br className="hidden sm:block"/>
                <span className="text-blue-600">Simplified & Streamlined.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed">
                The modern way to track payments, manage repairs, and generate financial reports for your rental properties.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto px-4">
                 <button 
                    onClick={signInWithGoogle}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 py-3.5 px-8 bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
                >
                    <GoogleIcon className="w-5 h-5"/>
                    <span className="font-semibold text-slate-700">Sign in with Google</span>
                </button>
                <button 
                    onClick={continueAsGuest}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-8 bg-blue-600 text-white font-semibold rounded-full shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30 transition-all duration-200"
                >
                    <span>Try Guest Demo</span>
                    <span aria-hidden="true">&rarr;</span>
                </button>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span>Free to use</span>
                </div>
                 <div className="flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span>No credit card required</span>
                </div>
            </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-50 py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-base font-semibold text-blue-600 uppercase tracking-wide">Powerful Features</h2>
                <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">Everything you need to manage your portfolio</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                {/* Feature 1 */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                        <CreditCardIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Payment Tracking</h3>
                    <p className="text-slate-600">
                        Effortlessly record rent and utility payments. Send professional email receipts to tenants instantly and track outstanding balances month-over-month.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
                        <ChartPieIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Financial Analytics</h3>
                    <p className="text-slate-600">
                        Get a clear view of your cash flow. Interactive dashboards show you collection rates, property health scores, and detailed financial breakdowns.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                        <WrenchScrewdriverIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Maintenance & Repairs</h3>
                    <p className="text-slate-600">
                        Log repair requests, assign contractors, and track expenses. Keep a history of all maintenance work performed on your properties.
                    </p>
                </div>
            </div>
        </div>
      </section>

       {/* Footer */}
       <footer className="bg-white py-12 border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-500">PMPR App</span>
                </div>
                <p className="text-slate-400 text-sm">© {new Date().getFullYear()} C&SH Group Properties, LLC. All rights reserved.</p>
            </div>
       </footer>

      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
};

export default LoginScreen;
