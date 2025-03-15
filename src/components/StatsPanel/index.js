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

  // Fetch additional stats when account changes
  useEffect(() => {
    if (account) {
      loadBalances();
      loadStats();
    }
  }, [account, loadBalances, loadStats]);

  return (
    <div className="stats-panel-container">
      <div className="stats-panel">
        <div className="stats-header">
          <h2>USER STATS & INFO</h2>
        </div>
        
        <div className="stats-grid">
          <div className="stat-boxes">
            {/* XEN Stats */}
            <div className="stat-box xen">
              <div className="stat-content">
                <div className="stat-title">XEN Balance</div>
                <div className="stat-value">{formatNumber(displayStats.xenBalance)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.6} type="xen" />
            </div>
            
            <div className="stat-box xen">
              <div className="stat-content">
                <div className="stat-title">XEN Approved</div>
                <div className="stat-value">{formatNumber(displayStats.xenApproval)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.6} type="xen" />
            </div>
            
            <div className="stat-box xen">
              <div className="stat-content">
                <div className="stat-title">User XEN 🔥</div>
                <div className="stat-value">{formatNumber(displayStats.userXenBurned)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.6} type="xen" />
            </div>
            
            {/* XBURN Stats */}
            <div className="stat-box xburn">
              <div className="stat-content">
                <div className="stat-title">XBURN Balance</div>
                <div className="stat-value">{formatNumber(displayStats.xburnBalance)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.7} type="xburn" />
            </div>
            
            <div className="stat-box xburn">
              <div className="stat-content">
                <div className="stat-title">XBURN Approved</div>
                <div className="stat-value">{formatNumber(displayStats.xburnApproval)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.7} type="xburn" />
            </div>
            
            <div className="stat-box xburn">
              <div className="stat-content">
                <div className="stat-title">User XBURN 🔥</div>
                <div className="stat-value">{formatNumber(displayStats.userXburnBurned)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.7} type="xburn" />
            </div>
            
            {/* Supply Stats */}
            <div className="stat-box supply">
              <div className="stat-content">
                <div className="stat-title">XEN Supply</div>
                <div className="stat-value">{formatNumber(displayStats.xenSupply)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.5} type="supply" />
            </div>
            
            <div className="stat-box supply">
              <div className="stat-content">
                <div className="stat-title">XBURN Supply</div>
                <div className="stat-value">{formatNumber(displayStats.xburnSupply)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.5} type="supply" />
            </div>
            
            <div className="stat-box supply">
              <div className="stat-content">
                <div className="stat-title">Contract</div>
                <div className="stat-value">
                  <a 
                    href="https://sepolia.etherscan.io/address/0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="stat-value link"
                  >
                    $XBURN
                  </a>
                </div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.5} type="supply" />
            </div>
            
            {/* Pool Stats */}
            <div className="stat-box pool">
              <div className="stat-content">
                <div className="stat-title">XEN in Pool</div>
                <div className="stat-value">{formatNumber(displayStats.xenInPool)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.6} type="pool" />
            </div>
            
            <div className="stat-box pool">
              <div className="stat-content">
                <div className="stat-title">XBURN in Pool</div>
                <div className="stat-value">{formatNumber(displayStats.xburnInPool)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.6} type="pool" />
            </div>
            
            <div className="stat-box pool">
              <div className="stat-content">
                <div className="stat-title">XEN per XBURN</div>
                <div className="stat-value">{formatNumber(displayStats.xenPerXburn, true)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.6} type="pool" />
            </div>
            
            {/* Global Stats */}
            <div className="stat-box global">
              <div className="stat-content">
                <div className="stat-title">Global XEN 🔥</div>
                <div className="stat-value">{formatNumber(displayStats.globalXenBurned)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.8} type="global" />
            </div>
            
            <div className="stat-box global">
              <div className="stat-content">
                <div className="stat-title">Global XBURN 🔥</div>
                <div className="stat-value">{formatNumber(displayStats.globalXburnBurned)}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.8} type="global" />
            </div>
            
            <div className="stat-box ratio">
              <div className="stat-content">
                <div className="stat-title">Burn Ratio</div>
                <div className="stat-value">{displayStats.burnRatio}</div>
              </div>
              <FireParticles width="100%" height="100%" intensity={0.8} type="global" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel; 