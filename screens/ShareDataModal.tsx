import React, { useState } from 'react';
import Modal from '../components/Modal';
import { useAppContext } from '../contexts/AppContext';
import { XMarkIcon } from '../components/Icons';

interface ShareDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareDataModal: React.FC<ShareDataModalProps> = ({ isOpen, onClose }) => {
  const { myShares, addShare, deleteShare } = useAppContext();
  const [viewerEmail, setViewerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerEmail) return;
    
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(viewerEmail)) {
        setError('Please enter a valid email address.');
        return;
    }
    setError('');
    setIsLoading(true);
    try {
        await addShare(viewerEmail);
        setViewerEmail(''); // Clear input on success
    } catch (err) {
        console.error("Error sharing data:", err);
        setError('An error occurred. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
      if (window.confirm("Are you sure you want to revoke access for this user?")) {
          try {
              await deleteShare(shareId);
          } catch (err) {
              console.error("Error revoking access:", err);
              alert("Failed to revoke access. Please try again.");
          }
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share My Data">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Invite a Viewer</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter the Google email address of the user you want to grant read-only access to your database.
          </p>
          <form onSubmit={handleShare} className="flex items-center gap-2">
            <input
              type="email"
              value={viewerEmail}
              onChange={(e) => setViewerEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="flex-grow p-2 border rounded-md"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isLoading ? 'Sharing...' : 'Share'}
            </button>
          </form>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Currently Shared With</h3>
            {myShares.length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                    {myShares.map(share => (
                        <li key={share.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <span className="text-gray-700">{share.viewerEmail}</span>
                            <button onClick={() => handleRevoke(share.id)} className="text-red-500 hover:text-red-700">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-sm">You have not shared your database with anyone.</p>
            )}
        </div>
        
        <div className="pt-4 text-right">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">
                Done
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareDataModal;
