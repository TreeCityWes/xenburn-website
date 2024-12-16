import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { useNotification } from '../context/NotificationContext';

export function BurnXburn() {
  const { contract, account } = useWeb3();
  const { notify, updateNotification } = useNotification();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    userBurned: '0',
    totalBurned: '0'
  });

  const fetchBurnStats = useCallback(async () => {
    try {
      const [userStats, globalStats] = await Promise.all([
        contract.userXburnBurns(account),
        contract.totalXburnBurned()
      ]);
      
      setStats({
        userBurned: userStats.toString(),
        totalBurned: globalStats.toString()
      });
    } catch (err) {
      console.error('Error fetching burn stats:', err);
    }
  }, [contract, account]);

  useEffect(() => {
    if (contract && account) {
      fetchBurnStats();
    }
  }, [contract, account, fetchBurnStats]);

  const handleBurn = async () => {
    if (!contract || !amount) return;

    try {
      setLoading(true);
      const amountWei = ethers.utils.parseEther(amount);
      const notificationId = notify('Burning XBURN...', 'info');

      const tx = await contract.burnXburn(amountWei);
      updateNotification(notificationId, 'Transaction submitted. Waiting for confirmation...', 'info');
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        updateNotification(notificationId, 'XBURN burned successfully!', 'success');
        setAmount('');
        await fetchBurnStats();
      } else {
        updateNotification(notificationId, 'Burn failed', 'error');
      }
    } catch (err) {
      notify(`Error burning XBURN: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card burn-card">
      <h2>Burn XBURN</h2>
      <div className="stats-grid">
        <div className="stats-item">
          <div className="stats-label">Your Total XBURN Burned</div>
          <div className="stats-value">
            {ethers.utils.formatEther(stats.userBurned)} XBURN
          </div>
        </div>
        <div className="stats-item">
          <div className="stats-label">Global XBURN Burned</div>
          <div className="stats-value">
            {ethers.utils.formatEther(stats.totalBurned)} XBURN
          </div>
        </div>
      </div>
      <div className="burn-controls">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter XBURN amount"
          disabled={loading}
          min="0"
          step="any"
        />
        <button
          onClick={handleBurn}
          disabled={loading || !amount}
          className="button red-button"
        >
          {loading ? 'Burning...' : 'Burn XBURN'}
        </button>
      </div>
    </div>
  );
} 