import React, { createContext, useState, useContext } from 'react';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'alert', // 'alert' or 'confirm'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = (title, message) => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setAlertState((prev) => ({ ...prev, isOpen: false }));
          resolve(true); // Resolves the promise when OK is clicked
        },
        onCancel: null,
      });
    });
  };

  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setAlertState((prev) => ({ ...prev, isOpen: false }));
          resolve(true); // Resolves true if confirmed
        },
        onCancel: () => {
          setAlertState((prev) => ({ ...prev, isOpen: false }));
          resolve(false); // Resolves false if canceled
        },
      });
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Global Alert Modal UI */}
      {alertState.isOpen && (
        <div className="as-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="as-modal-content" style={{ maxWidth: '400px', padding: 0, overflow: 'hidden' }}>
            
            <div className="as-modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{alertState.title}</h2>
            </div>
            
            <div className="as-modal-body" style={{ padding: '24px', fontSize: '0.95rem', color: '#374151', lineHeight: '1.5' }}>
              {alertState.message}
            </div>
            
            <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {alertState.type === 'confirm' && (
                <button 
                  className="as-btn-ghost" 
                  onClick={alertState.onCancel}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
              )}
              <button 
                className="approve-btn" 
                onClick={alertState.onConfirm}
                style={{ 
                  padding: '8px 16px', 
                  background: alertState.type === 'confirm' ? '#0d7a55' : '#2563eb', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {alertState.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>

          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};