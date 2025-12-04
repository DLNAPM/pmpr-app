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

  const userOwnedProperties = useMemo(() => properties.filter(p => p.userId === user?.id), [properties, user]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getSharesByOwner()
        .then(setShares)
        .catch(err => console.error("Failed to fetch shares", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, getSharesByOwner]);

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) ? prev.filter(id => id !== propertyId) : [...prev, propertyId]
    );
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user || !viewerEmail || selectedProperties.length === 0) {
        setError("Please enter an email and select at least one property to share.");
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

    try {
        for (const propId of selectedProperties) {
            const property = userOwnedProperties.find(p => p.id === propId);
            if (!property) continue;
            
            // Check if this specific property is already shared with this user
            const alreadyShared = shares.some(s => s.viewerEmail.toLowerCase() === viewerEmail.toLowerCase() && s.propertyId === propId);
            if (alreadyShared) continue;

            await addShare({
                ownerId: user.id,
                ownerName: user.name,
                ownerEmail: user.email,
                viewerEmail: viewer.email,
                viewerId: viewer.id,
                propertyId: propId,
                propertyName: property.name,
            });
        }
        const updatedShares = await getSharesByOwner();
        setShares(updatedShares);
        setViewerEmail('');
        setSelectedProperties([]);
    } catch (err) {
        console.error("Failed to add share:", err);
        setError("An error occurred. Please try again.");
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

  const groupedShares = useMemo(() => {
    return shares.reduce((acc, share) => {
      if(!acc[share.viewerEmail]) {
        acc[share.viewerEmail] = [];
      }
      acc[share.viewerEmail].push(share);
      return acc;
    }, {} as Record<string, Share[]>);
  }, [shares]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Properties (Read-Only)">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Select properties and invite others to view them in a secure, read-only mode.
          </p>
          <form onSubmit={handleShare} className="space-y-4 p-4 border rounded-lg bg-slate-50">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">1. Select Properties to Share</label>
                <div className="max-h-40 overflow-y-auto space-y-1 p-2 border rounded-md bg-white">
                    {userOwnedProperties.map(prop => (
                        <label key={prop.id} className="flex items-center p-1.5 rounded hover:bg-slate-100">
                            <input type="checkbox" checked={selectedProperties.includes(prop.id)} onChange={() => handlePropertyToggle(prop.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-800">{prop.name}</span>
                        </label>
                    ))}
                </div>
            </div>
             <div>
                <label htmlFor="viewerEmail" className="block text-sm font-medium text-gray-700 mb-1">2. Enter User's Google Email</label>
                <div className="flex items-center gap-2">
                    <input id="viewerEmail" type="email" value={viewerEmail} onChange={(e) => setViewerEmail(e.target.value)} placeholder="viewer@example.com" required className="flex-grow p-2 border rounded-md" />
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Share
                    </button>
                </div>
            </div>
           {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </form>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Currently Shared:</h3>
          {isLoading ? ( <p>Loading...</p> ) : Object.keys(groupedShares).length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {Object.entries(groupedShares).map(([email, shareList]) => (
                <div key={email} className="p-3 bg-slate-50 rounded-md">
                    <p className="font-semibold text-gray-700">{email}</p>
                    <ul className="mt-1 space-y-1 pl-2">
                        {shareList.map(share => (
                            <li key={share.id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">&bull; {share.propertyName}</span>
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
