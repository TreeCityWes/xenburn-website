import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/xen_burner.json';
import './StatsPanel.css';
import FireParticles from './FireParticles';

const XEN_ADDRESS = '0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB';
const XENBURNER_ADDRESS = '0xd60483890f9aae31bc19cef2523072151f23c54c';

const formatDecimals = (value, isRatio = false) => {
  if (!value) return isRatio ? '0.031478' : '0';
  let num = parseFloat(value);
  if (isNaN(num)) return isRatio ? '0.031478' : '0';
  
  // Handle scientific notation
  if (num.toString().includes('e')) {
    num = Number(num.toFixed(20));
  }
  
  // Cap at 999T+
  if (num > 999e12) return '999T+';
  
  // Handle large numbers with proper suffixes
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  
  // Special case for ratio
  if (isRatio) {
    return num.toFixed(6);
  }
  
  // For regular numbers
  if (num < 1) return num.toFixed(2);
  return num.toFixed(2);
};

export const StatsPanel = () => {
  const { account, signer } = useWallet();
  const [stats, setStats] = useState({
    xenBalance: '0',
    xenApproved: '0',
    xenBurned: '0',
    xenSupply: '0',
    xburnBalance: '0',
    xburnApproved: '0',
    xburnBurned: '0',
    xburnSupply: '0',
    xenInPool: '0',
    xburnInPool: '0',
    ratio: '0'
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!account || !signer) return;

      try {
        const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, signer);
        const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
        const pairContract = new ethers.Contract(
          '0x94cE0B0c518D6c269b5f896bB241B32696c01a9a',
          ['function getReserves() view returns (uint112, uint112, uint32)'],
          signer
        );

        // Get user balances and allowances
        const xenBalance = await xenContract.balanceOf(account);
        const xenAllowance = await xenContract.allowance(account, XENBURNER_ADDRESS);
        const xburnBalance = await burnerContract.balanceOf(account);
        const xburnAllowance = await burnerContract.allowance(account, XENBURNER_ADDRESS);

        // Get burned amounts from burner contract
        const userStats = await burnerContract.getStats(account);

        // Get supplies
        const xenSupply = await xenContract.totalSupply();
        const xburnSupply = await burnerContract.totalSupply();

        // Get pool info
        const [reserve0, reserve1] = await pairContract.getReserves();
        const xenInPool = ethers.utils.formatUnits(reserve0, 18);
        const xburnInPool = ethers.utils.formatUnits(reserve1, 18);
        const ratio = (parseFloat(xburnInPool) / parseFloat(xenInPool)).toFixed(6);

        setStats({
          xenBalance: ethers.utils.formatUnits(xenBalance, 18),
          xenApproved: ethers.utils.formatUnits(xenAllowance, 18),
          xenBurned: ethers.utils.formatUnits(userStats.userXenBurned, 18),
          xenSupply: ethers.utils.formatUnits(xenSupply, 18),
          xburnBalance: ethers.utils.formatUnits(xburnBalance, 18),
          xburnApproved: ethers.utils.formatUnits(xburnAllowance, 18),
          xburnBurned: ethers.utils.formatUnits(userStats.userXburnBurned, 18),
          xburnSupply: ethers.utils.formatUnits(xburnSupply, 18),
          xenInPool,
          xburnInPool,
          ratio
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [account, signer]);

  return (
    <>
      <h3>User Stats & Info</h3>
      <div className="stats-grid">
        {/* XEN Stats - White */}
        {[
          { title: "XEN BALANCE", value: stats.xenBalance, type: "xen" },
          { title: "XEN APPROVED", value: stats.xenApproved, type: "xen" },
          { title: "XEN BURNED", value: stats.xenBurned, type: "xen" }
        ].map((stat, i) => (
          <div key={i} className={`stat-box ${stat.type}`}>
            <FireParticles width={200} height={100} intensity={0.3} type={stat.type} />
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">{formatDecimals(stat.value)}</div>
            </div>
          </div>
        ))}

        {/* XBURN Stats - Orange */}
        {[
          { title: "XBURN BALANCE", value: stats.xburnBalance, type: "xburn" },
          { title: "XBURN APPROVED", value: stats.xburnApproved, type: "xburn" },
          { title: "XBURN BURNED", value: stats.xburnBurned, type: "xburn" }
        ].map((stat, i) => (
          <div key={i} className={`stat-box ${stat.type}`}>
            <FireParticles width={200} height={100} intensity={0.3} type={stat.type} />
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">{formatDecimals(stat.value)}</div>
            </div>
          </div>
        ))}

        {/* Supply Stats - Yellow */}
        {[
          { title: "XEN SUPPLY", value: stats.xenSupply, type: "supply" },
          { title: "XBURN SUPPLY", value: stats.xburnSupply, type: "supply" },
          { 
            title: "CONTRACT",
            value: <a 
              href="https://sepolia.etherscan.io/address/0xd60483890f9aae31bc19cef2523072151f23c54c"
              target="_blank"
              rel="noopener noreferrer"
              className="stat-value link"
            >
              $XBURN
            </a>,
            type: "supply"
          }
        ].map((stat, i) => (
          <div key={i} className={`stat-box ${stat.type}`}>
            <FireParticles width={200} height={100} intensity={0.3} type={stat.type} />
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">
                {typeof stat.value === 'object' ? stat.value : formatDecimals(stat.value)}
              </div>
            </div>
          </div>
        ))}

        {/* Pool Stats - Red */}
        {[
          { title: "XEN IN POOL", value: stats.xenInPool, type: "pool" },
          { title: "XBURN IN POOL", value: stats.xburnInPool, type: "pool" },
          { title: "XBURN/XEN RATIO", value: stats.ratio, type: "pool", isRatio: true }
        ].map((stat, i) => (
          <div key={i} className={`stat-box ${stat.type}`}>
            <FireParticles width={200} height={100} intensity={0.3} type={stat.type} />
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">
                {formatDecimals(stat.value, stat.isRatio)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}; 