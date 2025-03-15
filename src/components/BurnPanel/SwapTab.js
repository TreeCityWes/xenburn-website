import React from 'react';
import { formatDecimals, safeFormatMaxBalance } from '../../utils/tokenUtils';
import { Tooltip } from '../../utils/components';

/**
 * SwapTab - Component for the "Swap" tab content
 * Redesigned to look more like a modern DEX interface
 */
const SwapTab = ({
  isXenToXburn,
  setIsXenToXburn,
  swapAmount,
  setSwapAmount,
  swapRate,
  xenBalance,
  xburnBalance,
  slippage,
  setSlippage,
  isLoading,
  approving,
  handleApproveToken,
  handleSwap,
  handleSwapInputChange,
  calculateRate,
  calculateMinReceived,
  calculateImpact,
  swapApproved
}) => {
  // Function to set max amount based on current token
  const setMaxAmount = () => {
    const balance = isXenToXburn ? xenBalance : xburnBalance;
    setSwapAmount(safeFormatMaxBalance(balance));
  };

  // Function to set max amount and switch direction
  const setMaxAndSwitch = () => {
    setIsXenToXburn(!isXenToXburn);
    // We need to use setTimeout to ensure the direction is switched before setting the amount
    setTimeout(() => {
      const balance = !isXenToXburn ? xenBalance : xburnBalance;
      setSwapAmount(safeFormatMaxBalance(balance));
    }, 0);
  };

  // Check if the amount is approved for swap
  const isAmountApproved = () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) return true;
    return parseFloat(swapApproved) >= parseFloat(swapAmount);
  };

  return (
    <div className="tab-content">
      <h2 className="burn-title swap">Swap Tokens</h2>
      <p className="burn-subtitle">
        Exchange between XEN and XBURN tokens using Uniswap
      </p>
      
      <div className="dex-swap-container">
        <div className="dex-card">
          <div className="dex-card-header">
            <div className="dex-card-title">Swap</div>
            <div className="dex-settings">
              <Tooltip text="Adjust slippage tolerance">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </Tooltip>
            </div>
          </div>
          
          {/* From token */}
          <div className="dex-input-container">
            <div className="dex-input-header">
              <span>From</span>
              <div className="dex-balance-container">
                <span className="dex-balance" onClick={setMaxAmount}>
                  Balance: {formatDecimals(isXenToXburn ? xenBalance : xburnBalance, { useCommas: true })}
                </span>
                <button className="dex-max-button" onClick={setMaxAmount}>
                  MAX
                </button>
              </div>
            </div>
            <div className="dex-input-field">
              <input
                type="text"
                value={swapAmount}
                onChange={handleSwapInputChange}
                placeholder="0.0"
                className="dex-amount-input"
              />
              <div className="dex-token-selector" onClick={() => setIsXenToXburn(!isXenToXburn)}>
                <img 
                  src={isXenToXburn ? "/xen.png" : "/logo192.png"} 
                  alt={isXenToXburn ? "XEN" : "XBURN"} 
                  className="dex-token-icon" 
                />
                <span className="dex-token-symbol">{isXenToXburn ? "XEN" : "XBURN"}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Swap direction button */}
          <div className="dex-swap-arrow" onClick={() => setIsXenToXburn(!isXenToXburn)}>
            <div className="dex-swap-arrow-circle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
              </svg>
            </div>
          </div>
          
          {/* To token */}
          <div className="dex-input-container">
            <div className="dex-input-header">
              <span>To (estimated)</span>
              <div className="dex-balance-container">
                <span className="dex-balance" onClick={setMaxAndSwitch}>
                  Balance: {formatDecimals(!isXenToXburn ? xenBalance : xburnBalance, { useCommas: true })}
                </span>
                <button className="dex-max-button" onClick={setMaxAndSwitch}>
                  SWITCH
                </button>
              </div>
            </div>
            <div className="dex-input-field">
              <input
                type="text"
                value={swapRate}
                readOnly
                placeholder="0.0"
                className="dex-amount-input"
              />
              <div className="dex-token-selector">
                <img 
                  src={!isXenToXburn ? "/xen.png" : "/logo192.png"} 
                  alt={!isXenToXburn ? "XEN" : "XBURN"} 
                  className="dex-token-icon" 
                />
                <span className="dex-token-symbol">{!isXenToXburn ? "XEN" : "XBURN"}</span>
              </div>
            </div>
          </div>
          
          {/* Swap details */}
          <div className="dex-swap-details">
            <div className="dex-detail-row">
              <span className="dex-detail-label">Exchange Rate</span>
              <span className="dex-detail-value">{calculateRate()}</span>
            </div>
            
            <div className="dex-detail-row">
              <span className="dex-detail-label">Minimum Received</span>
              <span className="dex-detail-value">{calculateMinReceived()}</span>
            </div>
            
            <div className="dex-detail-row">
              <span className="dex-detail-label">Price Impact</span>
              <span className="dex-detail-value">{calculateImpact()}</span>
            </div>
            
            <div className="dex-detail-row">
              <span className="dex-detail-label">Slippage Tolerance</span>
              <span className="dex-detail-value">{slippage}%</span>
            </div>
          </div>
          
          {/* Slippage slider */}
          <div className="dex-slippage-container">
            <div className="dex-slippage-presets">
              <button 
                className={`dex-slippage-preset ${parseFloat(slippage) === 0.5 ? 'active' : ''}`}
                onClick={() => setSlippage('0.5')}
              >
                0.5%
              </button>
              <button 
                className={`dex-slippage-preset ${parseFloat(slippage) === 1.0 ? 'active' : ''}`}
                onClick={() => setSlippage('1.0')}
              >
                1.0%
              </button>
              <button 
                className={`dex-slippage-preset ${parseFloat(slippage) === 3.0 ? 'active' : ''}`}
                onClick={() => setSlippage('3.0')}
              >
                3.0%
              </button>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="dex-slippage-slider"
              aria-label="Slippage Tolerance"
            />
          </div>
          
          {/* Action buttons */}
          <div className="dex-actions">
            <button
              className="dex-approve-button"
              onClick={handleApproveToken}
              disabled={isLoading || approving || !swapAmount || parseFloat(swapAmount) <= 0}
            >
              {approving ? (
                <>
                  <div className="dex-button-loader"></div>
                  Approving...
                </>
              ) : (
                `Approve ${isXenToXburn ? 'XEN' : 'XBURN'}`
              )}
            </button>
            
            <button
              className="dex-swap-button"
              onClick={handleSwap}
              disabled={
                isLoading || 
                approving ||
                !swapAmount || 
                parseFloat(swapAmount) <= 0 ||
                !isAmountApproved()
              }
            >
              {isLoading && !approving ? (
                <>
                  <div className="dex-button-loader"></div>
                  Swapping...
                </>
              ) : approving ? (
                <>
                  <div className="dex-button-loader"></div>
                  Waiting for approval...
                </>
              ) : (
                'Swap'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapTab; 