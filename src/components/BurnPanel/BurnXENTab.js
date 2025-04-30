import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Tooltip } from '../../utils/components/Tooltip';
import { XEN_ABI } from '../../constants/addresses';
import { useWallet } from '../../context/WalletContext';

// Import utility functions
import { 
  formatDecimals,
  safelyCompareWithBalance,
  parseInputValue
} from '../../utils/tokenUtils';

// Use public path for XEN logo
const xenLogo = '/xen.png';

// Contract constants (matching XBurnMinter.sol)
const MAX_TERM = 3650; // ~10 years
const BASE_RATIO = 1000000; // 1M XEN = 1 XBURN

// Memoize the FireParticles component to prevent unnecessary renders
// const MemoizedFireParticles = React.memo(FireParticles); // Removed

// BurnXENTab component for burning XEN tokens
const BurnXENTab = ({ 
  xenBalance,
  ampStart,
  ampSnapshot,
}) => {
  // Get wallet and global data context
  const { 
    provider, 
    account, 
    signer, 
    xburnMinterContract, 
    fetchBalances, 
    xenApprovalRaw, 
    getCurrentAddresses,
    selectedChainId,
    xenContract
  } = useWallet();
  
  // Internal State
  const [rawXenAmount, setRawXenAmount] = useState('');
  const [displayXenAmount, setDisplayXenAmount] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(0);
  const [isApproveLoading, setIsApproveLoading] = useState(false);
  const [isBurnLoading, setIsBurnLoading] = useState(false);
  const [error, setError] = useState('');

  // Add default value for xenBalance
  const safeXenBalance = xenBalance || '0';
  
  // Format the raw approval value from context, checking for MAX
  const formattedXenApproval = useMemo(() => {
    if (!xenApprovalRaw || typeof xenApprovalRaw.eq !== 'function') {
      return '0';
    }
    if (xenApprovalRaw.eq(ethers.constants.MaxUint256)) {
      return 'MAX';
    }
    try {
      return ethers.utils.formatUnits(xenApprovalRaw, 18);
    } catch {
      return '0';
    }
  }, [xenApprovalRaw]);

  // Handler for input change - update both raw and display states
  const handleInputChange = useCallback((e) => {
      let value = e.target.value;
      // Allow clearing the input or starting with decimal
      if (value === '' || value === '.') {
          setRawXenAmount(value);
          setDisplayXenAmount(value);
          setError('');
          return;
      }
      // Basic validation for numeric input
      if (!/^\d*\.?\d*$/.test(value)) {
          return; // Prevent non-numeric input
      }

      setRawXenAmount(value); // Store raw value for calculations
      
      // Format for display (allow typing decimals, format on blur/completion if needed)
      // Simple approach: just display what's typed for now
      // More complex: format on blur or use a dedicated input component
      setDisplayXenAmount(value); 
      
      setError('');
  }, []);

  // Format display value when input loses focus (optional enhancement)
  const handleInputBlur = useCallback(() => {
    try {
      if (rawXenAmount && !isNaN(parseFloat(rawXenAmount))) {
        const formatted = parseFloat(rawXenAmount).toFixed(2); // Format to 2 decimals
        setDisplayXenAmount(formatted);
      } else if (rawXenAmount === '') {
        setDisplayXenAmount('');
      }
    } catch (e) {
      console.error("Error formatting on blur:", e);
      // Keep raw value in display if formatting fails
      setDisplayXenAmount(rawXenAmount);
    }
  }, [rawXenAmount]);

  const handleMaxClick = useCallback(() => {
    if (safeXenBalance && parseFloat(safeXenBalance) > 0) {
      try {
        // Use full balance for raw amount
        const parsedBalance = ethers.utils.parseUnits(safeXenBalance, 18);
        const fullFormattedBalance = ethers.utils.formatUnits(parsedBalance, 18);
        setRawXenAmount(fullFormattedBalance);
        
        // Format for display
        const displayFormatted = parseFloat(safeXenBalance).toFixed(2);
        setDisplayXenAmount(displayFormatted);
      } catch (e) {
        // Fallback if parsing fails
        setRawXenAmount(safeXenBalance);
        setDisplayXenAmount(parseFloat(safeXenBalance).toFixed(2));
      }
      setError('');
    }
  }, [safeXenBalance]);
  
  // Handle custom term input change
  const handleTermChange = useCallback((e) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedTerm(0);
      return;
    }
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= MAX_TERM) { 
      setSelectedTerm(numValue);
    } else if (numValue > MAX_TERM) {
        setSelectedTerm(MAX_TERM);
    }
  }, []);

  // Helper function to validate chain consistency - memoized for better performance
  const validateChainConsistency = useCallback(async () => {
    try {
      if (!provider) return false;
      
      const network = await provider.getNetwork();
      const providerChainId = network.chainId;
      
      if (providerChainId !== selectedChainId) {
        toast.error('Network mismatch detected. Please refresh or switch networks in your wallet.');
        return false;
      }
      
      // Validate contract addresses
      const currentAddresses = getCurrentAddresses();
      if (!currentAddresses) return false;
      
      if (!xburnMinterContract || 
          xburnMinterContract.address.toLowerCase() !== currentAddresses.XENBURNER_ADDRESS.toLowerCase()) {
        toast.error('Contract configuration mismatch. Please refresh the page.');
        return false;
      }
      
      return true;
    } catch (error) {
      toast.error('Network validation failed. Please refresh and try again.');
      return false;
    }
  }, [provider, selectedChainId, getCurrentAddresses, xburnMinterContract]);

  // Pre-check if we already have the contract instance - with less frequent logging
  useEffect(() => {
    if (xenContract) {
    } else {
    }
  }, [xenContract?.address]); // Only log when the actual address changes, not on every render

  // --- Approve XEN Handler ---
  const approveXEN = useCallback(async () => {
    setError('');
    const currentAddresses = getCurrentAddresses();
    if (!account || !signer || !currentAddresses || !provider) {
        toast.error('Please connect your wallet and ensure network data is loaded.');
        return;
    }
    
    // Validate chain consistency
    if (!(await validateChainConsistency())) {
      return;
    }
    
    const xenTokenAddress = currentAddresses.XEN_ADDRESS;
    const burnerAddress = currentAddresses.XENBURNER_ADDRESS;
    if (!xenTokenAddress || !burnerAddress) {
        toast.error('XEN or Burner address not found for this network.');
        return;
    }

    if (!rawXenAmount || parseFloat(rawXenAmount) <= 0) {
        toast.error('Please enter a valid amount to approve');
        setError('Invalid amount for approval');
        return;
    }
    if (safelyCompareWithBalance(rawXenAmount, safeXenBalance)) {
      toast.error('Approval amount exceeds your balance');
      setError('Amount exceeds balance');
      return;
    }

    setIsApproveLoading(true);
    try {
        const amountToApproveWei = ethers.utils.parseUnits(rawXenAmount, 18);
        
        // Use the xenContract from context if available, otherwise create a new instance
        let tokenContract;
        if (xenContract) {
            tokenContract = xenContract.connect(signer);
        } else {
            tokenContract = new ethers.Contract(xenTokenAddress, XEN_ABI, signer);
        }
        
        const tx = await tokenContract.approve(burnerAddress, amountToApproveWei);
        
        toast('Approval transaction submitted...', { icon: '⏳' });
        await tx.wait();
        
        // Only pass the refresh flag
        if (fetchBalances) await fetchBalances(true); 
        
        toast.success(`${parseFloat(rawXenAmount).toFixed(2)} XEN tokens approved successfully!`);
    } catch (err) {
        toast.error(`Approval failed: ${err.reason || err.message}`);
        setError('Approval failed');
    } finally {
        setIsApproveLoading(false);
    }
  }, [rawXenAmount, safeXenBalance, account, signer, getCurrentAddresses, provider, validateChainConsistency, xenContract, fetchBalances]);

  // --- Burn XEN Handler ---
  const burnXEN = useCallback(async () => {
    setError('');
    if (!account || !signer || !xburnMinterContract) {
        toast.error('Please connect wallet and ensure contracts loaded');
        return;
    }

    // Validate chain consistency
    if (!(await validateChainConsistency())) {
      return;
    }

    if (!rawXenAmount || parseFloat(rawXenAmount) <= 0) {
        toast.error('Please enter a valid amount to burn');
        setError('Invalid amount');
        return;
    }

    if (parseFloat(rawXenAmount) < BASE_RATIO) {
        toast.error(`Minimum burn amount is ${BASE_RATIO.toLocaleString()} XEN`);
        setError('Amount below minimum');
        return;
    }

    if (safelyCompareWithBalance(rawXenAmount, safeXenBalance)) {
        toast.error('Amount exceeds your balance');
        setError('Amount exceeds balance');
        return;
    }
    
    if (safelyCompareWithBalance(rawXenAmount, formattedXenApproval)) {
        toast.error('Burn amount exceeds approved balance. Please approve first.');
        setError('Approval needed or insufficient');
        return;
    }

    setIsBurnLoading(true);
    try {
        const xburnMinterWithSigner = xburnMinterContract.connect(signer);
        const amountWei = ethers.utils.parseUnits(rawXenAmount, 18);
        
        // Add gasLimit to ensure transaction doesn't fail due to gas estimation
        const gasPrice = await provider.getGasPrice();
        const adjustedGasPrice = gasPrice.mul(120).div(100);
        
        const tx = await xburnMinterWithSigner.burnXEN(amountWei, selectedTerm, {
          gasLimit: 1000000,
          gasPrice: adjustedGasPrice
        });
        
        toast('Burn transaction submitted... ', { icon: '🔥' });
        await tx.wait();
        
        toast.success('XEN burned successfully!');
        
        setRawXenAmount('');
        setDisplayXenAmount('');
        // Use the refresh flag only
        if (fetchBalances) await fetchBalances(true);

    } catch (err) {
        console.error('Error burning XEN:', err);
        toast.error(`Burn failed: ${err.reason || err.message}`);
        setError('Burn transaction failed');
    } finally {
        setIsBurnLoading(false);
    }
  }, [account, signer, xburnMinterContract, validateChainConsistency, rawXenAmount, safeXenBalance, formattedXenApproval, selectedTerm, provider, fetchBalances]);

  // --- Reward Calculation (Matching Contract Logic) --- (More optimized with precise dependencies)
  const { baseAmount, bonus, total, displayMultiplier } = useMemo(() => {
    const inputAmount = parseFloat(rawXenAmount) || 0;
    if (inputAmount <= 0) {
      return { baseAmount: 0, bonus: 0, total: 0, displayMultiplier: 1 };
    }

    const currentBaseAmount = inputAmount / BASE_RATIO;
    
    // Ensure ampStart is valid
    const validAmpStart = ampStart > 0 ? ampStart : 1; // Avoid division by zero

    // Calculate percentages (scale: 0-100)
    const termPercentage = (selectedTerm * 100) / MAX_TERM;
    const ampPercentage = (ampSnapshot * 100) / validAmpStart;

    // Calculate bonus based on contract formula
    // (base * term% * amp%) / 10000
    const calculatedBonus = (currentBaseAmount * termPercentage * ampPercentage) / 10000;
    
    const calculatedTotal = currentBaseAmount + calculatedBonus;
    const calculatedMultiplier = currentBaseAmount > 0 ? calculatedTotal / currentBaseAmount : 1;

    return {
      baseAmount: currentBaseAmount,
      bonus: calculatedBonus,
      total: calculatedTotal,
      displayMultiplier: calculatedMultiplier
    };
  }, [rawXenAmount, selectedTerm, ampStart, ampSnapshot]);

  // Determine if approval button should be shown - memoized to prevent recalculation
  const buttonStates = useMemo(() => {
    const isMaxApproved = formattedXenApproval === "MAX";
    const hasAmount = rawXenAmount && parseFloat(rawXenAmount) > 0; 
    const needsApproval = !isMaxApproved && 
                        hasAmount && 
                        safelyCompareWithBalance(rawXenAmount, formattedXenApproval);
                        
    // Determine if burn button should be enabled
    const canBurn = hasAmount && 
                    !safelyCompareWithBalance(rawXenAmount, safeXenBalance) &&
                    // Burn is allowed if approval is MAX OR if the amount is less than or equal to the formatted approval
                    (isMaxApproved || !safelyCompareWithBalance(rawXenAmount, formattedXenApproval));
    
    return {
      isMaxApproved,
      needsApproval,
      canBurn
    };
  }, [rawXenAmount, formattedXenApproval, safeXenBalance]);

  return (
    <div className="tab-content">
      <h2 className="burn-title burnXEN">Burn XEN Tokens</h2>
      <p className="burn-subtitle">Burn your XEN tokens to mint XBURN!</p>

      <div className="burn-form">
        <div className={`input-token-container ${error ? 'error' : ''}`}>
          <div className="input-token-header">
            <div className="token-info">
              <img src={xenLogo} alt="XEN" className="token-logo" />
              <span className="token-symbol">XEN</span>
            </div>
            <div className="input-field">
              <input
                type="text"
                inputMode="decimal"
                value={displayXenAmount}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="0.00"
                className={error && (error === 'Invalid amount' || error === 'Amount exceeds balance') ? 'input-error' : ''}
                disabled={isApproveLoading || isBurnLoading}
              />
            </div>
            <button 
              className="max-button" 
              onClick={handleMaxClick}
              disabled={!safeXenBalance || parseFloat(safeXenBalance) <= 0 || isApproveLoading || isBurnLoading}
            >
              MAX
            </button>
          </div>
          
          <div className="token-details">
            <div className="balance-info">
              <span className="balance-label">Balance:</span>
              <span className="balance-value">{formatDecimals(safeXenBalance)} XEN</span>
            </div>
            <div className="approved-info">
              <span className="approved-label">Approved:</span>
              <span className="approved-value">
                {formatDecimals(formattedXenApproval)} XEN
              </span>
            </div>
          </div>
        </div>
        
        <div className="term-input-container">
             <div className="term-input-label">
                Term Length (Days)
                <Tooltip content="Longer term lengths provide higher multipliers for your XBURN rewards. Max 3650 days.">
                   <span className="info-icon">ⓘ</span>
                </Tooltip>
             </div>
             <div className="term-input-field">
                <input
                   type="number"
                   value={selectedTerm}
                   onChange={handleTermChange}
                   placeholder="0 days"
                   min="0"
                   max="3650"
                   step="1"
                   className="term-input"
                   disabled={isApproveLoading || isBurnLoading}
                />
                <div className="term-input-note">Multiplier: {formatDecimals(displayMultiplier, 4)}x</div>
             </div>
        </div>

        <div className="button-container single-button-container">
          {buttonStates.needsApproval ? (
              <button
                className="approve-button"
                onClick={approveXEN}
                disabled={isApproveLoading || isBurnLoading || !rawXenAmount || parseFloat(rawXenAmount) <= 0 || safelyCompareWithBalance(rawXenAmount, safeXenBalance)}
              >
                 {isApproveLoading ? <><div className="loader"></div>Approving...</> : 'APPROVE XEN'}
              </button>
          ) : (
              <button
                className={`burn-button ${isApproveLoading ? 'waiting-for-approval' : ''}`}
                onClick={burnXEN}
                disabled={!buttonStates.canBurn || isBurnLoading || isApproveLoading}
              >
                {isBurnLoading ? <><div className="loader"></div>Burning...</> : 'BURN XEN NOW'} 
              </button>
          )}
        </div>

        {error && <div className="error-message tab-error">{error}</div>}

        <div className="section-divider"></div>

        <div className="conversion-info">
          <div className="reward-calculation">
            <div className="reward-header">
              <span>Potential XBURN Reward</span>
            </div>
            
            <div className="base-amount-display">
              <div className="base-label">Base ({formatDecimals(rawXenAmount || 0)} XEN / {BASE_RATIO.toLocaleString()})</div>
              <div className="base-result">
                {formatDecimals(baseAmount, 6)} XBURN
              </div>
            </div>
            
            <div className="reward-formula">
              <div className="formula-label">Term Bonus ({selectedTerm} days, {formatDecimals(ampSnapshot, 0)} AMP)</div>
              <div className="formula-result">
                + {formatDecimals(bonus, 8)} XBURN
              </div>
            </div>
            
            <div className="reward-total">
              <div className="total-label">Estimated Total XBURN</div>
              <div className="total-value">
                {formatDecimals(total, 8)} XBURN
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

BurnXENTab.propTypes = {
  xenBalance: PropTypes.string,
  ampStart: PropTypes.number.isRequired,
  ampSnapshot: PropTypes.number.isRequired,
};

// Wrap the entire component in React.memo to prevent unnecessary re-renders
export default React.memo(BurnXENTab); 