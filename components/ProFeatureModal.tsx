import React from 'react';
import Modal from './Modal';
import { ShieldCheckIcon } from './Icons';

interface ProFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

const ProFeatureModal: React.FC<ProFeatureModalProps> = ({ isOpen, onClose, featureName }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Premium Feature">
      <div className="text-center space-y-4 py-4">
        <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
          <ShieldCheckIcon className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">PRO Required</h3>
        <p className="text-slate-600">
          The <strong>{featureName}</strong> feature is part of our Premium (PRO) Services. 
          Please upgrade your account to access this functionality.
        </p>
        <div className="pt-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ProFeatureModal;
