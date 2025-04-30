import React from 'react';
import BurnPanelComponent from './BurnPanel/BurnPanel';
import './BurnPanel/BurnPanel.css';
import { BurnPanelProvider } from './BurnPanel/BurnPanelContext';

/**
 * BurnPanel - Main component for burning XEN and XBURN tokens
 * This is a wrapper component that imports the refactored BurnPanel
 * from the BurnPanel directory.
 */
const BurnPanel = () => {
  return (
    <div className="burn-container">
      {/* <FireParticles width="100%" height="100%" intensity={0.3} isBackground={true} type="xburn" /> Removed */}
      <BurnPanelProvider>
        <BurnPanelComponent />
      </BurnPanelProvider>
    </div>
  );
};

export default BurnPanel;
