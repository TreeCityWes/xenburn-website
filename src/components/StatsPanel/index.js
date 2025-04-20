import React from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import { useGlobalData } from '../../context/GlobalDataContext';
import FireParticles from '../FireParticles';
import './StatsPanel.css';

// Format large numbers with K, M, B, T suffixes and special handling for ratios
const formatNumber = (num, options = {}) => {
  const { isRatio = false, isApproved = false, showFull = false } = options;

  if (isApproved && typeof num === 'string' && num === 'MAX') {
    return 'MAX';
  }

  if (!num || num === 'NaN') return isRatio ? '0.000000' : '0.00';

  // Handle potential BigNumber strings
  let numberString;
  try {
    numberString = ethers.utils.formatUnits(num, 0); // Format as integer first to handle large numbers
    numberString = String(num); // Revert to original string if it wasn't a BigNumber string
  } catch {
    numberString = String(num);
  }

  const n = parseFloat(numberString);
  if (isNaN(n)) return isRatio ? '0.000000' : '0.00';

  if (showFull) {
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 18
    });
  }

  if (n > 999e12) return '999T+';
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3 && !isRatio) return `${(n / 1e3).toFixed(2)}K`;

  if (isRatio) return n.toFixed(6);

  // Default formatting for smaller numbers
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 1 ? 6 : 2
  });
};

const StatsPanel = () => {
  const { xenApprovalRaw, xburnApprovalRaw } = useWallet();
  const { balances, stats: globalStatsData, poolData, xenPrice, xburnPrice } = useGlobalData();

  // Simplify state access
  const stats = globalStatsData?.data || {};
  const pool = poolData?.data || {};

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

  // Helper to render a single stat item - Reinstated
  const renderStatItem = (label, value, formatOptions = {}, className = '') => (
    <div className={`stat-item ${className}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{formatNumber(value, formatOptions)}</span>
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
    const xen = parseFloat(ethers.utils.formatUnits(pool.xenInPool || '0', 18));
    const xburn = parseFloat(ethers.utils.formatUnits(pool.xburnInPool || '0', 18));
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
              {renderStatItem("cbXEN Approved", formatApproval(xenApprovalRaw), { isApproved: true })}
              {renderStatItem("User cbXEN Burned", ethers.utils.formatUnits(stats.userXenBurnedAmount || '0', 18), {}, 'highlight-burn')}
              {renderStatItem("XBURN Balance", balances?.xburn || '0')}
              {renderStatItem("XBURN Approved", formatApproval(xburnApprovalRaw), { isApproved: true })}
              {renderStatItem("User XBURN Burned", ethers.utils.formatUnits(stats.userXburnBurnedAmount || '0', 18), {}, 'highlight-burn')}
            </>
          ))}

          {renderSection("Token & Pool Info", (
            <>
              {renderStatItem("cbXEN Price", `$${parseFloat(xenPrice || '0').toPrecision(6)}`)}
              {renderStatItem("XBURN Price", `$${parseFloat(xburnPrice || '0').toFixed(6)}`)}
              {renderStatItem("LP cbXEN", ethers.utils.formatUnits(pool.xenInPool || '0', 18))}
              {renderStatItem("LP XBURN", ethers.utils.formatUnits(pool.xburnInPool || '0', 18))}
              {renderStatItem("cbXEN per XBURN", calculateRatio(), { isRatio: true })}
              {renderStatItem("LP Value", `$${formatNumber(parseFloat(pool.tvl || '0').toFixed(2))}`)}
            </>
          ))}

          {renderSection("Global Burn & Supply Stats", (
            <>
              {renderStatItem("Total cbXEN Burned", ethers.utils.formatUnits(stats.globalXenBurned || '0', 18), {}, 'highlight-burn')}
              {renderStatItem("Total XBURN Burned", ethers.utils.formatUnits(stats.globalXburnBurned || '0', 18), {}, 'highlight-burn')}
              {renderStatItem("Total XBURN Supply", ethers.utils.formatUnits(stats.totalXburnSupply || '0', 18))}
              {renderStatItem("Global Burn %", `${(parseFloat(stats.globalBurnPercentage || '0') / 100).toFixed(2)}%`)}
              {renderStatItem("Current AMP", stats.currentAMP || '0')}
              {/* Contract link removed as it was static and potentially confusing */}
            </>
          ))}
        </div>
      </div>

      {/* Dex Screener Embed */}
      <div className="dexscreener-container">
        <style>{`
          #dexscreener-embed{position:relative;width:100%;padding-bottom:100%;}
          @media(min-width:1400px){#dexscreener-embed{padding-bottom:55%;}}
          #dexscreener-embed iframe{position:absolute;width:100%;height:100%;top:0;left:0;border:0;}
        `}</style>
        <div id="dexscreener-embed">
          <iframe src="https://dexscreener.com/base/0x93e39bd6854d960a0c4f5b592381bb8356a2d725?embed=1&info=0&loadChartSettings=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=15"></iframe>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel; 