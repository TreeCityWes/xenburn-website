import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import { useGlobalData } from '../../context/GlobalDataContext';
import FireParticles from '../FireParticles';
import './StatsPanel.css';

// Format large numbers with K, M, B, T suffixes and special handling for ratios
const formatNumber = (num, isRatio = false) => {
  if (!num) return isRatio ? '0.031478' : '0.00';
  
  const n = parseFloat(num);
  if (isNaN(n)) return isRatio ? '0.031478' : '0.00';
  
  // Handle scientific notation (e.g., 1.15792089237316e+50B)
  if (String(num).includes('e+')) {
    // Special case for extremely large values (likely MAX_UINT256)
    if (n > 1e20) return "999T+";
    return "999T+";
  }
  
  // Cap at 999T+
  if (n > 999e12) return '999T+';
  
  // Handle large numbers with proper suffixes
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  
  // Special case for ratio
  if (isRatio) {
    return n.toFixed(6);
  }
  
  // For regular numbers
  return n.toFixed(2);
};

const StatsPanel = () => {
  const { 
    account, 
    xenApprovalRaw,
    xburnApprovalRaw
  } = useWallet();

  const {
    balances,
    stats,
    loadStats,
    loadBalances
  } = useGlobalData();

  // State for tracking stats
  const [displayStats, setDisplayStats] = useState({
    xenBalance: '0',
    xenApproval: '0',
    userXenBurned: '0',
    xburnBalance: '0',
    xburnApproval: '0',
    userXburnBurned: '0',
    xenSupply: '0',
    xburnSupply: '0',
    xenInPool: '0',
    xburnInPool: '0',
    globalXenBurned: '0',
    globalXburnBurned: '0',
    xenPerXburn: '0.031478',
    burnRatio: '100,000:1'
  });

  // Update stats when balances or approvals change
  useEffect(() => {
    // Update the stats with the latest values
    setDisplayStats(prevStats => {
      // Format approved values to ensure they're properly handled
      const xenApproval = xenApprovalRaw ? ethers.utils.formatUnits(xenApprovalRaw, 18) : prevStats.xenApproval;
      const xburnApproval = xburnApprovalRaw ? ethers.utils.formatUnits(xburnApprovalRaw, 18) : prevStats.xburnApproval;
      
      return {
        ...prevStats,
        xenBalance: balances?.xen || prevStats.xenBalance,
        xburnBalance: balances?.xburn || prevStats.xburnBalance,
        xenApproval,
        xburnApproval,
        userXenBurned: stats?.data?.userXenBurned || prevStats.userXenBurned,
        userXburnBurned: stats?.data?.userXburnBurned || prevStats.userXburnBurned,
        globalXenBurned: stats?.data?.totalXenBurned || prevStats.globalXenBurned,
        globalXburnBurned: stats?.data?.totalXburnBurned || prevStats.globalXburnBurned,
        xburnSupply: stats?.data?.totalXburnMinted || prevStats.xburnSupply,
        xenSupply: stats?.data?.xenSupply || prevStats.xenSupply,
        xenInPool: stats?.data?.xenInPool || prevStats.xenInPool,
        xburnInPool: stats?.data?.xburnInPool || prevStats.xburnInPool
      };
    });
  }, [balances, stats, xenApprovalRaw, xburnApprovalRaw]);

  // Helper to render a single stat item
  const renderStatItem = (label, value, formatOptions = {}, className = '') => (
    <div className={`stat-item ${className}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{formatNumber(value, formatOptions)}</span>
    </div>
  );

  // Helper to render a section
  const renderSection = (title, children) => (
    <div className="stats-section">
      <h4 className="section-title">{title}</h4>
      <div className="section-content">
        {children}
      </div>
    </div>
  );

  return (
    <div className="stats-panel-container-redesigned">
      <div className="stats-panel-card">
        <FireParticles width={500} height={600} intensity={0.15} isBackground={true} />
        
        <div className="stats-header">
          <h2>USER STATS & INFO</h2>
        </div>
        
        <div className="stats-content-area">
          {renderSection("User Wallet & Burn Activity", (
            <>
              {renderStatItem("XEN Balance", displayStats.xenBalance)}
              {renderStatItem("XEN Approved", displayStats.xenApproval, { isApproved: true })}
              {renderStatItem("User XEN Burned", displayStats.userXenBurned, {}, 'highlight-burn')}
              {renderStatItem("XBURN Balance", displayStats.xburnBalance)}
              {renderStatItem("XBURN Approved", displayStats.xburnApproval, { isApproved: true })}
              {renderStatItem("User XBURN Burned", displayStats.userXburnBurned, {}, 'highlight-burn')}
            </>
          ))}

          {renderSection("Token & Pool Info", (
            <>
              {renderStatItem("XEN Supply", displayStats.xenSupply)}
              {renderStatItem("XBURN Supply", displayStats.xburnSupply)}
              {renderStatItem("XEN in Pool", displayStats.xenInPool)}
              {renderStatItem("XBURN in Pool", displayStats.xburnInPool)}
              {renderStatItem("XEN per XBURN", displayStats.xenPerXburn, { isRatio: true })}
              <div className="stat-item">
                <span className="stat-label">Contract</span>
                <span className="stat-value">
                  <a 
                    href="https://sepolia.etherscan.io/address/0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="stat-value link"
                  >
                    $XBURN
                  </a>
                </span>
              </div>
            </>
          ))}

          {renderSection("Global Burn Stats", (
            <>
              {renderStatItem("Global XEN Burned", displayStats.globalXenBurned, {}, 'highlight-burn')}
              {renderStatItem("Global XBURN Burned", displayStats.globalXburnBurned, {}, 'highlight-burn')}
              {renderStatItem("Burn Ratio", displayStats.burnRatio)}
            </>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPanel; 