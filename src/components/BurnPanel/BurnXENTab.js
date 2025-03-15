import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ethers } from 'ethers';
import { Tooltip } from '../../utils/components/Tooltip';
import { XEN_ADDRESS, XENBURNER_ADDRESS } from '../../constants/addresses';
import xenAbi from '../../contracts/xen.json';
import { useWallet } from '../../context/WalletContext';

// Import utility functions
import { 
  formatDecimals,
  calculateMultiplier,
  formatNumber
} from '../../utils/tokenUtils';

// Use public path for XEN logo
const xenLogo = '/xen.png';

// BurnXENTab component for burning XEN tokens
const BurnXENTab = ({ 
  xenAmount,
  setXenAmount,
  xenBalance,
  xenApproved,
  approveXEN,
  burnXEN,
  isApproveLoading,
  isBurnLoading,
  selectedTerm,
  setSelectedTerm,
  ampStart,
  ampSnapshot,
  daysSinceLaunch,
  totalBurnedXEN,
  totalMintedXBURN,
  error,
  setError
}) => {
  // Get provider and account from wallet context
  const { provider, account } = useWallet();
  
  // State for actual XEN approval from contract
  const [actualXenApproval, setActualXenApproval] = useState('0');
  
  // Function to fetch XEN approval directly from the contract
  const fetchXenApproval = useCallback(async () => {
    try {
      if (!provider || !account) {
        console.log('Missing provider or account, cannot fetch XEN approval');
        return;
      }
      
      console.log('Fetching XEN approval for account:', account);
      
      // Create XEN contract instance
      const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, provider);
      
      // Get allowance
      const approval = await xenContract.allowance(account, XENBURNER_ADDRESS);
      
      // Format the approval amount
      const formattedApproval = ethers.utils.formatUnits(approval, 18);
      console.log('Raw XEN approval value:', approval.toString());
      console.log('Formatted XEN approval value:', formattedApproval);
      
      // Update state with the formatted approval
      setActualXenApproval(formattedApproval);
    } catch (error) {
      console.error('Error fetching XEN approval:', error);
    }
  }, [provider, account]);
  
  // Fetch XEN approval on component mount and when account or provider changes
  useEffect(() => {
    if (provider && account) {
      console.log('Fetching XEN approval...');
      fetchXenApproval();
      
      // Set up interval to refresh approval every 10 seconds
      const interval = setInterval(fetchXenApproval, 10000);
      
      return () => clearInterval(interval);
    }
  }, [fetchXenApproval, provider, account, isApproveLoading]);

  // Log when approval values change
  useEffect(() => {
    console.log('actualXenApproval updated:', actualXenApproval);
    console.log('xenApproved prop:', xenApproved);
  }, [actualXenApproval, xenApproved]);

  const handleMaxClick = () => {
    if (xenBalance && parseFloat(xenBalance) > 0) {
      setXenAmount(xenBalance);
      setError('');
    }
  };
  
  // Handle custom term input change
  const handleTermChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedTerm(0);
      return;
    }
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setSelectedTerm(numValue);
    }
  };

  // Calculate multiplier based on term days and amplifier values
  const multiplier = calculateMultiplier(selectedTerm, ampStart, ampSnapshot);
  
  // Calculate term percentage
  const termPercentage = (selectedTerm * 100) / 365;
  
  // Use the AMP value directly from the contract
  const ampValue = ampSnapshot;
  
  // Calculate base amount
  const baseAmount = xenAmount && parseFloat(xenAmount) > 0 
    ? parseFloat(xenAmount) / 100000 
    : 0;
    
  // Calculate bonus using the direct AMP value
  const bonus = baseAmount * (termPercentage * ampValue / 10000);
  
  // Calculate total
  const total = baseAmount + bonus;

  // Use the actual approval from contract if available, otherwise fall back to prop
  const displayApproval = actualXenApproval && parseFloat(actualXenApproval) > 0 
    ? actualXenApproval 
    : xenApproved;
  
  console.log('Rendering with displayApproval:', displayApproval);

  return (
    <div className="burn-tab">
      <h2 className="burn-title">Burn XEN</h2>
      <p className="burn-subtitle">Burn your XEN to mint XBURN!</p>

      <div className="input-section">
        <div className="input-token-container">
          <div className="input-token-header">
            <div className="token-info">
              <img src={xenLogo} alt="XEN" className="token-logo" />
              <span className="token-symbol">XEN</span>
            </div>
            <div className="input-field">
              <input
                type="text"
                value={xenAmount}
                onChange={(e) => {
                  setXenAmount(e.target.value);
                  setError('');
                }}
                placeholder="0.0"
                className={error ? 'input-error' : ''}
              />
            </div>
            <button 
              className="max-button" 
              onClick={handleMaxClick}
              disabled={!xenBalance || xenBalance === '0'}
            >
              MAX
            </button>
          </div>
          
          <div className="token-details">
            <div className="balance-info">
              <span className="balance-label">Balance:</span>
              <span className="balance-value">{formatDecimals(xenBalance)} XEN</span>
            </div>
            <div className="approved-info">
              <span className="approved-label">Approved:</span>
              <span className="approved-value">
                {formatDecimals(displayApproval, { isApproved: true })} XEN
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="term-input-container">
        <div className="term-input-label">
          Term Length (Days)
          <Tooltip content="Longer term lengths provide higher multipliers for your XBURN rewards">
            <span className="info-icon">i</span>
          </Tooltip>
        </div>
        <div className="term-input-field">
          <input
            type="number"
            value={selectedTerm}
            onChange={handleTermChange}
            placeholder="Enter days"
            min="0"
            max="3650"
            className="term-input"
          />
          <div className="term-input-note">Max: 3650 days (10 years)</div>
        </div>
      </div>

      <div className="button-container">
        <button
          className="approve-button"
          onClick={() => {
            approveXEN();
            // Refresh approval after a short delay
            setTimeout(fetchXenApproval, 1000);
          }}
          disabled={isApproveLoading || isBurnLoading || !xenAmount || parseFloat(xenAmount) <= 0 || error}
        >
          {isApproveLoading ? (
            <>
              <div className="loader"></div>
              Approving...
            </>
          ) : (
            'Approve XEN (Max)'
          )}
        </button>
        <button
          className="burn-button"
          onClick={burnXEN}
          disabled={
            isBurnLoading || 
            isApproveLoading ||
            !xenAmount || 
            parseFloat(xenAmount) <= 0 || 
            parseFloat(displayApproval) < parseFloat(xenAmount || 0) ||
            error
          }
        >
          {isBurnLoading ? (
            <>
              <div className="loader"></div>
              Burning...
            </>
          ) : isApproveLoading ? (
            <>
              <div className="loader"></div>
              Waiting for approval...
            </>
          ) : (
            'Burn XEN'
          )}
        </button>
      </div>

      <div className="conversion-info">
        <div className="reward-calculation">
          <div className="reward-header">
            <span>Reward Calculation</span>
          </div>
          
          <div className="reward-row horizontal">
            <div className="reward-item">
              <div className="reward-label">Base Amount</div>
              <div className="reward-value">
                {formatDecimals(baseAmount, 2)} XBURN
              </div>
            </div>
            
            <div className="calculation-operator">×</div>
            
            <div className="reward-item">
              <div className="reward-label">Term %</div>
              <div className="reward-value">
                {termPercentage.toFixed(2)}%
              </div>
            </div>
            
            <div className="calculation-operator">×</div>
            
            <div className="reward-item">
              <div className="reward-label">Multiplier</div>
              <div className="reward-value">
                {multiplier.toFixed(2)}x
              </div>
            </div>
          </div>
          
          <div className="base-amount-display">
            <div className="base-label">Base XBURN</div>
            <div className="base-result">
              {formatDecimals(baseAmount, 2)} XBURN
            </div>
          </div>
          
          <div className="reward-formula">
            <div className="formula-label">Bonus = Base × Term% × AMP ÷ 10000</div>
            <div className="formula-result">
              {formatDecimals(bonus, 2)} XBURN
            </div>
          </div>
          
          <div className="reward-total">
            <div className="total-label">Total = Base + Bonus</div>
            <div className="total-value">
              {formatDecimals(total, 2)} XBURN
            </div>
          </div>
        </div>
        
        <div className="contract-stats">
          <div className="stats-header">Contract Stats</div>
          <div className="stats-row">
            <span className="stats-label">Current AMP:</span>
            <span className="stats-value">{ampSnapshot}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Days Since Launch:</span>
            <span className="stats-value">{daysSinceLaunch}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Total XEN Burned:</span>
            <span className="stats-value">{formatDecimals(totalBurnedXEN, 2)}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Total XBURN Minted:</span>
            <span className="stats-value">{formatDecimals(totalMintedXBURN, 2)}</span>
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

BurnXENTab.propTypes = {
  xenAmount: PropTypes.string.isRequired,
  setXenAmount: PropTypes.func.isRequired,
  xenBalance: PropTypes.string.isRequired,
  xenApproved: PropTypes.string.isRequired,
  approveXEN: PropTypes.func.isRequired,
  burnXEN: PropTypes.func.isRequired,
  isApproveLoading: PropTypes.bool.isRequired,
  isBurnLoading: PropTypes.bool.isRequired,
  selectedTerm: PropTypes.number.isRequired,
  setSelectedTerm: PropTypes.func.isRequired,
  ampStart: PropTypes.number.isRequired,
  ampSnapshot: PropTypes.number.isRequired,
  daysSinceLaunch: PropTypes.number,
  totalBurnedXEN: PropTypes.string,
  totalMintedXBURN: PropTypes.string,
  error: PropTypes.string,
  setError: PropTypes.func.isRequired
};

export default BurnXENTab; 