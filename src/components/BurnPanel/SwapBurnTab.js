import React, { useEffect } from 'react';
import FireParticles from '../FireParticles';
import { formatDecimals } from '../../utils/tokenUtils';
import { Tooltip } from '../../utils/components';

/**
 * SwapBurnTab - Component for the "Swap & Burn" tab content
 */
const SwapBurnTab = ({
  progress,
  isLoading,
  handleSwapAndBurn
}) => {
  // Debug logging for progress data
  useEffect(() => {
    console.log("SwapBurnTab progress:", progress);
  }, [progress]);

  // Format progress percentage
  const formatProgress = () => {
    if (!progress || progress.percentage === undefined || progress.percentage === null) {
      console.log("Progress percentage is missing or invalid:", progress);
      return '0%';
    }
    return `${Math.min(100, Math.floor(progress.percentage * 100))}%`;
  };

  // Calculate remaining XEN needed
  const calculateRemaining = () => {
    if (!progress || !progress.accumulated || !progress.threshold) {
      console.log("Missing accumulated or threshold values:", progress);
      return '0';
    }
    const accumulated = parseFloat(progress.accumulated);
    const threshold = parseFloat(progress.threshold);
    return formatDecimals(Math.max(0, threshold - accumulated), { useCommas: true });
  };

  // Calculate percentage for display
  const getPercentage = () => {
    if (!progress || progress.percentage === undefined || progress.percentage === null) {
      return 0;
    }
    // Ensure percentage is between 0 and 100
    return Math.min(100, Math.max(0, progress.percentage * 100));
  };

  return (
    <div className="tab-content">
      <h2 className="burn-title swapBurn">Swap & Burn</h2>
      <p className="burn-subtitle">
        Swap accumulated XEN for XBURN when threshold is reached
      </p>
      
      <div className="progress-container">
        <div className="progress-section-header">
          <h3>Accumulation Progress</h3>
          <Tooltip text="When the threshold is reached, anyone can trigger the Swap & Burn process to convert accumulated XEN to XBURN and burn it, reducing supply.">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </Tooltip>
        </div>
        
        <div className="progress-info">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: formatProgress() }}
            ></div>
          </div>
          
          <div className="progress-details">
            <div className="progress-percent">{formatProgress()}</div>
            <div className="accumulation-status">
              {progress && getPercentage() < 100 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              <span>
                {progress && progress.accumulated && progress.threshold ? (
                  `${formatDecimals(progress.accumulated, { useCommas: true })} / ${formatDecimals(progress.threshold, { useCommas: true })} XEN`
                ) : (
                  'Loading...'
                )}
              </span>
            </div>
          </div>
        </div>
        
        <div className="accumulation-details">
          <div className="accumulation-row">
            <span className="accumulation-label">Accumulated XEN:</span>
            <span className="accumulation-value">
              {progress && progress.accumulated ? 
                formatDecimals(progress.accumulated, { useCommas: true }) : 
                'Loading...'}
            </span>
          </div>
          <div className="accumulation-row">
            <span className="accumulation-label">Threshold Required:</span>
            <span className="accumulation-value">
              {progress && progress.threshold ? 
                formatDecimals(progress.threshold, { useCommas: true }) : 
                'Loading...'}
            </span>
          </div>
          <div className="accumulation-row">
            <span className="accumulation-label">Remaining Needed:</span>
            <span className="accumulation-value">
              {calculateRemaining()} XEN
            </span>
          </div>
        </div>
        
        <div className="estimated-completion">
          {progress && getPercentage() >= 100 ? (
            <span className="ready">Ready to Swap & Burn!</span>
          ) : (
            <span>
              {progress && progress.percentage !== undefined ? (
                `${100 - Math.floor(getPercentage())}% remaining until threshold is reached`
              ) : (
                'Calculating...'
              )}
            </span>
          )}
        </div>
        
        <div className="swap-burn-button-container">
          <div className="fire-effect" style={{ position: 'absolute', width: '100%', height: '100%' }}>
            <FireParticles width={300} height={100} intensity={0.3} isBackground={true} />
          </div>
          <button
            className="swap-burn-button"
            onClick={handleSwapAndBurn}
            disabled={isLoading || !progress || getPercentage() < 100}
          >
            {isLoading ? (
              <>
                <div className="loader"></div>
                Processing Swap & Burn...
              </>
            ) : (
              'SWAP & BURN NOW'
            )}
          </button>
          
          {progress && getPercentage() < 100 && (
            <div className="swap-disabled-reason">
              Swap & Burn will be enabled once the XEN threshold is reached
            </div>
          )}
        </div>
        
        {progress && getPercentage() >= 100 && (
          <div className="swap-info-note">
            <p>When you click the Swap & Burn button, the contract will:</p>
            <ol>
              <li>Swap the accumulated XEN for XBURN tokens</li>
              <li>Burn the received XBURN tokens</li>
              <li>Reset the accumulation counter for the next cycle</li>
            </ol>
            <p>This helps reduce the overall supply of XBURN tokens.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapBurnTab; 