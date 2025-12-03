import React from 'react';

// This component is no longer used as the dynamic Firebase configuration feature has been removed
// to simplify the login flow. The app now relies on environment variables for Firebase credentials.
const FirebaseConfigModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = () => {
  return null;
};

export default FirebaseConfigModal;