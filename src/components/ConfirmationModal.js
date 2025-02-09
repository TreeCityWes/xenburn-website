import React from 'react';

export function ConfirmationModal({ isOpen, onClose, onConfirm, amount }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Confirm Burn</h3>
        <p>Are you sure you want to burn <span className="highlight">{amount} CBXEN</span>?</p>
        <p className="modal-note">This action cannot be undone.</p>
        
        <div className="modal-actions">
          <button 
            className="action-button cancel-button" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="action-button burn-button" 
            onClick={onConfirm}
          >
            Confirm Burn
          </button>
        </div>
      </div>
    </div>
  );
} 