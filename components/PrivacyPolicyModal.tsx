import React from 'react';
import Modal from './Modal';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy">
      <div className="space-y-4 text-sm text-slate-600">
        <p>
          By using "PMPR App", you agree to the terms outlined in this Privacy Policy.
        </p>
        <p>
          <strong>1. Information We Collect</strong><br/>
          We collect information you provide directly to us, such as when you create or modify your account, use our services, request customer support, or otherwise communicate with us. This information may include: name, email address, property details, tenant information, financial records, and other information you choose to provide.
        </p>
        <p>
          <strong>2. How We Use Your Information</strong><br/>
          We use the information we collect to provide, maintain, and improve our services, such as to process transactions, send you related information, and provide customer support.
        </p>
        <p>
          <strong>3. Sharing of Information</strong><br/>
          We do not share your personal information with third parties except as described in this privacy policy or with your consent.
        </p>
        <p>
          <strong>4. Security</strong><br/>
          We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
        </p>
        <p>
          <strong>5. Changes to this Policy</strong><br/>
          We may change this privacy policy from time to time. If we make changes, we will notify you by revising the date at the top of the policy and, in some cases, we may provide you with additional notice.
        </p>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Accept & Return
        </button>
      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;
