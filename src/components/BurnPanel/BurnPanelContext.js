import React, { createContext, useState } from 'react';
import { DEFAULT_AMP_START, DEFAULT_AMP_SNAPSHOT } from '../../utils/constants';

/**
 * Context for sharing amplifier values and other data across BurnPanel components
 */
export const BurnPanelContext = createContext({
  ampStart: DEFAULT_AMP_START,
  ampSnapshot: DEFAULT_AMP_SNAPSHOT,
  activeTab: 'burnXEN',
  setActiveTab: () => {}
});

/**
 * Provider component for BurnPanelContext
 */
export const BurnPanelProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('burnXEN');
  
  const contextValue = {
    ampStart: DEFAULT_AMP_START,
    ampSnapshot: DEFAULT_AMP_SNAPSHOT,
    activeTab,
    setActiveTab
  };
  
  return (
    <BurnPanelContext.Provider value={contextValue}>
      {children}
    </BurnPanelContext.Provider>
  );
}; 