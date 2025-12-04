import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCircleIcon } from '../components/Icons';

const DatabaseSelectionScreen: React.FC = () => {
  const { user, sharesForMe, selectDbOwner, logout } = useAuth();

  // If the user lands here but shouldn't, select their own DB by default
  useEffect(() => {
    if (user && sharesForMe.length === 0) {
      selectDbOwner({ id: user.id, name: user.name, email: user.email });
    }
  }, [user, sharesForMe, selectDbOwner]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Authenticating...</p>
      </div>
    );
  }

  const handleSelectOwnDb = () => {
    selectDbOwner({ id: user.id, name: user.name, email: user.email });
  };

  const handleSelectSharedDb = (share: any) => {
    selectDbOwner({ id: share.ownerId, name: share.ownerName, email: share.ownerEmail });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-2xl p-8">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-blue-800">Select a Database</h1>
                <p className="text-gray-600 mt-2">Choose which property database you would like to view.</p>
            </div>
            
            <div className="mt-8 space-y-4">
                <button 
                    onClick={handleSelectOwnDb}
                    className="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-4"
                >
                    <UserCircleIcon className="w-10 h-10 text-blue-500 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-blue-800">My Database</p>
                        <p className="text-sm text-blue-600">{user.email}</p>
                    </div>
                </button>

                {sharesForMe.length > 0 && (
                    <>
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                Shared With Me
                                </span>
                            </div>
                        </div>
                        {sharesForMe.map(share => (
                            <button 
                                key={share.id}
                                onClick={() => handleSelectSharedDb(share)}
                                className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-4"
                            >
                                <UserCircleIcon className="w-10 h-10 text-slate-500 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-slate-800">{share.ownerName}'s Database</p>
                                    <p className="text-sm text-slate-600">{share.ownerEmail}</p>
                                </div>
                            </button>
                        ))}
                    </>
                )}
            </div>
            <div className="text-center mt-8">
                <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600 transition-colors">
                    Logout
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSelectionScreen;
