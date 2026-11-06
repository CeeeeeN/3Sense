import React, { createContext, useState, useContext, useEffect } from 'react';

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

  // 1. Lock the scroll of the page when modal is active
  useEffect(() => {
    if (alertState.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [alertState.isOpen]);

  const showAlert = (title, message) => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setAlertState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
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
          resolve(true);
        },
        onCancel: () => {
          setAlertState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  const handleBackdropClick = () => {
    if (alertState.type === 'confirm') {
      alertState.onCancel?.();
    } else {
      alertState.onConfirm?.();
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Global Alert Modal UI */}
      {alertState.isOpen && (
        /* 2. Backdrop click handler closes the modal */
        <div 
          className="as-modal-overlay" 
          style={{ zIndex: 9999 }}
          onClick={handleBackdropClick}
        >
          {/* stopPropagation prevents clicks inside the card from closing it */}
          <div 
            className="as-modal-content" 
            style={{ maxWidth: '400px', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* 3. Header title changed to color: '#ffffff' */}
            <div className="as-modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
                {alertState.title}
              </h2>
            </div>
            
            <div className="as-modal-body" style={{ padding: '24px', fontSize: '0.95rem', color: '#374151', lineHeight: '1.5' }}>
              {alertState.message}
            </div>
            
            <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {alertState.type === 'confirm' && (
                <button 
                  type="button"
                  className="as-btn-ghost" 
                  onClick={alertState.onCancel}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
              )}
              <button 
                type="button"
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