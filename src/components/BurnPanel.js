import React from 'react';
import BurnPanelComponent from './BurnPanel/BurnPanel';
import './BurnPanel.css';

/**
 * BurnPanel - Main component for burning XEN and XBURN tokens
 * This is a wrapper component that imports the refactored BurnPanel
 * from the BurnPanel directory.
 */
const BurnPanel = () => {
  return (
    <div className="burn-container">
      <BurnPanelComponent />
    </div>
  );
};

export default BurnPanel;
