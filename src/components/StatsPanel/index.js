import React from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import { useGlobalData } from '../../context/GlobalDataContext';
import FireParticles from '../FireParticles';
import './StatsPanel.css';

// Format large numbers with K, M, B, T suffixes and improved decimal handling
const formatNumber = (num, options = {}) => {
  const { isRatio = false, isApproved = false, maxDecimals = 2 } = options;
  // Add logging
  console.log(`formatNumber Input: num=${num}, type=${typeof num}, options=`, options);

  if (isApproved && typeof num === 'string' && num === 'MAX') {
    return 'MAX';
  }

  if (num === null || num === undefined || num === 'NaN' || num === '') {
      // console.log("formatNumber: Handled null/undefined/NaN/empty");
      return isRatio ? '0.000000' : '0.00';
  }

  let numberString = String(num); // Work with the string representation
  numberString = numberString.replace(/,/g, ''); 

  const n = parseFloat(numberString);
  
  if (isNaN(n)) {
      // console.warn("formatNumber received NaN for input:", num);
      return isRatio ? '0.000000' : '0.00';
  }
  console.log(`formatNumber Parsed n: ${n}`);

  // Handle specific cases first
  if (isRatio) {
      // console.log(`formatNumber Output (Ratio): ${n.toFixed(6)}`);
      return n.toFixed(6);
  }

  // Suffix formatting with adjusted decimals
  if (n >= 1e12) {
      const val = `${(n / 1e12).toFixed(maxDecimals)}T`;
      console.log(`formatNumber Output (T): ${val}`);
      return val;
  }
  if (n >= 1e9) {
      const val = `${(n / 1e9).toFixed(maxDecimals)}B`;
      console.log(`formatNumber Output (B): ${val}`);
      return val;
  }
  if (n >= 1e6) {
      const val = `${(n / 1e6).toFixed(maxDecimals)}M`;
      console.log(`formatNumber Output (M): ${val}`);
      return val;
  }
  if (n >= 1e3) {
      const val = `${(n / 1e3).toFixed(maxDecimals)}K`;
      console.log(`formatNumber Output (K): ${val}`);
      return val;
  }

  // Default formatting for smaller numbers - use dynamic decimals
  const dynamicDecimals = n === 0 ? 2 : Math.max(2, Math.min(6, maxDecimals + (n < 1 ? 4 : 0))); 
  const val = n.toLocaleString(undefined, {
    minimumFractionDigits: 2, 
    maximumFractionDigits: dynamicDecimals 
  });
  console.log(`formatNumber Output (Default): ${val}`);
  return val;
};

const StatsPanel = () => {
  const { xenApprovalRaw, xburnApprovalRaw } = useWallet();
  const { 
      balances, 
      stats: globalStatsData, 
      xenPrice, 
      xburnPrice,
      poolTvl
  } = useGlobalData();

  // Simplify state access
  const stats = globalStatsData?.data || {};

  // Format approved values safely
  const formatApproval = (rawApproval) => {
    if (!rawApproval) return '0';
    try {
      const formatted = ethers.utils.formatUnits(rawApproval, 18);
      // Check if it's effectively MAX_UINT256
      if (parseFloat(formatted) > 1e18) return 'MAX';
      return formatNumber(formatted);
    } catch {
      return '0'; // Handle potential errors during formatting
    }
  };

  // Helper to render a single stat item - Pass maxDecimals option
  const renderStatItem = (label, value, className = '', maxDecimals = 2) => (
    <div className={`stat-item ${className}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{typeof value === 'string' && value.startsWith('$') ? value : formatNumber(value, { maxDecimals })}</span>
    </div>
  );

  // Helper to render a section - Reinstated
  const renderSection = (title, children) => (
    <div className="stats-section">
      <h4 className="section-title">{title}</h4>
      <div className="section-content">
        {children}
      </div>
    </div>
  );

  // Calculate ratio
  const calculateRatio = () => {
    const xen = parseFloat(stats.xenInPool?.replace(/,/g, '') || '0');
    const xburn = parseFloat(stats.xburnInPool?.replace(/,/g, '') || '0');
    if (xen > 0 && xburn > 0) {
      return (xen / xburn).toFixed(6);
    }
    return '0.000000';
  };

  return (
    <div className="stats-panel-container-redesigned">
      <div className="stats-panel-card">
        {/* Use FireParticles component for background */}
        <FireParticles width="100%" height="100%" intensity={0.15} isBackground={true} />

        <div className="stats-header">
          <h2>PROTOCOL STATISTICS</h2>
        </div>

        <div className="stats-content-area">
          {renderSection("User Wallet & Burn Activity", (
            <>
              {renderStatItem("cbXEN Balance", balances?.xen || '0')}
              {renderStatItem("cbXEN Approved", formatApproval(xenApprovalRaw))}
              {renderStatItem("User cbXEN Burned", stats.userXenBurned || '0', 'highlight-burn', 2)}
              {renderStatItem("XBURN Balance", balances?.xburn || '0')}
              {renderStatItem("XBURN Approved", formatApproval(xburnApprovalRaw))}
              {renderStatItem("User XBURN Burned", stats.userXburnBurned || '0', 'highlight-burn', 4)}
            </>
          ))}

          {renderSection("Token & Pool Info", (
            <>
              {renderStatItem("cbXEN Price", `$${parseFloat(xenPrice || '0').toPrecision(6)}`)}
              {renderStatItem("XBURN Price", `$${parseFloat(xburnPrice || '0').toFixed(6)}`)}
              {renderStatItem("LP cbXEN", stats.xenInPool || '0', '', 2)}
              {renderStatItem("LP XBURN", stats.xburnInPool || '0', '', 4)}
              {renderStatItem("cbXEN per XBURN", calculateRatio(), '', 6)}
              {renderStatItem("LP Value", `$${formatNumber(poolTvl || '0')}`)}
            </>
          ))}

          {renderSection("Global Burn & Supply Stats", (
            <>
              {renderStatItem("Total cbXEN Burned", stats.totalXenBurned || '0', 'highlight-burn', 2)}
              {renderStatItem("Total XBURN Burned", stats.totalXburnBurned || '0', 'highlight-burn', 4)}
              {renderStatItem("Total XBURN Supply", stats.totalXburnMinted || '0', '', 4)}
            </>
          ))}
        </div>
      </div>

      {/* Dex Screener Embed - Updated */}
      <div className="dexscreener-container">
        {/* Use style tag directly as provided */}
        <style>{`#dexscreener-embed{position:relative;width:100%;padding-bottom:125%;}@media(min-width:1400px){#dexscreener-embed{padding-bottom:65%;}}#dexscreener-embed iframe{position:absolute;width:100%;height:100%;top:0;left:0;border:0;}`}</style>
        <div id="dexscreener-embed">
          {/* Use iframe tag directly as provided */}
          <iframe src="https://dexscreener.com/base/0x93e39bd6854D960a0C4F5b592381bB8356a2D725?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartDefaultOnMobile=1&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=15"></iframe>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel; 