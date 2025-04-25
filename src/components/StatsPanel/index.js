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
  const significantPart = decimalPart.substring(firstDigitIndex, firstDigitIndex + significantDigits);

  // Ensure the total decimal places (zeros + significant digits) don't exceed the max
  const allowedSignificantDigits = Math.max(1, maxTotalDecimals - zeroCount);
  const finalSignificantPart = significantPart.substring(0, allowedSignificantDigits);

  return `$0.0(${zeroCount})${finalSignificantPart}`;
};

const StatsPanel = () => {
  const { 
      balances, 
      stats: globalStatsData, 
      xenPrice, 
      xburnPrice,
      poolTvl,
      totalNFTs,
      externalStats
  } = useGlobalData();

  // Simplify state access
  const stats = globalStatsData?.data || {};
  const extStats = externalStats?.data || {};

  // --- Calculate Derived Stats ---
  const parseAndMultiply = (val1, val2) => {
    const num1 = parseFloat(String(val1).replace(/,/g, '') || '0');
    const num2 = parseFloat(String(val2).replace(/,/g, '') || '0');
    if (isNaN(num1) || isNaN(num2)) return 0;
    return num1 * num2;
  };

  const usdValueXenBurned = parseAndMultiply(stats.totalXenBurned, xenPrice);
  const usdValueXburnBurned = parseAndMultiply(stats.totalXburnBurned, xburnPrice);
  const xburnMarketCap = parseAndMultiply(stats.totalXburnMinted, xburnPrice);

  // Format approved values safely
  const formatApproval = (rawApproval) => {
    if (!rawApproval) return '0';
    // Use precise check for MaxUint256
    if (rawApproval.eq(ethers.constants.MaxUint256)) {
      return 'MAX';
    }
    // Otherwise, format the number
    try {
      const formatted = ethers.utils.formatUnits(rawApproval, 18);
      return formatNumber(formatted); // Use the existing formatNumber for display
    } catch (e) {
      console.error("Error formatting approval value:", e);
      return '0'; // Handle potential errors during formatting
    }
  };

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
              {renderStatItem("cbXEN Balance", formatNumber(balances?.xen || '0', {maxDecimals: 2}))}
              {renderStatItem("XLOCK NFT Count", totalNFTs ?? '...')}
              {renderStatItem("User cbXEN Burned", formatNumber(stats.userXenBurned || '0', { maxDecimals: 2 }), 'highlight-burn')}
              {renderStatItem("XBURN Balance", formatNumber(balances?.xburn || '0', {maxDecimals: 2}))}
              {renderStatItem("Current AMP", stats.currentAMP ?? '...')}
              {renderStatItem("User XBURN Burned", formatNumber(stats.userXburnBurned || '0', { maxDecimals: 2 }), 'highlight-burn')}
            </>
          ))}

          {/* Token & Pool Info Section */}
          {renderSection("Token & Pool Info", (
            <>
              {/* Top Row */}
              {renderStatItem("cbXEN Price", formatSmallPrice(xenPrice, 6, 13))} {/* Keep custom format */}
              {renderStatItem("XBURN Price", formatSmallPrice(xburnPrice, 6, 13))} {/* Keep custom format */}
              {renderStatItem("cbXEN per XBURN", formatNumber(calculateRatio() || '0', { maxDecimals: 2 }))}
              
              {/* Middle Row */}
              {renderStatItem("CBXEN LP", formatNumber(stats.xenInPool || '0', { maxDecimals: 2 }))} 
              {renderStatItem("XBURN LP", formatNumber(stats.xburnInPool || '0', { maxDecimals: 2 }))}
              {renderStatItem("Contract LP Value", `$${parseFloat(poolTvl || '0').toLocaleString(undefined, { maximumFractionDigits: 0 })}`)} {/* Whole USD */}
              
              {/* Bottom Row */}
              {renderStatItem("CBXEN Total Supply", formatNumber(extStats.tokenSupply?.cbxen?.total_supply_formatted || '0', { maxDecimals: 2 }))}
              {renderStatItem("XBURN Total Supply", formatNumber(extStats.tokenSupply?.xburn?.total_supply_formatted || '0', { maxDecimals: 2 }))}
              {renderStatItem("burn ratio", "1,000,000:1")} {/* Placeholder Ratio */}
            </>
          ))}

          {renderSection("Global Burn & Supply Stats", (
            <>
              <div className="stat-pair-container">
                {renderStatItem("Total cbXEN Burned", formatNumber(stats.totalXenBurned || '0', { maxDecimals: 2 }), 'highlight-burn')}
                {renderStatItem("Value cbXEN Burned", `$${parseFloat(usdValueXenBurned || '0').toLocaleString(undefined, {maximumFractionDigits: 0})}`, 'highlight-value-green')}
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

export default StatsPanel; 