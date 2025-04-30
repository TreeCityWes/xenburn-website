import React, { useEffect, useMemo } from 'react';
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
  // Memoize derived values from progress
  const { 
    actualPercentage, 
    displayPercentage, 
    remainingNeeded, 
    thresholdReached 
  } = useMemo(() => {
    const accumulated = parseFloat(progress?.accumulated || '0');
    const threshold = parseFloat(progress?.threshold || '0');
    
    let actualPerc = 0;
    if (threshold > 0) {
      actualPerc = (accumulated / threshold) * 100;
    }
    
    const displayPerc = Math.min(100, Math.max(0, actualPerc));
    const remaining = formatDecimals(Math.max(0, threshold - accumulated), { useCommas: true });
    const reached = accumulated >= (threshold * 0.999);
    
    return {
      actualPercentage: actualPerc,
      displayPercentage: displayPerc,
      remainingNeeded: remaining,
      thresholdReached: reached
    };
  }, [progress]); // Only recalculate when progress object changes

  // Format progress percentage for display
  const formatProgress = useMemo(() => {
    return `${Math.floor(actualPercentage)}%`; // Use memoized value
  }, [actualPercentage]);
  
   // Format remaining percentage
  const formatRemainingPercentage = useMemo(() => {
     return `${100 - Math.floor(displayPercentage)}%`; // Use memoized value
  }, [displayPercentage]);

  // Debug log progress prop when it changes
  useEffect(() => {
    // console.log("SwapBurnTab progress prop received:", progress); // Removed log
  }, [progress]);

  return (
    <div className="tab-content">
      <FireParticles 
        width="100%" 
        height="100%" 
        intensity={0.3} 
        isBackground={true} 
        type="xburn" 
        style={{ zIndex: 0 }} 
      />
      
      <h2 className="burn-title swapBurn">Swap & Burn</h2>
      <p className="burn-subtitle">
        Trigger when the 500M XEN threshold is reached
      </p>
      
      <div className="progress-container">
        <div className="progress-section-header">
          <h3>Accumulation Progress</h3>
        </div>
        
        <div className="progress-info">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${displayPercentage}%` }}
            ></div>
          </div>
          
          <div className="progress-details">
            <div className="progress-percent">{formatProgress}</div>
            <div className="accumulation-status">
              {!thresholdReached ? (
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
              {progress?.accumulated ? formatDecimals(progress.accumulated, { useCommas: true }) : 'Loading...'}
            </span>
          </div>
          <div className="accumulation-row">
            <span className="accumulation-label">Threshold Required:</span>
            <span className="accumulation-value">
              {progress?.threshold ? formatDecimals(progress.threshold, { useCommas: true }) : 'Loading...'} XEN
            </span>
          </div>
          <div className="accumulation-row">
            <span className="accumulation-label">Remaining Needed:</span>
            <span className="accumulation-value">
              {remainingNeeded} XEN
            </span>
          </div>
        </div>
        
        <div className="swap-burn-button-container button-container">
          <div className="button-wrapper burn-wrapper">
            <button
              className="burn-button"
              onClick={handleSwapAndBurn}
              disabled={isLoading || !thresholdReached}
            >
              {isLoading ? (
                <div className="button-loading">
                  <div className="loader"></div>
                  <span>Processing Swap & Burn...</span>
                </div>
              ) : (
                'SWAP & BURN NOW'
              )}
            </button>
          </div>
        </div>
        
        <div className="estimated-completion">
          {thresholdReached ? (
            <span className="ready">Ready to Swap & Burn!</span>
          ) : (
            <span>
              {progress?.accumulated && progress?.threshold ? 
                `${formatRemainingPercentage} remaining until the threshold is reached` : 'Calculating...'
              }
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapBurnTab; 