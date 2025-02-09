import React from 'react';
import { useAccount, useBalance, useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { xburnABI } from '../abis';
import erc20ABI from '../abis/erc20abi.json';
import './StatsPanel.css';

export function StatsPanel() {
  const { address, isConnected } = useAccount();

  // Get user balances
  const { data: cbxenBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.CBXEN,
    watch: true,
    enabled: isConnected,
  });

  const { data: xburnBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.XBURN,
    watch: true,
    enabled: isConnected,
  });

  // Get user stats from contract
  const { data: stats } = useContractRead({
    address: CONTRACT_ADDRESSES.XBURN,
    abi: xburnABI,
    functionName: 'getStats',
    args: [address || '0x0000000000000000000000000000000000000000'],
    watch: true,
    enabled: isConnected,
  });

  // Get CBXEN allowance
  const { data: cbxenAllowance } = useContractRead({
    address: CONTRACT_ADDRESSES.CBXEN,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address || '0x0000000000000000000000000000000000000000', CONTRACT_ADDRESSES.XBURN],
    watch: true,
    enabled: isConnected,
  });

  const formatNumber = (value) => {
    if (!value) return '0';
    try {
      const num = Number(formatEther(value));
      if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
      if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
      return num.toFixed(2);
    } catch (error) {
      return '0';
    }
  };

  if (!isConnected) {
    return (
      <div className="stats-panel">
        <h2 className="stats-title">User Stats & Info</h2>
        <div className="stats-grid">
          <div className="stat-box balance">
            <span className="stat-label">Connect Wallet</span>
            <span className="stat-value">-</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-panel">
      <h2 className="stats-title">User Stats & Info</h2>
      <div className="stats-grid">
        <div className="stat-box balance">
          <span className="stat-label">CBXEN Balance</span>
          <span className="stat-value">{cbxenBalance ? formatNumber(cbxenBalance.value) : '0'}</span>
        </div>
        
        <div className="stat-box balance">
          <span className="stat-label">XBURN Balance</span>
          <span className="stat-value">{xburnBalance ? formatNumber(xburnBalance.value) : '0'}</span>
        </div>
        
        <div className="stat-box allowance">
          <span className="stat-label">CBXEN Approved</span>
          <span className="stat-value">{cbxenAllowance ? formatNumber(cbxenAllowance) : '0'}</span>
        </div>
        
        <div className="stat-box burned">
          <span className="stat-label">Your XEN Burned</span>
          <span className="stat-value">{stats ? formatNumber(stats[0]) : '0'}</span>
        </div>
        
        <div className="stat-box burned">
          <span className="stat-label">XBURN Burned</span>
          <span className="stat-value">{stats ? formatNumber(stats[1]) : '0'}</span>
        </div>
        
        <div className="stat-box rewards">
          <span className="stat-label">XBURN Balance</span>
          <span className="stat-value">{stats ? formatNumber(stats[2]) : '0'}</span>
        </div>
        
        <div className="stat-box claimed">
          <span className="stat-label">Your Burn %</span>
          <span className="stat-value">{stats ? formatNumber(stats[3]) : '0'}%</span>
        </div>
        
        <div className="stat-box pending">
          <span className="stat-label">Global Burn %</span>
          <span className="stat-value">{stats ? formatNumber(stats[7]) : '0'}%</span>
        </div>
      </div>
    </div>
  );
} 