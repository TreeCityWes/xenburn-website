import React, { useState } from 'react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction, useBalance } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { CBXEN_ADDRESS, XBURN_ADDRESS, XENBURNER_ADDRESS } from '../config/addresses';
import xenBurnerABI from '../abis/xburnabi.json';
import erc20ABI from '../abis/erc20abi.json';
import { BuyAndBurn } from './BuyAndBurn';
import BurnXburn from './BurnXburn';
import './BurnForm.css';

export function BurnForm() {
  const [activeTab, setActiveTab] = useState('burn-cbxen');
  const [amount, setAmount] = useState('');
  const { address } = useAccount();

  // Get CBXEN balance
  const { data: cbxenBalance } = useBalance({
    address,
    token: CBXEN_ADDRESS,
    watch: true,
  });

  // Get CBXEN allowance
  const { data: cbxenAllowance } = useContractRead({
    address: CBXEN_ADDRESS,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address, XENBURNER_ADDRESS],
    watch: true,
  });

  // Approve CBXEN
  const { write: approveCbxen, data: approveCbxenData } = useContractWrite({
    address: CBXEN_ADDRESS,
    abi: erc20ABI,
    functionName: 'approve',
  });

  // Wait for CBXEN approval
  const { isLoading: isApprovingCbxen } = useWaitForTransaction({
    hash: approveCbxenData?.hash,
  });

  // Burn CBXEN
  const { write: burnCbxen, data: burnCbxenData } = useContractWrite({
    address: XENBURNER_ADDRESS,
    abi: xenBurnerABI,
    functionName: 'burnXen',
  });

  // Wait for CBXEN burn
  const { isLoading: isBurningCbxen } = useWaitForTransaction({
    hash: burnCbxenData?.hash,
  });

  const handleApprove = async () => {
    if (!amount) return;
    const parsedAmount = parseEther(amount);
    approveCbxen({
      args: [XENBURNER_ADDRESS, parsedAmount],
    });
  };

  const handleBurn = async () => {
    if (!amount) return;
    const parsedAmount = parseEther(amount);
    burnCbxen({
      args: [parsedAmount],
    });
  };

  const handleMax = () => {
    if (cbxenBalance) {
      setAmount(formatEther(cbxenBalance.value));
    }
  };

  const currentAllowance = cbxenAllowance ? formatEther(cbxenAllowance) : '0';
  const hasApproval = Number(currentAllowance) >= (amount ? Number(amount) : 0);

  const renderBurnCBXENContent = () => (
    <div className="burn-content">
      <h2 className="burn-title">Burn CBXEN</h2>
      <p className="burn-description">Burn your CBXEN tokens to earn XBURN rewards!</p>

      <div className="balance-info">
        <span className="balance-label">Available Balance:</span>
        <div className="balance-amount">
          <span className="balance-value">
            {cbxenBalance ? Math.floor(Number(formatEther(cbxenBalance.value))).toLocaleString() : '0'} CBXEN
          </span>
          <button className="max-button" onClick={handleMax}>
            MAX
          </button>
        </div>
      </div>

      <div className="input-wrapper">
        <input
          type="text"
          className="burn-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
        />
        <span className="token-suffix">CBXEN</span>
      </div>

      <div className="approval-info">
        Currently Approved: {Math.floor(Number(currentAllowance)).toLocaleString()} CBXEN
      </div>

      <div className="button-container">
        {!hasApproval && (
          <button
            className="approve-button"
            onClick={handleApprove}
            disabled={isApprovingCbxen || !amount}
          >
            {isApprovingCbxen ? 'Approving...' : 'Approve'}
          </button>
        )}
        <button
          className="burn-button"
          onClick={handleBurn}
          disabled={isBurningCbxen || !amount || !hasApproval}
          style={{ gridColumn: hasApproval ? '1 / -1' : 'auto' }}
        >
          {isBurningCbxen ? 'Burning...' : 'Burn CBXEN'}
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'burn-cbxen':
        return renderBurnCBXENContent();
      case 'burn-xburn':
        return <BurnXburn />;
      case 'swap-burn':
        return <BuyAndBurn />;
      default:
        return renderBurnCBXENContent();
    }
  };

  return (
    <div className="burn-form">
      <div className="burn-tabs">
        <button 
          className={`tab-button ${activeTab === 'burn-cbxen' ? 'active' : ''}`}
          onClick={() => setActiveTab('burn-cbxen')}
        >
          Burn CBXEN
        </button>
        <button 
          className={`tab-button ${activeTab === 'burn-xburn' ? 'active' : ''}`}
          onClick={() => setActiveTab('burn-xburn')}
        >
          Burn XBURN
        </button>
        <button 
          className={`tab-button ${activeTab === 'swap-burn' ? 'active' : ''}`}
          onClick={() => setActiveTab('swap-burn')}
        >
          Swap & Burn
        </button>
      </div>

      {renderContent()}
    </div>
  );
} 