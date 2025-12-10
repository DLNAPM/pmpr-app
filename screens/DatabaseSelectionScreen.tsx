
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card, { CardContent } from '../components/Card';
import { UserCircleIcon } from '../components/Icons';

const DatabaseSelectionScreen: React.FC = () => {
  const { user, sharedDbOwners, selectDb } = useAuth();

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  const handleSelectOwn = () => {
    selectDb({ id: user.id, name: user.name, email: user.email });
  };
  
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Select a Database</h1>
        <p className="text-gray-600 mb-8">Choose which database you would like to view.</p>
        
        <div className="space-y-4">
            <Card onClick={handleSelectOwn} className="text-left">
                <CardContent className="flex items-center gap-4">
                    <UserCircleIcon className="w-10 h-10 text-blue-600"/>
                    <div>
                        <p className="font-semibold text-lg">My Database</p>
                        <p className="text-sm text-gray-500">View and manage your own properties.</p>
                    </div>
                </CardContent>
            </Card>
            
            {sharedDbOwners.length > 0 && (
                <div className="pt-4">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Shared With Me</h2>
                     {sharedDbOwners.map(owner => (
                        <Card key={owner.id} onClick={() => selectDb(owner)} className="text-left mb-4">
                            <CardContent className="flex items-center gap-4">
                                <UserCircleIcon className="w-10 h-10 text-gray-500"/>
                                <div>
                                    <p className="font-semibold text-lg">{owner.name}'s Database</p>
                                    <p className="text-sm text-gray-500">View shared properties from {owner.email} (Read-Only).</p>
                                </div>
                            </CardContent>
                        </Card>
                     ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseSelectionScreen;
