import React, { useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const { saveFirebaseConfig } = useAuth();
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    if (!configJson.trim()) {
      setError('Configuration cannot be empty.');
      return;
    }

    try {
      const config = JSON.parse(configJson);
      // Basic validation for required Firebase keys
      if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
        throw new Error('Invalid Firebase config object. Missing required keys like "apiKey", "authDomain", "projectId", or "appId".');
      }
      saveFirebaseConfig(config);
      // The page will reload after this, closing the modal automatically.
    } catch (e) {
      if (e instanceof Error) {
        setError(`Invalid JSON or configuration: ${e.message}`);
      } else {
        setError('An unknown error occurred while parsing the configuration.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Firebase Connection">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          To enable Google Sign-In, please paste your Firebase web app configuration object below. You can find this in your Firebase project settings under "SDK setup and configuration".
        </p>
        <div>
          <label htmlFor="firebaseConfigJson" className="block text-sm font-medium text-gray-700 mb-1">
            Firebase Config (JSON)
          </label>
          <textarea
            id="firebaseConfigJson"
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            rows={10}
            className="w-full p-2 border rounded font-mono text-sm bg-slate-50 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`{\n  "apiKey": "AIza...",\n  "authDomain": "your-project.firebaseapp.com",\n  "projectId": "your-project",\n  ...\n}`}
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
            Save & Connect
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FirebaseConfigModal;