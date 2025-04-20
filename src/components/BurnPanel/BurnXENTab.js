import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Tooltip } from '../../utils/components/Tooltip';
import { XEN_ADDRESS, XENBURNER_ADDRESS } from '../../constants/addresses';
import xenAbi from '../../contracts/xen.json';
import { useWallet } from '../../context/WalletContext';

// Import utility functions
import { 
  formatDecimals,
  calculateMultiplier,
  safelyCompareWithBalance,
  parseInputValue
} from '../../utils/tokenUtils';

// Use public path for XEN logo
const xenLogo = '/xen.png';

// BurnXENTab component for burning XEN tokens
const BurnXENTab = ({ 
  xenBalance,
  ampStart,
  ampSnapshot,
}) => {
  // Get wallet and global data context
  const { provider, account, signer, xburnMinterContract, fetchBalances, xenApprovalRaw } = useWallet();
  
  // Internal State
  const [xenAmount, setXenAmount] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(0);
  const [isApproveLoading, setIsApproveLoading] = useState(false);
  const [isBurnLoading, setIsBurnLoading] = useState(false);
  const [error, setError] = useState('');

  // Add default value for xenBalance
  const safeXenBalance = xenBalance || '0';
  
  // Format the raw approval value from context
  const formattedXenApproval = xenApprovalRaw 
    ? ethers.utils.formatUnits(xenApprovalRaw, 18) 
    : '0';

  // Handler for input change
  const handleInputChange = (e) => {
      const value = parseInputValue(e.target.value);
      setXenAmount(value);
      setError('');
  };

  const handleMaxClick = () => {
    if (safeXenBalance && parseFloat(safeXenBalance) > 0) {
      setXenAmount(ethers.utils.formatUnits(ethers.utils.parseUnits(safeXenBalance, 18), 18));
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
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 3650) { 
      setSelectedTerm(numValue);
    } else if (numValue > 3650) {
        setSelectedTerm(3650);
    }
  };

  // --- Approve XEN Handler ---
  const approveXEN = async () => {
    setError('');
    if (!account || !signer) {
        toast.error('Please connect your wallet');
        return;
    }

    // Add check for valid amount before approving
    if (!xenAmount || parseFloat(xenAmount) <= 0) {
        toast.error('Please enter a valid amount to approve');
        setError('Invalid amount for approval');
        return;
    }
    // Check if amount exceeds balance (optional but good practice)
    if (safelyCompareWithBalance(xenAmount, safeXenBalance)) {
      toast.error('Approval amount exceeds your balance');
      setError('Amount exceeds balance');
      return;
    }

    setIsApproveLoading(true);
    try {
        console.log(`Approving ${xenAmount} XEN tokens...`);
        const amountToApproveWei = ethers.utils.parseUnits(xenAmount, 18);
        
        const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, signer);
        const tx = await xenContract.approve(XENBURNER_ADDRESS, amountToApproveWei);
        
        toast('Approval transaction submitted. Waiting for confirmation...', { icon: '⏳' });
        await tx.wait();
        
        // Refetch ALL balances (including approval) after transaction confirmation
        if (fetchBalances) await fetchBalances(provider, account, true); 
        
        toast.success(`${xenAmount} XEN tokens approved successfully!`);
    } catch (err) {
        console.error('Error approving XEN tokens:', err);
        toast.error(`Approval failed: ${err.reason || err.message}`);
        setError('Approval failed');
    } finally {
        setIsApproveLoading(false);
    }
  };

  // --- Burn XEN Handler ---
  const burnXEN = async () => {
    setError('');
    if (!account || !signer || !xburnMinterContract) {
        toast.error('Please connect wallet and ensure contracts loaded');
        return;
    }

    if (!xenAmount || parseFloat(xenAmount) <= 0) {
        toast.error('Please enter a valid amount to burn');
        setError('Invalid amount');
        return;
    }

    if (safelyCompareWithBalance(xenAmount, safeXenBalance)) {
        toast.error('Amount exceeds your balance');
        setError('Amount exceeds balance');
        return;
    }
    
    // Use formattedXenApproval from context for comparison
    if (safelyCompareWithBalance(xenAmount, formattedXenApproval)) {
        toast.error('Burn amount exceeds approved balance. Please approve first.');
        setError('Approval needed or insufficient');
        return;
    }

    setIsBurnLoading(true);
    try {
        console.log(`Burning ${xenAmount} XEN for ${selectedTerm} days...`);
        const xburnMinterWithSigner = xburnMinterContract.connect(signer);
        const amountWei = ethers.utils.parseUnits(xenAmount, 18);
        
        const tx = await xburnMinterWithSigner.burnXEN(amountWei, selectedTerm);
        
        toast('Burn transaction submitted. Waiting for confirmation...', { icon: '🔥' });
        await tx.wait();
        
        toast.success('XEN burned successfully!');
        
        setXenAmount('');
        // Refresh balances (including approval) via WalletContext
        if (fetchBalances) await fetchBalances(provider, account, true);

    } catch (err) {
        console.error('Error burning XEN:', err);
        toast.error(`Burn failed: ${err.reason || err.message}`);
        setError('Burn transaction failed');
    } finally {
        setIsBurnLoading(false);
    }
  };

  // Calculate multiplier based on term days and amplifier values
  const multiplier = calculateMultiplier(selectedTerm, ampStart, ampSnapshot);
  
  // Calculate term percentage
  const termPercentage = (selectedTerm / 365) * 100;
  
  // Use the AMP value directly from the contract
  const ampValue = ampSnapshot;
  
  // Calculate base amount
  const baseAmount = xenAmount && parseFloat(xenAmount) > 0 
    ? parseFloat(xenAmount) / 100000 
    : 0;
    
  // Calculate bonus
  const bonus = baseAmount * (termPercentage * ampValue / 100);
  
  // Calculate total
  const total = baseAmount + bonus;

  // Determine if approval button should be shown
  const isMaxApproved = formattedXenApproval === "MAX";
  const needsApproval = !isMaxApproved && 
                      xenAmount && 
                      parseFloat(xenAmount) > 0 && 
                      safelyCompareWithBalance(xenAmount, formattedXenApproval);
                      
  // Determine if burn button should be enabled
  const canBurn = xenAmount && 
                  parseFloat(xenAmount) > 0 && 
                  !safelyCompareWithBalance(xenAmount, safeXenBalance) &&
                  // Burn is allowed if approval is MAX OR if the amount is less than or equal to the formatted approval
                  (isMaxApproved || !safelyCompareWithBalance(xenAmount, formattedXenApproval));

  return (
    <div className="burn-xen-tab">
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
                value={xenAmount}
                onChange={handleInputChange}
                placeholder="0.0"
                className={error && (error === 'Invalid amount' || error === 'Amount exceeds balance') ? 'input-error' : ''}
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
            <div className="term-input-note">Multiplier: {formatDecimals(multiplier, 4)}x</div>
          </div>
        </div>

        <div className="button-container">
          {needsApproval && (
            <button
              className="approve-button"
              onClick={approveXEN}
              disabled={isApproveLoading || isBurnLoading || !xenAmount || parseFloat(xenAmount) <= 0}
            >
              {isApproveLoading ? (
                <>
                  <div className="loader"></div>
                  Approving...
                </>
              ) : (
                'APPROVE XEN'
              )}
            </button>
          )}
          <button
            className="burn-button"
            onClick={burnXEN}
            disabled={!canBurn || isBurnLoading || isApproveLoading}
          >
            {isBurnLoading ? (
              <>
                <div className="loader"></div>
                Burning...
              </>
            ) : isApproveLoading ? (
              <>
                <div className="loader"></div>
                Approving...
              </>
            ) : (
              'BURN XEN NOW'
            )}
          </button>
        </div>

        {error && <div className="error-message tab-error">{error}</div>}

        <div className="section-divider"></div>

        <div className="conversion-info">
          <div className="reward-calculation">
            <div className="reward-header">
              <span>Potential XBURN Reward</span>
              <Tooltip content="This is an estimate based on current AMP and selected term. Actual reward determined at time of burn.">
                <span className="info-icon">ⓘ</span>
              </Tooltip>
            </div>
            
            <div className="base-amount-display">
              <div className="base-label">Base ({formatDecimals(xenAmount || 0)} XEN / 100k)</div>
              <div className="base-result">
                {formatDecimals(baseAmount, 6)} XBURN
              </div>
            </div>
            
            <div className="reward-formula">
              <div className="formula-label">Term Bonus ({selectedTerm} days, {formatDecimals(multiplier, 4)}x)</div>
              <div className="formula-result">
                + {formatDecimals(bonus, 6)} XBURN
              </div>
            </div>
            
            <div className="reward-total">
              <div className="total-label">Estimated Total XBURN</div>
              <div className="total-value">
                {formatDecimals(total, 6)} XBURN
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

export default BurnXENTab; 