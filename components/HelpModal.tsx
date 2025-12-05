
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
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to the PMPR App!">
      <div className="space-y-6">
        <HelpSection title="What is this App?">
          <p>
            The Property Management Payment Recording (PMPR) App is a comprehensive tool designed to help landlords and property managers
            easily track properties, tenants, monthly payments, and repair requests with powerful analytics and collaboration features.
          </p>
        </HelpSection>

        <HelpSection title="Core Features">
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Dashboard:</strong> Get a quick overview of your all-time finances, monthly collection rates, property health scores, and quick actions to add new data.
            </li>
            <li>
              <strong>Properties:</strong> Add and manage properties with multiple tenants, track lease information, and specify which utilities to monitor.
            </li>
            <li>
              <strong>Payments:</strong> Record monthly payments for rent and utilities with detailed notes. Export professional PDF or Excel reports per property.
            </li>
            <li>
              <strong>Repairs:</strong> Log maintenance requests, track their status and cost, and assign contractors.
            </li>
             <li>
              <strong>Contractors:</strong> Maintain a detailed database of your trusted contractors for easy assignment to repair jobs. Import and export your list.
            </li>
            <li>
              <strong>Reporting:</strong> A powerful tool to filter and view all your financial data. Search by date, property, or type, and use the reconcile tool to clean up duplicates.
            </li>
             <li>
              <strong>Notifications:</strong> A built-in messaging system. New users can request access from their landlord, and owners receive alerts for these requests.
            </li>
          </ul>
        </HelpSection>

        <HelpSection title="Collaboration & Sharing (For Google Users)">
            <p>
                <strong>For Property Owners:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Click the "Share" icon in the header to open the sharing menu.</li>
                <li>Select one or more properties you wish to share.</li>
                <li>Enter the Google email of the person you want to share with and grant them read-only access.</li>
                <li>You can view who has access and revoke it at any time from this menu.</li>
            </ul>
             <p className="mt-2">
                <strong>For Viewers (Shared Users):</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li>When you log in, your view will seamlessly include both your own properties and any properties shared with you.</li>
                <li>Shared properties will be clearly marked with "Shared by..." and will be in <strong>Read-Only</strong> mode. You will not be able to edit, delete, or add data for these properties.</li>
            </ul>
        </HelpSection>

        <HelpSection title="Guest vs. Google Sign-In">
          <p>
            <strong>Continue as Guest:</strong> All data you enter is saved directly in your web browser. It is not available on other devices and will be lost if you clear your browser's data.
          </p>
          <p>
            <strong>Sign in with Google:</strong> Your data is saved securely in the cloud via Firebase. You can access and manage your property information from any device. This is required for all sharing and collaboration features.
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
