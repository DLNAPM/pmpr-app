import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card, { CardContent } from '../components/Card';
import { UserCircleIcon } from '../components/Icons';

const DatabaseSelectionScreen: React.FC = () => {
  const { user, sharedDbs, setActiveDbOwner, logout } = useAuth();

  if (!user) return null;

  const handleSelectDb = (ownerId: string, ownerName: string, ownerEmail: string) => {
    setActiveDbOwner({ id: ownerId, name: ownerName, email: ownerEmail });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Select a Database</h1>
        <p className="text-gray-600 mb-8">Choose which database you would like to view.</p>
        
        <div className="space-y-4">
          <Card onClick={() => handleSelectDb(user.id, user.name, user.email)} className="text-left">
            <CardContent className="flex items-center gap-4">
              <UserCircleIcon className="w-10 h-10 text-blue-500" />
              <div>
                <p className="font-semibold text-lg">My Database</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </CardContent>
          </Card>
          
          {sharedDbs.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-700 my-4">Shared With Me</h2>
              {sharedDbs.map(share => (
                <Card key={share.id} onClick={() => handleSelectDb(share.ownerId, share.ownerName, share.ownerEmail)} className="text-left mb-4">
                  <CardContent className="flex items-center gap-4">
                    <UserCircleIcon className="w-10 h-10 text-gray-400" />
                    <div>
                      <p className="font-semibold text-lg">{share.ownerName}'s Database</p>
                      <p className="text-sm text-gray-500">{share.ownerEmail}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <button onClick={logout} className="mt-8 text-sm text-gray-500 hover:text-blue-600">
          Logout
        </button>
      </div>
    </div>
  );
};

export default DatabaseSelectionScreen;