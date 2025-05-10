import React, { useCallback, useEffect } from 'react';
// Removed unused ethers import
// import { ethers } from 'ethers';
// Removed unused import
// import { useWallet } from '../../context/WalletContext';
import { useGlobalData } from '../../context/GlobalDataContext';
// import FireParticles from '../FireParticles';
import './StatsPanel.css';

// Format large numbers with K, M, B, T suffixes and improved decimal handling
const formatNumber = (num, options = {}) => {
  const { isRatio = false, isApproved = false, maxDecimals = 2 } = options;
  // Removed logging
  // console.log(`formatNumber Input: num=${num}, type=${typeof num}, options=`, options);

  if (isApproved && typeof num === 'string' && num === 'MAX') {
    return 'MAX';
  }

  if (num === null || num === undefined || num === 'NaN' || num === '') {
      return isRatio ? '0.000000' : '0.00';
  }

  let numberString = String(num);
  numberString = numberString.replace(/,/g, ''); 

  const n = parseFloat(numberString);
  
  if (isNaN(n)) {
      return isRatio ? '0.000000' : '0.00';
  }
  // Removed logging
  // console.log(`formatNumber Parsed n: ${n}`);

  if (isRatio) {
      return n.toFixed(6);
  }

  if (n >= 1e12) {
      const val = `${(n / 1e12).toFixed(maxDecimals)}T`;
      // console.log(`formatNumber Output (T): ${val}`);
      return val;
  }
  if (n >= 1e9) {
      const val = `${(n / 1e9).toFixed(maxDecimals)}B`;
      // console.log(`formatNumber Output (B): ${val}`);
      return val;
  }
  if (n >= 1e6) {
      const val = `${(n / 1e6).toFixed(maxDecimals)}M`;
      // console.log(`formatNumber Output (M): ${val}`);
      return val;
  }
  if (n >= 1e3) {
      const val = `${(n / 1e3).toFixed(maxDecimals)}K`;
      // console.log(`formatNumber Output (K): ${val}`);
      return val;
  }

  const dynamicDecimals = n === 0 ? 2 : Math.max(2, Math.min(6, maxDecimals + (n < 1 ? 4 : 0))); 
  const val = n.toLocaleString(undefined, {
    minimumFractionDigits: 2, 
    maximumFractionDigits: dynamicDecimals 
  });
  // Removed logging
  // console.log(`formatNumber Output (Default): ${val}`);
  return val;
};

// Format very small prices like $0.0(zeros) semnifican digits
const formatSmallPrice = (price, significantDigits = 4, maxTotalDecimals = 10) => {
  const priceNum = parseFloat(price);
  if (isNaN(priceNum) || priceNum === 0) {
    return `$0.00`; // Or handle as needed
  }

  // If the number is not extremely small, format normally
  if (priceNum >= 0.0001) {
    return `$${priceNum.toFixed(6)}`; // Use standard formatting for larger small numbers
  }

  // Convert to string with high precision to find zeros
  const priceString = priceNum.toFixed(20); // Adjust precision as needed
  const decimalPart = priceString.split('.')[1] || '';

  let firstDigitIndex = -1;
  for (let i = 0; i < decimalPart.length; i++) {
    if (decimalPart[i] !== '0') {
      firstDigitIndex = i;
      break;
    }
  }

  if (firstDigitIndex === -1) {
    return `$0.00`; // Should not happen if priceNum !== 0
  }

  const zeroCount = firstDigitIndex;
  // Use same number of significant digits for both XEN and XBURN
  const significantPart = decimalPart.substring(firstDigitIndex, firstDigitIndex + 3);

  return `$0.0(${zeroCount})${significantPart}`;
};

