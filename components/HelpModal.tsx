
import React from 'react';
import Modal from './Modal';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-lg font-semibold text-blue-800 mb-2">{title}</h3>
    <div className="space-y-2 text-gray-700">{children}</div>
  </div>
);

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to PMPR App!">
      <div className="space-y-6">
        <HelpSection title="What is this App?">
          <p>
            The Property Management Payment Recording (PMPR) App is a tool designed to help landlords and property managers
            easily track properties, tenants, monthly payments, and repair requests.
          </p>
        </HelpSection>

        <HelpSection title="How to Use the App">
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Dashboard:</strong> Get a quick overview of your finances, property health scores, and quick actions to add new data.
            </li>
            <li>
              <strong>Properties:</strong> Add new properties you manage, including tenant details, lease information, and which utilities to track.
            </li>
            <li>
              <strong>Payments:</strong> Select a property and record monthly payments for rent and utilities. You can enter both the billed amount and the amount paid.
            </li>
            <li>
              <strong>Repairs:</strong> Log maintenance and repair requests for your properties. Track their status, cost, contractor information, and key dates.
            </li>
            <li>
              <strong>Reporting:</strong> A powerful tool to filter and view all your financial data. Search by date, property, tenant, or payment type to see detailed reports and totals.
            </li>
          </ul>
        </HelpSection>

        <HelpSection title="Guest vs. Google Sign-In">
          <p>
            <strong>Continue as Guest:</strong> All data you enter is saved directly in your web browser. It is not available on other devices and will be lost if you clear your browser's data.
          </p>
          <p>
            <strong>Sign in with Google:</strong> This allows you to save your data to the cloud (feature coming soon!). You'll be able to access your property information from any device, anywhere.
          </p>
        </HelpSection>

        <div className="pt-4 text-center">
            <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
                Got it!
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default HelpModal;
