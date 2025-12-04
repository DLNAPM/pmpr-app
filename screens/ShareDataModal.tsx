import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Share, Property } from '../types';
import { TrashIcon } from '../components/Icons';

interface ShareDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareDataModal: React.FC<ShareDataModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { properties, getSharesByOwner, findUserByEmail, addShare, deleteShare } = useAppContext();
  
  const [shares, setShares] = useState<Share[]>([]);
  const [viewerEmail, setViewerEmail] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const userOwnedProperties = useMemo(() => {
    if (!user) return [];
    return properties.filter(p => p.userId === user.id);
  }, [properties, user]);

  useEffect(() => {
    if (isOpen && user) {
      setIsLoading(true);
      getSharesByOwner()
        .then(setShares)
        .catch(err => console.error("Failed to fetch shares", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, getSharesByOwner, user]);

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user || !viewerEmail) {
        setError("Please enter a user's email.");
        return;
    }
    if (selectedProperties.length === 0) {
        setError("Please select at least one property to share.");
        return;
    }
    if (viewerEmail.toLowerCase() === user.email.toLowerCase()) {
        setError("You cannot share properties with yourself.");
        return;
    }

    const viewer = await findUserByEmail(viewerEmail.toLowerCase());
    if (!viewer) {
        setError("User not found. Please ensure they have logged into PMPR App with their Google account at least once.");
        return;
    }

    setIsLoading(true);
    try {
        const sharePromises = selectedProperties.map(propId => {
            const property = userOwnedProperties.find(p => p.id === propId);
            if (!property) return Promise.resolve();
            // Avoid creating duplicate shares
            if (shares.some(s => s.viewerId === viewer.id && s.propertyId === propId)) {
                return Promise.resolve();
            }

            return addShare({
                ownerId: user.id,
                ownerName: user.name,
                ownerEmail: user.email,
                viewerEmail: viewer.email,
                viewerId: viewer.id,
                propertyId: propId,
                propertyName: property.name,
            });
        });
        await Promise.all(sharePromises);
        
        const updatedShares = await getSharesByOwner();
        setShares(updatedShares);
        setViewerEmail('');
        setSelectedProperties([]);
    } catch (err) {
        console.error("Failed to add share:", err);
        setError("An error occurred while sharing. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
      try {
          await deleteShare(shareId);
          setShares(prev => prev.filter(s => s.id !== shareId));
      } catch (err) {
          console.error("Failed to revoke share:", err);
          alert("An error occurred while revoking access.");
      }
  };

  const sharesByViewer = useMemo(() => {
    return shares.reduce((acc, share) => {
      const viewerEmail = share.viewerEmail;
      if (!acc[viewerEmail]) {
        acc[viewerEmail] = [];
      }
      acc[viewerEmail].push(share);
      return acc;
    }, {} as Record<string, Share[]>);
  }, [shares]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Properties (Read-Only)">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Select properties and invite others to view their data in a secure, read-only mode.
          </p>
          <form onSubmit={handleShare} className="space-y-4 p-4 border rounded-lg bg-slate-50">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">1. Select Properties to Share</label>
                <div className="max-h-40 overflow-y-auto space-y-2 border p-3 rounded-md bg-white">
                    {userOwnedProperties.map(prop => (
                        <label key={prop.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedProperties.includes(prop.id)}
                                onChange={() => handlePropertyToggle(prop.id)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{prop.name}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
                <label htmlFor="viewerEmail" className="block text-sm font-medium text-gray-700 mb-1">2. Enter User's Google Email</label>
                <div className="flex items-center gap-2">
                    <input id="viewerEmail" type="email" value={viewerEmail} onChange={(e) => setViewerEmail(e.target.value)} placeholder="viewer@example.com" required className="flex-grow p-2 border rounded-md" />
                    <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                      {isLoading ? 'Sharing...' : 'Share'}
                    </button>
                </div>
            </div>
           {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </form>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Currently Shared:</h3>
          {isLoading ? ( <p>Loading...</p> ) : Object.keys(sharesByViewer).length > 0 ? (
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {Object.entries(sharesByViewer).map(([email, viewerShares]) => (
                <div key={email} className="p-3 bg-slate-50 rounded-md">
                    <p className="font-semibold text-gray-800">{email}</p>
                    <ul className="list-disc list-inside pl-2 mt-1 text-sm text-gray-600">
                        {viewerShares.map(share => (
                            <li key={share.id} className="flex justify-between items-center">
                                <span>{share.propertyName}</span>
                                <button onClick={() => handleRevoke(share.id)} className="text-red-400 hover:text-red-600" aria-label={`Revoke access for ${share.propertyName}`}>
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
              ))}
            </div>
          ) : ( <p className="text-gray-500 text-sm">You haven't shared any properties yet.</p> )}
        </div>
        
        <div className="pt-4 text-right">
            <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md shadow-sm hover:bg-gray-300">
                Done
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareDataModal;
