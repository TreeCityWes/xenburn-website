import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { ethers } from 'ethers';
import { 
  XEN_ADDRESS, 
  XENBURNER_ADDRESS, 
  XEN_ABI, 
  XENBURNER_ABI 
} from '../constants/contracts';
import './StatsTicker.css';

export const StatsTicker = () => {
  const { account, signer } = useWallet();
  const [stats, setStats] = useState({
    xenBalance: '0',
    ethBalance: '0',
    xenBurned: '0',
    xburnBurned: '0',
    accumulationProgress: '0'
  });

  useEffect(() => {
    if (account && signer) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [account, signer, fetchStats]);

  const fetchStats = async () => {
    try {
      const ethBalance = await signer.provider.getBalance(account);
      const xenContract = new ethers.Contract(XEN_ADDRESS, XEN_ABI, signer);
      const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, XENBURNER_ABI, signer);

      const xenBalance = await xenContract.balanceOf(account);
      const stats = await burnerContract.getStats(account);
      const progress = await burnerContract.getAccumulationProgress();
      
      const accumulated = ethers.utils.formatUnits(progress.accumulated, 18);
      const threshold = ethers.utils.formatUnits(progress.threshold, 18);
      const calculatedPercentage = (parseFloat(accumulated) / parseFloat(threshold)) * 100;

      setStats({
        xenBalance: ethers.utils.formatUnits(xenBalance, 18),
        ethBalance: ethers.utils.formatEther(ethBalance),
        xenBurned: ethers.utils.formatUnits(stats.userXenBurned, 18),
        xburnBurned: ethers.utils.formatUnits(stats.userXburnBurned, 18),
        accumulationProgress: calculatedPercentage.toString()
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatNumber = (value) => {
    if (!value) return '0';
    const num = parseFloat(value);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return parseFloat(num.toFixed(2)).toString();
  };

  return (
    <div className="stats-ticker">
      <div className="ticker-content">
        <div className="ticker-item">
          <span className="ticker-label">XEN:</span>
          <span className="ticker-value">{formatNumber(stats.xenBalance)}</span>
        </div>
        <div className="ticker-item">
          <span className="ticker-label">sETH:</span>
          <span className="ticker-value">{formatNumber(stats.ethBalance)}</span>
        </div>
        <div className="ticker-item">
          <span className="ticker-label">XEN Burned:</span>
          <span className="ticker-value">{formatNumber(stats.xenBurned)}</span>
        </div>
        <div className="ticker-item">
          <span className="ticker-label">XBURN Burned:</span>
          <span className="ticker-value">{formatNumber(stats.xburnBurned)}</span>
        </div>
        <div className="ticker-item">
          <span className="ticker-label">Accumulation:</span>
          <span className="ticker-value">{formatNumber(stats.accumulationProgress)}%</span>
        </div>
      </div>
    </div>
  );
}; 