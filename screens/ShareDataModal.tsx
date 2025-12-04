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
  const { getSharesByOwner, findUserByEmail, addShare, deleteShare } = useAppContext();
  
  const [shares, setShares] = useState<Share[]>([]);
  const [viewerEmail, setViewerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      setIsLoading(true);
      getSharesByOwner()
        .then(setShares)
        .catch(err => console.error("Failed to fetch shares", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, getSharesByOwner, user]);


  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user || !viewerEmail) {
        setError("Please enter a user's email.");
        return;
    }
    if (viewerEmail.toLowerCase() === user.email.toLowerCase()) {
        setError("You cannot share your database with yourself.");
        return;
    }
    if (shares.some(s => s.viewerEmail.toLowerCase() === viewerEmail.toLowerCase())) {
        setError("You have already shared your database with this user.");
        return;
    }


    const viewer = await findUserByEmail(viewerEmail.toLowerCase());
    if (!viewer) {
        setError("User not found. Please ensure they have logged into PMPR App with their Google account at least once.");
        return;
    }

    setIsLoading(true);
    try {
        await addShare({
            ownerId: user.id,
            ownerName: user.name,
            ownerEmail: user.email,
            viewerEmail: viewer.email,
            viewerId: viewer.id,
        });
        
        const updatedShares = await getSharesByOwner();
        setShares(updatedShares);
        setViewerEmail('');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Share Your Database (Read-Only)">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Invite others to view your entire database in a secure, read-only mode. They will be able to see all properties, payments, and repairs.
          </p>
          <form onSubmit={handleShare} className="space-y-4 p-4 border rounded-lg bg-slate-50">
            <div>
                <label htmlFor="viewerEmail" className="block text-sm font-medium text-gray-700 mb-1">Enter User's Google Email</label>
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
          <h3 className="font-semibold text-gray-800 mb-2">Currently Shared With:</h3>
          {isLoading ? ( <p>Loading...</p> ) : shares.length > 0 ? (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {shares.map(share => (
                <li key={share.id} className="flex justify-between items-center p-2 bg-slate-100 rounded-md">
                    <span className="text-sm font-medium">{share.viewerEmail}</span>
                    <button onClick={() => handleRevoke(share.id)} className="text-red-500 hover:text-red-700" aria-label={`Revoke access for ${share.viewerEmail}`}>
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </li>
              ))}
            </ul>
          ) : ( <p className="text-gray-500 text-sm">You haven't shared your database with anyone yet.</p> )}
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
