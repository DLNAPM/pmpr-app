import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCircleIcon } from '../components/Icons';
import { DBOwner } from '../types';

const DatabaseSelectionScreen: React.FC = () => {
    const { user, sharedDbs, selectDb, logout } = useAuth();

    if (!user) return null;

    const allOptions: DBOwner[] = [
        { id: user.id, name: user.name, email: user.email },
        ...sharedDbs
    ];

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white shadow-xl rounded-2xl p-8 text-center">
                    <h1 className="text-2xl font-bold text-blue-800 mb-2">Select a Database</h1>
                    <p className="text-gray-600 mb-8">Choose which database you would like to view.</p>

                    <div className="space-y-3">
                        {allOptions.map((dbOwner, index) => (
                            <button
                                key={dbOwner.id}
                                onClick={() => selectDb(dbOwner)}
                                className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg text-left hover:bg-slate-50 hover:border-blue-400 transition-colors duration-200"
                            >
                                <UserCircleIcon className="w-10 h-10 text-gray-400 flex-shrink-0" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800">
                                        {index === 0 ? "My Database" : `${dbOwner.name}'s Database`}
                                    </p>
                                    <p className="text-sm text-gray-500">{dbOwner.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    <button onClick={logout} className="mt-8 text-sm text-gray-500 hover:text-blue-600">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSelectionScreen;