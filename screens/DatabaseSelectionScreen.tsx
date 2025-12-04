import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card, { CardContent } from '../components/Card';
import { DBOwner } from '../types';
import { UserCircleIcon } from '../components/Icons';

const DatabaseSelectionScreen: React.FC = () => {
  const { user, sharedDbs, selectDb, logout } = useAuth();

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }
  
  const handleSelect = (owner: DBOwner) => {
    selectDb(owner);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-3xl font-bold text-blue-800 tracking-tight mb-2">Welcome, {user.name}!</h1>
        <p className="text-gray-600 mb-8">Please select a database to view.</p>

        <div className="space-y-4">
          <Card onClick={() => handleSelect(user)} className="text-left">
            <CardContent className="flex items-center gap-4">
              <UserCircleIcon className="w-10 h-10 text-blue-500" />
              <div>
                <h2 className="font-semibold text-lg">My Database</h2>
                <p className="text-sm text-gray-500">Manage your own properties and records.</p>
              </div>
            </CardContent>
          </Card>

          {sharedDbs.length > 0 && (
            <div>
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-slate-100 text-gray-500">
                        Shared With You
                        </span>
                    </div>
                </div>
                <div className="space-y-4">
                    {sharedDbs.map(dbOwner => (
                        <Card key={dbOwner.id} onClick={() => handleSelect(dbOwner)} className="text-left">
                            <CardContent className="flex items-center gap-4">
                                <UserCircleIcon className="w-10 h-10 text-gray-400" />
                                <div>
                                    <h2 className="font-semibold text-lg">{dbOwner.name}'s Database</h2>
                                    <p className="text-sm text-gray-500">View shared data in Read-Only mode.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
          )}
        </div>

        <button onClick={logout} className="mt-8 text-sm text-gray-500 hover:text-gray-700">
          Logout
        </button>
      </div>
    </div>
  );
};

export default DatabaseSelectionScreen;