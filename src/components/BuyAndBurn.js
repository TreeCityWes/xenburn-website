import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { useNotification } from '../context/NotificationContext';

export function BuyAndBurn() {
  const { contract } = useWeb3();
  const { notify, updateNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [accumulatedXen, setAccumulatedXen] = useState('0');
  const [canBuyAndBurn, setCanBuyAndBurn] = useState(false);

  const fetchAccumulatedXen = useCallback(async () => {
    try {
      const accumulated = await contract.accumulatedXen();
      setAccumulatedXen(accumulated.toString());
      setCanBuyAndBurn(accumulated.gte(ethers.utils.parseEther('1000000000'))); // 1B threshold
    } catch (err) {
      console.error('Error fetching accumulated XEN:', err);
    }
  }, [contract]);

  useEffect(() => {
    if (contract) {
      fetchAccumulatedXen();
    }
  }, [contract, fetchAccumulatedXen]);

  const handleBuyAndBurn = async () => {
    if (!contract || !canBuyAndBurn) return;

    try {
      setLoading(true);
      const notificationId = notify('Initiating Buy & Burn...', 'info');

      const tx = await contract.swapXenForXburn(0);
      updateNotification(notificationId, 'Transaction submitted. Waiting for confirmation...', 'info');

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        updateNotification(notificationId, 'Buy & Burn successful!', 'success');
        await fetchAccumulatedXen();
      } else {
        updateNotification(notificationId, 'Buy & Burn failed', 'error');
      }
    } catch (err) {
      notify(`Buy & Burn failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card green-card">
      <h2>Buy and Burn CBXEN</h2>
      <div className="stats-grid">
        <div className="stats-item">
          <div className="stats-label">Accumulated CBXEN</div>
          <div className="stats-value">
            {ethers.utils.formatEther(accumulatedXen)} CBXEN
          </div>
        </div>
        <div className="stats-item">
          <div className="stats-label">Required for Buy & Burn</div>
          <div className="stats-value">1B CBXEN</div>
        </div>
      </div>
      <button 
        onClick={handleBuyAndBurn}
        disabled={loading || !canBuyAndBurn}
        className="button green-button"
      >
        {loading ? 'Processing...' : 'Buy and Burn XBURN'}
      </button>
    </div>
  );
} 