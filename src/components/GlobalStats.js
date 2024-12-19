import React from 'react';
import { useContractRead } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { xburnABI } from '../abis';
import { formatEther } from 'viem';

export function GlobalStats() {
  const { data: stats } = useContractRead({
    address: CONTRACT_ADDRESSES.XBURN,
    abi: xburnABI,
    functionName: 'getGlobalStats',
    watch: true
  });

  const totalBurned = stats ? formatEther(stats[0]) : '0'; // totalXenBurned
  const totalXburnBurned = stats ? formatEther(stats[1]) : '0'; // totalXburnBurned

  return (
    <div className="stats-section">
      <div className="stat-card">
        <div className="stat-label">
          <span>🔥</span>
          <span>CBXEN Burned</span>
        </div>
        <div className="stat-value">
          {Number(totalBurned).toLocaleString()}
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-label">
          <span>💎</span>
          <span>XBURN Earned</span>
        </div>
        <div className="stat-value">
          {Number(totalXburnBurned).toLocaleString()}
        </div>
      </div>
    </div>
  );
} 