

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleIcon, QuestionMarkCircleIcon } from '../components/Icons';
import HelpModal from '../components/HelpModal';

const LoginScreen: React.FC = () => {
  const { signInWithGoogle, continueAsGuest, isGoogleSignInConfigured } = useAuth();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white shadow-xl rounded-2xl p-8 text-center relative">
            <button onClick={() => setIsHelpModalOpen(true)} className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 transition-colors" aria-label="Help">
                <QuestionMarkCircleIcon className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-blue-800 tracking-tight mb-2">PMPR App</h1>
            <p className="text-gray-600 mb-8">Your Property Management Hub</p>

            <div className="space-y-4">
                <button 
                    onClick={signInWithGoogle}
                    disabled={!isGoogleSignInConfigured}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <GoogleIcon className="w-6 h-6"/>
                    <span className="font-medium text-gray-700">Sign in with Google</span>
                </button>
                {!isGoogleSignInConfigured && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-md">
                        Google Sign-In is not configured. Please contact the administrator or continue as a guest.
                    </p>
                )}

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">
                        OR
                        </span>
                    </div>
                </div>

                <button 
                    onClick={continueAsGuest}
                    className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                    Continue as Guest
                </button>
            </div>

            <p className="text-xs text-gray-400 mt-8">
                Guest data is stored only in this browser. Sign in to save and access your data from anywhere.
            </p>
        </div>
      </div>
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
};

export default LoginScreen;
