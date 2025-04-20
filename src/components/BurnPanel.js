import React from 'react';
import BurnPanelComponent from './BurnPanel/BurnPanel';
import FireParticles from './FireParticles';
import './BurnPanel.css';

/**
 * BurnPanel - Main component for burning XEN and XBURN tokens
 * This is a wrapper component that imports the refactored BurnPanel
 * from the BurnPanel directory.
 */
const BurnPanel = () => {
  return (
    <div className="burn-container">
      <FireParticles width="100%" height="100%" intensity={0.3} isBackground={true} type="xburn" />
      <BurnPanelComponent />
    </div>
  );
};

export default BurnPanel;
