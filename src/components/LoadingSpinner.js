import React from 'react';
import './LoadingSpinner.css';

export function LoadingSpinner({ size = 'medium' }) {
  return (
    <div className={`spinner-container ${size}`}>
      <div className="spinner"></div>
    </div>
  );
} 