import React from 'react';
import PropTypes from 'prop-types';

/**
 * TabView - Component for tab navigation in the BurnPanel
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab
 * @param {Function} props.setActiveTab - Function to set active tab
 */
const TabView = ({ activeTab, setActiveTab }) => {
  // Define tab options
  const tabs = [
    { id: 'burnXEN', label: 'Burn XEN' },
    { id: 'burnXBURN', label: 'Burn XBURN' },
    { id: 'swapBurn', label: 'Swap & Burn' },
  ];

  return (
    <div className="tab-view">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

TabView.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired
};

export default TabView; 