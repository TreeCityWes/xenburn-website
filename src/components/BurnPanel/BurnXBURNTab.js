import React from 'react';
import { formatDecimals } from '../../utils/tokenUtils';
import { Tooltip } from '../../utils/components';

/**
 * BurnXBURNTab - Component for the "Burn XBURN" tab content
 */
const BurnXBURNTab = ({
  amount,
  setAmount,
  balance,
  approved,
  isLoading,
  approving,
  handleApprove,
  handleBurn,
  amountExceedsBalance
}) => {
  // Determine if approval is needed
  const needsApproval = parseFloat(approved) < parseFloat(amount || 0);
  const hasAmount = amount && parseFloat(amount) > 0;
  const isApproved = hasAmount && !needsApproval && !amountExceedsBalance;

  return (
    <div className="tab-content">
      <h2 className="burn-title burnXBURN">Burn XBURN Tokens</h2>
      <p className="burn-subtitle">
        NOTE: No rewards exist for burning $XBURN here. 
      </p>
      
      <div className="burn-form">
        <div className="input-token-container">
          <div className="input-token-header">
            <div className="token-info">
              <img src="/logo192.png" alt="XBURN" className="token-logo" />
              <span className="token-symbol">XBURN</span>
            </div>
            <div className="input-field">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className={amountExceedsBalance ? 'input-error' : ''}
                disabled={isLoading || approving}
              />
            </div>
            <button 
              className="max-button" 
              onClick={() => balance && setAmount(balance)}
              disabled={!balance || balance === '0' || isLoading || approving}
            >
              MAX
            </button>
          </div>
          
          <div className="token-details">
            <div className="balance-info">
              <span className="balance-label">Balance:</span>
              <span className="balance-value">{formatDecimals(balance)} XBURN</span>
            </div>
            <div className="approved-info">
              <span className="approved-label">Approved:</span>
              <span className="approved-value">{formatDecimals(approved)} XBURN</span>
            </div>
          </div>
        </div>
        
        {/* Button container - always in the same position */}
        <div className="button-container">
          {/* Approve Button Wrapper */}
          <div className={needsApproval ? 'button-wrapper approve-wrapper' : 'button-wrapper approve-wrapper hidden'}>
            <button
              className="approve-button"
              onClick={handleApprove}
              disabled={approving || isLoading || !hasAmount || amountExceedsBalance || isApproved}
            >
              {approving ? (
                <>
                  <div className="loader"></div>
                  Approving...
                </>
              ) : (
                'APPROVE XBURN'
              )}
            </button>
          </div>
          
          {/* Burn Button Wrapper */}
          <div className="button-wrapper burn-wrapper">
            <button
              className="burn-button"
              onClick={handleBurn}
              disabled={
                isLoading || 
                approving ||
                !hasAmount || 
                amountExceedsBalance ||
                needsApproval
              }
            >
              {isLoading ? (
                <>
                  <div className="loader"></div>
                  Burning...
                </>
              ) : approving ? (
                <>
                  <div className="loader"></div>
                  Waiting for approval...
                </>
              ) : (
                'BURN XBURN NOW'
              )}
            </button>
          </div>
        </div>
        
        <div className="section-divider"></div>
        
        <div className="conversion-info">
          <div className="reward-calculation">
            <div className="reward-header">
              <span>Burn Confirmation</span>
              <Tooltip text="Burning XBURN tokens permanently removes them from circulation, increasing the value of remaining tokens">
                <span className="info-icon">ⓘ</span>
              </Tooltip>
            </div>
            
            <div className="base-amount-display">
              <div className="base-label">Amount to Burn</div>
              <div className="base-result">
                {formatDecimals(amount || '0', 2)} XBURN
              </div>
            </div>
            
            <div className="reward-formula">
              <div className="formula-label">Current Balance</div>
              <div className="formula-result">
                {formatDecimals(balance, { useCommas: true })} XBURN
              </div>
            </div>
            
            <div className="reward-total">
              <div className="total-label">Balance After Burn</div>
              <div className="total-value">
                {formatDecimals(
                  Math.max(0, parseFloat(balance) - parseFloat(amount || 0)), 
                  { useCommas: true }
                )} XBURN
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BurnXBURNTab; 