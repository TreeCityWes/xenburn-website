import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';

export function GlobalStats() {
  const { contract } = useWeb3();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchGlobalStats = useCallback(async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const globalStats = await contract.getGlobalStats();
      setStats({
        totalXenBurned: ethers.utils.formatEther(globalStats.totalXenBurnedAmount),
        totalXburnBurned: ethers.utils.formatEther(globalStats.totalXburnBurnedAmount),
        totalXburnSupply: ethers.utils.formatEther(globalStats.totalXburnSupply),
        accumulatedXen: ethers.utils.formatEther(globalStats.currentlyAccumulatedXen),
      });
    } catch (err) {
      console.error('Error fetching global stats:', err);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    if (contract) {
      fetchGlobalStats();
    }
  }, [contract, fetchGlobalStats]);

  if (loading) return <div className="loading">Loading stats...</div>;

  return stats ? (
    <div className="global-stats">
      <h2>Global Statistics</h2>
      <div className="stats-grid">
        <div className="stat-item">
          <label>Total XEN Burned:</label>
          <span>{Number(stats.totalXenBurned).toLocaleString()} XEN</span>
        </div>
        <div className="stat-item">
          <label>Total XBURN Burned:</label>
          <span>{Number(stats.totalXburnBurned).toLocaleString()} XBURN</span>
        </div>
        <div className="stat-item">
          <label>XBURN Supply:</label>
          <span>{Number(stats.totalXburnSupply).toLocaleString()} XBURN</span>
        </div>
        <div className="stat-item">
          <label>Accumulated XEN:</label>
          <span>{Number(stats.accumulatedXen).toLocaleString()} XEN</span>
        </div>
      </div>
    </div>
  ) : null;
} 