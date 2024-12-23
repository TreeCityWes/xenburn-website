import React, { useState } from 'react';
import { useAccount, useBalance, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { XBURN_ADDRESS, XENBURNER_ADDRESS } from '../config/addresses';
import { xburnABI } from '../abis';
import erc20ABI from '../abis/erc20abi.json';

const BurnXburn = () => {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');

  // Get XBURN balance
  const { data: xburnBalance } = useBalance({
    address,
    token: XBURN_ADDRESS,
    watch: true,
  });

  // Get XBURN allowance
  const { data: xburnAllowance } = useContractRead({
    address: XBURN_ADDRESS,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address, XENBURNER_ADDRESS],
    watch: true,
  });

  // Approve XBURN
  const { write: approveXburn, data: approveXburnData } = useContractWrite({
    address: XBURN_ADDRESS,
    abi: erc20ABI,
    functionName: 'approve',
  });

  // Wait for XBURN approval
  const { isLoading: isApprovingXburn } = useWaitForTransaction({
    hash: approveXburnData?.hash,
  });

  // Burn XBURN
  const { write: burnXburn, data: burnXburnData } = useContractWrite({
    address: XENBURNER_ADDRESS,
    abi: xburnABI,
    functionName: 'burnXburn',
  });

  // Wait for XBURN burn
  const { isLoading: isBurningXburn } = useWaitForTransaction({
    hash: burnXburnData?.hash,
  });

  const handleApprove = async () => {
    if (!amount) return;
    const parsedAmount = parseEther(amount);
    approveXburn({
      args: [XENBURNER_ADDRESS, parsedAmount],
    });
  };

  const handleBurn = async () => {
    if (!amount) return;
    const parsedAmount = parseEther(amount);
    burnXburn({
      args: [parsedAmount],
    });
  };

  const handleMax = () => {
    if (xburnBalance) {
      setAmount(formatEther(xburnBalance.value));
    }
  };

  const currentAllowance = xburnAllowance ? formatEther(xburnAllowance) : '0';
  const hasApproval = Number(currentAllowance) >= (amount ? Number(amount) : 0);

  return (
    <div className="burn-content">
      <h2 className="burn-title">Burn XBURN</h2>
      <p className="burn-description">Burn your XBURN tokens to increase your share of rewards!</p>

      <div className="stats-box">
        <div className="stat-item">
          <div className="stat-label">XBURN Balance</div>
          <div className="stat-value">
            {xburnBalance ? formatEther(xburnBalance.value) : '0'}
          </div>
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
        <span className="token-suffix">XBURN</span>
      </div>

      <div className="approval-info">
        Currently Approved: {Number(currentAllowance).toLocaleString()} XBURN
      </div>

      <div className="button-container">
        {!hasApproval && (
          <button
            className="approve-button"
            onClick={handleApprove}
            disabled={isApprovingXburn || !amount}
          >
            {isApprovingXburn ? 'Approving...' : 'Approve'}
          </button>
        )}
        <button
          className="burn-button"
          onClick={handleBurn}
          disabled={isBurningXburn || !amount || !hasApproval}
          style={{ gridColumn: hasApproval ? '1 / -1' : 'auto' }}
        >
          {isBurningXburn ? 'Burning...' : 'Burn XBURN'}
        </button>
      </div>
    </div>
  );
};

export default BurnXburn; 