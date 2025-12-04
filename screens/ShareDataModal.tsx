import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Share } from '../types';
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
  
  const ownedProperties = properties.filter(p => !p.ownerInfo);

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
        prev.includes(propertyId) ? prev.filter(id => id !== propertyId) : [...prev, propertyId]
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
        for (const propertyId of selectedProperties) {
            const property = ownedProperties.find(p => p.id === propertyId);
            if (!property) continue;

            // Check if this specific property is already shared with this user
            if (shares.some(s => s.propertyId === propertyId && s.viewerEmail.toLowerCase() === viewerEmail.toLowerCase())) {
                continue; // Skip if already shared
            }

            await addShare({
                ownerId: user.id,
                ownerName: user.name,
                ownerEmail: user.email,
                viewerEmail: viewer.email,
                viewerId: viewer.id,
                propertyId: property.id,
                propertyName: property.name,
            });
        }
        
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Your Properties (Read-Only)">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Select properties and invite others to view their data in a secure, read-only mode.
          </p>
          <form onSubmit={handleShare} className="space-y-4 p-4 border rounded-lg bg-slate-50">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">1. Select Properties to Share</label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2 bg-white">
                    {ownedProperties.map(prop => (
                        <label key={prop.id} className="flex items-center p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                            <input type="checkbox" checked={selectedProperties.includes(prop.id)} onChange={() => handlePropertyToggle(prop.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-3 text-sm font-medium text-gray-700">{prop.name}</span>
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
          <h3 className="font-semibold text-gray-800 mb-2">Currently Shared Properties:</h3>
          {isLoading ? ( <p>Loading...</p> ) : shares.length > 0 ? (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {shares.map(share => (
                <li key={share.id} className="flex justify-between items-center p-2 bg-slate-100 rounded-md">
                    <div>
                        <p className="text-sm font-medium">{share.propertyName}</p>
                        <p className="text-xs text-gray-500">Shared with: {share.viewerEmail}</p>
                    </div>
                    <button onClick={() => handleRevoke(share.id)} className="text-red-500 hover:text-red-700" aria-label={`Revoke access for ${share.viewerEmail}`}>
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </li>
              ))}
            </ul>
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