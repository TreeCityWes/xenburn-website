import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export function LoadingOverlay({ message }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <LoadingSpinner size="large" />
        <p>{message}</p>
      </div>
    </div>
  );
} 