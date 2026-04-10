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
    <Modal isOpen={isOpen} onClose={onClose} title="Upgrade to Premium">
      <div className="text-center space-y-4 py-4">
        <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
          <ShieldCheckIcon className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Unlock {featureName}</h3>
        <p className="text-slate-600">
          The <strong>{featureName}</strong> feature is part of our Premium (PRO) Services.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 my-6 shadow-sm">
          <p className="text-blue-900 font-bold text-lg">Limited Time offer of $11.11 /quarterly</p>
          <p className="text-blue-700 text-sm mt-1 font-medium">Includes an 11-Day Free Trial. Cancel anytime.</p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={() => {
              alert("Upgrade flow will be implemented here.");
              onClose();
            }}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-md"
          >
            Upgrade to Premium
          </button>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-semibold border border-slate-200"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ProFeatureModal;
