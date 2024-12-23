import React, { useState } from 'react';
import { useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { XBURN_ADDRESS } from '../config/addresses';
import { xburnABI } from '../abis';
import { parseEther, formatEther } from 'viem';

export function BuyAndBurn() {
  const [minReceived, setMinReceived] = useState('0');

  // Get accumulated XEN
  const { data: accumulatedXen } = useContractRead({
    address: XBURN_ADDRESS,
    abi: xburnABI,
    functionName: 'accumulatedXen',
    watch: true
  });

  // Swap XEN for XBURN
  const { write: swapXenForXburn, data: swapData } = useContractWrite({
    address: XBURN_ADDRESS,
    abi: xburnABI,
    functionName: 'swapXenForXburn'
  });

  // Wait for swap transaction
  const { isLoading: isSwapping } = useWaitForTransaction({
    hash: swapData?.hash,
  });

  const handleSwap = () => {
    if (!minReceived) return;
    swapXenForXburn({
      args: [parseEther(minReceived)]
    });
  };

  return (
    <div className="burn-content">
      <h2 className="burn-title">Swap & Burn</h2>
      <p className="burn-description">Swap accumulated XEN for XBURN and burn it automatically!</p>

      <div className="stats-box">
        <div className="stat-item">
          <div className="stat-label">Accumulated XEN</div>
          <div className="stat-value">
            {accumulatedXen ? Number(formatEther(accumulatedXen)).toLocaleString() : '0'}
          </div>
        </div>
      </div>

      <div className="input-wrapper">
        <input
          type="text"
          value={minReceived}
          onChange={(e) => setMinReceived(e.target.value)}
          className="burn-input"
          placeholder="Minimum XBURN to receive"
        />
        <span className="token-suffix">XBURN</span>
      </div>

      <div className="button-container">
        <button 
          className="burn-button"
          onClick={handleSwap}
          disabled={isSwapping || !accumulatedXen || accumulatedXen === 0n}
          style={{ gridColumn: '1 / -1' }}
        >
          {isSwapping ? 'Swapping...' : 'Swap & Burn'}
        </button>
      </div>
    </div>
  );
} 