const StatsPanel = () => {
  const { 
      balances, 
      stats: globalStatsData, 
      xenPrice, 
      xburnPrice,
      poolTvl,
      totalNFTs,
      externalStats,
      loading: isLoading,
      error: fetchError,
      loadStats,
      fetchDexScreenerData,
      fetchExternalStats,
      selectedChainId // Add selectedChainId to access current chain
  } = useGlobalData();

  // Simplify state access and add logging
  const stats = globalStatsData?.data || {};
  const extStats = externalStats?.data || {};
  
  // Add automatic refresh when pricing data changes but we have no stats data
  useEffect(() => {
    // If we have price data but no stats data, refresh stats
    if ((xenPrice !== '0' || xburnPrice !== '0') && (!stats.totalXenBurned || stats.totalXenBurned === '0')) {
      console.log('StatsPanel: Price data available but no stats data. Auto-refreshing stats...');
      if (loadStats) loadStats(true);
    }
  }, [xenPrice, xburnPrice, stats.totalXenBurned, loadStats]);
  
  // Add effect to force DexScreener refresh when prices are zero but should be loaded
  useEffect(() => {
    // If we're not loading and prices are both zero and we're not showing any error,
    // it's likely the price data didn't update properly - so force a refresh
    if (!isLoading && xenPrice === '0' && xburnPrice === '0' && !fetchError) {
      console.log('StatsPanel: Prices are zero without errors. Auto-refreshing DexScreener data...');
      if (fetchDexScreenerData) {
        fetchDexScreenerData(undefined, true); // Force refresh
      }
    }
  }, [isLoading, xenPrice, xburnPrice, fetchError, fetchDexScreenerData]);
  
  // Handle stats refresh
  const handleRefreshStats = useCallback(() => {
    console.log("Manually refreshing stats...");
    if (loadStats) loadStats();
    if (fetchDexScreenerData) fetchDexScreenerData();
    if (fetchExternalStats) fetchExternalStats();
  }, [loadStats, fetchDexScreenerData, fetchExternalStats]);

  // Add debug logging
  console.log("StatsPanel: Retrieved stats data:", {
    globalStatsData,
    loading: isLoading,
    error: fetchError,
    stats,
    totalXenBurned: stats.totalXenBurned,
    totalXburnBurned: stats.totalXburnBurned,
    totalXburnMinted: stats.totalXburnMinted,
    xenPrice,
    xburnPrice
  });

  // --- Calculate Derived Stats ---
  const parseAndMultiply = (val1, val2) => {
    try {
      const num1 = parseFloat(String(val1 || '0').replace(/,/g, '') || '0');
      const num2 = parseFloat(String(val2 || '0').replace(/,/g, '') || '0');
      if (isNaN(num1) || isNaN(num2)) return 0;
      return num1 * num2;
    } catch (error) {
      console.error("Error in parseAndMultiply:", error, { val1, val2 });
      return 0;
    }
  };

  const usdValueXenBurned = parseAndMultiply(stats.totalXenBurned, xenPrice);
  const usdValueXburnBurned = parseAndMultiply(stats.totalXburnBurned, xburnPrice);
  const xburnMarketCap = parseAndMultiply(stats.totalXburnMinted, xburnPrice);
  
  // Log derived values
  console.log("StatsPanel: Calculated values:", {
    usdValueXenBurned,
    usdValueXburnBurned,
    xburnMarketCap
  });

  // Helper to render a single stat item - Pass maxDecimals option
  const renderStatItem = (label, value, className = '', maxDecimals = 2) => (
    <div className={`stat-item ${className}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
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

  // Determine max decimal values based on chain ID (Polygon needs fewer decimals)
  const getXenPriceMaxDecimals = () => {
    // If on Polygon chain (id: 137), use fewer decimals
    return selectedChainId === 137 ? 8 : 13;
  };

  return (
    <div className="stats-panel-container-redesigned">
      <div className="stats-panel-card">
        {/* <FireParticles width="100%" height="100%" intensity={0.15} isBackground={true} /> Removed */}

        <div className="stats-header">
          <div> {/* Wrap heading and subheading */} 
            <h2>PROTOCOL STATISTICS</h2>
            <p className="stats-warning-subheading">Press "Refresh Stats" if stats do not load when switching networks</p>
          </div>
          
          <div className="stats-controls">
            {/* Show loading indicator or error message */}
            {isLoading && <div className="stats-loading-indicator">Loading...</div>}
            {fetchError && <div className="stats-error-message">Error: {fetchError}</div>}
            
            {/* Add refresh button */}
            <button 
              className="stats-refresh-button" 
              onClick={handleRefreshStats}
              disabled={isLoading}
            >
              Refresh Stats
            </button>
          </div>
        </div>

        <div className="stats-content-area">
          {renderSection("User Wallet & Burn Activity", (
            <>
              {renderStatItem("XEN Balance", formatNumber(balances?.xen || '0', {maxDecimals: 2}))}
              {renderStatItem("XLOCK NFT Count", totalNFTs ?? '...')}
              {renderStatItem("User XEN Burned", formatNumber(stats.userXenBurned || '0', { maxDecimals: 2 }), 'highlight-burn')}
              {renderStatItem("XBURN Balance", formatNumber(balances?.xburn || '0', {maxDecimals: 2}))}
              {renderStatItem("Current AMP", stats.currentAMP ?? '...')}
              {renderStatItem("User XBURN Burned", formatNumber(stats.userXburnBurned || '0', { maxDecimals: 2 }), 'highlight-burn')}
            </>
          ))}

          {/* Token & Pool Info Section */}
          {renderSection("Token & Pool Info", (
            <>
              {/* Top Row */}
              {renderStatItem("XEN Price", formatSmallPrice(xenPrice, 6, getXenPriceMaxDecimals()))} {/* Dynamic max decimals */}
              {renderStatItem("XBURN Price", formatSmallPrice(xburnPrice, 6, getXenPriceMaxDecimals()))} {/* Match XEN decimals */}
              {renderStatItem("XEN per XBURN", formatNumber(calculateRatio() || '0', { maxDecimals: 2 }))}
              
              {/* Middle Row */}
              {renderStatItem("XEN LP", formatNumber(stats.xenInPool || '0', { maxDecimals: 2 }))} 
              {renderStatItem("XBURN LP", formatNumber(stats.xburnInPool || '0', { maxDecimals: 2 }))}
              {renderStatItem("Contract LP Value", `$${parseFloat(poolTvl || '0').toLocaleString(undefined, { maximumFractionDigits: 0 })}`)} {/* Whole USD */}
              
              {/* Bottom Row */}
              {renderStatItem("XEN Total Supply", formatNumber(extStats.tokenSupply?.cbxen?.total_supply_formatted || '0', { maxDecimals: 2 }))}
              {renderStatItem("XBURN Total Supply", formatNumber(extStats.tokenSupply?.xburn?.total_supply_formatted || '0', { maxDecimals: 2 }))}
              {renderStatItem("burn ratio", "1,000,000:1")} {/* Placeholder Ratio */}
            </>
          ))}

          {renderSection("Global Burn & Supply Stats", (
            <>
              <div className="stat-pair-container">
                {renderStatItem("Total XEN Burned", formatNumber(stats.totalXenBurned || '0', { maxDecimals: 2 }), 'highlight-burn')}
                {renderStatItem("Value XEN Burned", `$${parseFloat(usdValueXenBurned || '0').toLocaleString(undefined, {maximumFractionDigits: 0})}`, 'highlight-value-green')}
              </div>
              <div className="stat-pair-container">
                {renderStatItem("Total XBURN Burned", formatNumber(stats.totalXburnBurned || '0', { maxDecimals: 2 }), 'highlight-burn')}
                {renderStatItem("Value XBURN Burned", `$${parseFloat(usdValueXburnBurned || '0').toLocaleString(undefined, {maximumFractionDigits: 0})}`, 'highlight-value-green')}
              </div>
              <div className="stat-pair-container">
                {renderStatItem("XBURN Circulating", formatNumber(stats.totalXburnMinted || '0', { maxDecimals: 2 }))}
                {renderStatItem("XBURN Market Cap", `$${parseFloat(xburnMarketCap || '0').toLocaleString(undefined, {maximumFractionDigits: 0})}`, 'highlight-value-green')}
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
};

export { StatsPanel };
export default StatsPanel; 