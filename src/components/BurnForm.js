import React, { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { formatEther, parseEther, hexToBigInt } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { cbXenABI, xburnABI } from '../abis';
import { BuyAndBurn } from './BuyAndBurn';
import { BurnXburn } from './BurnXburn';

export function BurnForm() {
  const [activeTab, setActiveTab] = useState('burn');
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [needsApproval, setNeedsApproval] = useState(true);

  // Get current allowance
  const { data: allowance } = useContractRead({
    address: CONTRACT_ADDRESSES.CBXEN,
    abi: cbXenABI,
    functionName: 'allowance',
    args: [address, CONTRACT_ADDRESSES.XBURN],
    watch: true
  });

  // Get CBXEN balance
  const { data: cbxenBalance } = useContractRead({
    address: CONTRACT_ADDRESSES.CBXEN,
    abi: cbXenABI,
    functionName: 'balanceOf',
    args: [address],
    watch: true
  });

  // Approve CBXEN
  const { write: approve, isLoading: isApproving, data: approveData } = useContractWrite({
    address: CONTRACT_ADDRESSES.CBXEN,
    abi: cbXenABI,
    functionName: 'approve'
  });

  // Wait for approval transaction
  const { isLoading: isApprovalPending } = useWaitForTransaction({
    hash: approveData?.hash,
    onSuccess: () => {
      checkAllowance();
    }
  });

  // Burn CBXEN
  const { write: burn, isLoading: isBurning } = useContractWrite({
    address: CONTRACT_ADDRESSES.XBURN,
    abi: xburnABI,
    functionName: 'burnXEN'
  });

  // Check if approval is needed
  useEffect(() => {
    if (allowance && amount) {
      checkAllowance();
    }
  }, [allowance, amount]);

  useEffect(() => {
    if (allowance) {
      console.log('Current allowance:', formatEther(allowance));
    }
  }, [allowance]);

  const checkAllowance = () => {
    if (!allowance || !amount) {
      setNeedsApproval(true);
      return;
    }
    
    try {
      const currentAllowance = hexToBigInt(allowance);
      const requiredAmount = hexToBigInt(parseEther(amount));
      setNeedsApproval(currentAllowance < requiredAmount);
    } catch (error) {
      console.error('Error checking allowance:', error);
      setNeedsApproval(true);
    }
  };

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };

  const handleApprove = () => {
    if (!amount) return;
    approve({ 
      args: [CONTRACT_ADDRESSES.XBURN, parseEther(amount)] 
    });
  };

  const handleBurn = () => {
    if (!amount) return;
    burn({ 
      args: [parseEther(amount)] 
    });
  };

  return (
    <div className="burn-form">
      <div className="tab-buttons">
        <button 
          className={`tab-button ${activeTab === 'burn' ? 'active' : ''}`}
          onClick={() => setActiveTab('burn')}
        >
          Burn CBXEN
        </button>
        <button 
          className={`tab-button ${activeTab === 'buyburn' ? 'active' : ''}`}
          onClick={() => setActiveTab('buyburn')}
        >
          Buy & Burn
        </button>
        <button 
          className={`tab-button ${activeTab === 'xburn' ? 'active' : ''}`}
          onClick={() => setActiveTab('xburn')}
        >
          Burn XBURN
        </button>
      </div>

      {activeTab === 'burn' && (
        <div className="burn-content">
          <h2 className="burn-title">Burn CBXEN for XBURN Rewards</h2>
          <p className="burn-description">Burn your CBXEN tokens and earn XBURN tokens!</p>

          <div className="conversion-box">
            <div className="conversion-rate">1 XBURN = 1,000,000 CBXEN</div>
          </div>

          <div className="input-group">
            <div className="balance-info">
              <span>Available Balance:</span>
              <div className="balance-amount">
                <span>{cbxenBalance ? Number(formatEther(cbxenBalance)).toLocaleString() : '0'} CBXEN</span>
                <button 
                  className="max-button"
                  onClick={() => setAmount(cbxenBalance ? formatEther(cbxenBalance) : '0')}
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="input-wrapper">
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                className="burn-input"
              />
              <span className="input-suffix">CBXEN</span>
            </div>
          </div>

          {needsApproval ? (
            <button 
              className="action-button approve-button"
              onClick={handleApprove}
              disabled={isApproving || isApprovalPending || !amount}
            >
              {isApproving || isApprovalPending ? 'Approving...' : 'Approve CBXEN'}
            </button>
          ) : (
            <button 
              className="action-button burn-button"
              onClick={handleBurn}
              disabled={isBurning || !amount}
            >
              Burn CBXEN
            </button>
          )}

          <div className="approval-status">
            <div className="approval-label">Currently Approved:</div>
            <div className="approval-amount">
              {allowance ? Number(formatEther(allowance)).toLocaleString() : '0'} CBXEN
            </div>
          </div>

          <div className="help-section">
            <div className="help-text">
              First Time? <span className="help-highlight">Approve CBXEN</span> before burning.
            </div>
            <div className="help-links">
              <a href="#" className="help-link">Read Whitepaper</a>
              <a href="#" className="help-link">Join Telegram</a>
              <a href="#" className="help-link">Follow Twitter</a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'buyburn' && <BuyAndBurn />}
      {activeTab === 'xburn' && <BurnXburn />}
    </div>
  );
} 