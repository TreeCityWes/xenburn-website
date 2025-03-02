import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/XBurnMinter.json';
import './StatsPanel.css';
import FireParticles from './FireParticles';
import { XEN_ADDRESS, XENBURNER_ADDRESS, PAIR_ADDRESS } from '../constants/contracts';

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
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  
  // Special case for ratio
  if (isRatio) {
    return num.toFixed(6);
  }
  
  // For smaller numbers, show fewer decimals for better display
  if (num < 0.01) return num.toFixed(4);
  if (num < 1) return num.toFixed(2);
  
  // For integers, show whole numbers only
  if (Number.isInteger(num)) return num.toString();
  
  // For regular numbers
  return num.toFixed(1);
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
    ratio: '0',
    globalXenBurned: '0',
    globalXburnBurned: '0',
    burnRate: '10000'
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!account || !signer) return;

      try {
        const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, signer);
        const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
        const pairContract = new ethers.Contract(
          PAIR_ADDRESS,
          ['function getReserves() view returns (uint112, uint112, uint32)'],
          signer
        );

        // Use Promise.allSettled to handle all stat fetching
        const [
          xenBalanceResult, 
          xenAllowanceResult,
          xburnBalanceResult,
          xburnAllowanceResult,
          userStatsResult,
          xenSupplyResult,
          xburnSupplyResult,
          poolReservesResult,
          globalXenBurnedResult,
          globalXburnBurnedResult,
          burnRateResult
        ] = await Promise.allSettled([
          xenContract.balanceOf(account),
          xenContract.allowance(account, XENBURNER_ADDRESS),
          burnerContract.balanceOf(account),
          burnerContract.allowance(account, XENBURNER_ADDRESS),
          burnerContract.getStats(account),
          xenContract.totalSupply(),
          burnerContract.totalSupply(),
          pairContract.getReserves(),
          burnerContract.totalXenBurned(),
          burnerContract.totalXburnBurned(),
          burnerContract.BASE_RATIO()
        ]);

        // Safely extract values using helper function
        const getSuccessValue = (result) => result.status === 'fulfilled' ? result.value : null;

        const xenBalance = getSuccessValue(xenBalanceResult);
        const xenAllowance = getSuccessValue(xenAllowanceResult);
        const xburnBalance = getSuccessValue(xburnBalanceResult);
        const xburnAllowance = getSuccessValue(xburnAllowanceResult);
        const userStats = getSuccessValue(userStatsResult) || [0, 0, 0, 0, 0, 0, 0, 0];
        const xenSupply = getSuccessValue(xenSupplyResult);
        const xburnSupply = getSuccessValue(xburnSupplyResult);
        const poolReserves = getSuccessValue(poolReservesResult);
        const globalXenBurned = getSuccessValue(globalXenBurnedResult);
        const globalXburnBurned = getSuccessValue(globalXburnBurnedResult);
        const burnRate = getSuccessValue(burnRateResult);

        // Process pool reserves
        let xenInPool = '0';
        let xburnInPool = '0';
        let ratio = '0.031478';
        
        if (poolReserves) {
          const [reserve0, reserve1] = poolReserves;
          xenInPool = ethers.utils.formatUnits(reserve0 || 0, 18);
          xburnInPool = ethers.utils.formatUnits(reserve1 || 0, 18);
          ratio = parseFloat(xburnInPool) > 0 
            ? (parseFloat(xenInPool) / parseFloat(xburnInPool)).toFixed(6) 
            : '0.031478';
        }

        console.log('Global XEN Burned:', globalXenBurned);
        console.log('Global XBURN Burned:', globalXburnBurned);
        console.log('Burn Rate:', burnRate);
        console.log('User Stats:', userStats);

        setStats({
          xenBalance: ethers.utils.formatUnits(xenBalance || 0, 18),
          xenApproved: ethers.utils.formatUnits(xenAllowance || 0, 18),
          xenBurned: ethers.utils.formatUnits(userStats[0] || 0, 18),
          xenSupply: ethers.utils.formatUnits(xenSupply || 0, 18),
          xburnBalance: ethers.utils.formatUnits(xburnBalance || 0, 18),
          xburnApproved: ethers.utils.formatUnits(xburnAllowance || 0, 18),
          xburnBurned: ethers.utils.formatUnits(userStats[1] || 0, 18),
          xburnSupply: ethers.utils.formatUnits(xburnSupply || 0, 18),
          xenInPool,
          xburnInPool,
          ratio,
          globalXenBurned: ethers.utils.formatUnits(globalXenBurned || 0, 18),
          globalXburnBurned: ethers.utils.formatUnits(globalXburnBurned || 0, 18),
          burnRate: burnRate ? burnRate.toString() : '10000'
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        console.log('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [account, signer]);

  return (
    <div className="stats-panel">
      <h3>User Stats & Info</h3>
      <div className="stats-grid">
        {/* Row 1: XEN Stats - Blue */}
        <div className="stat-box xen">
          <FireParticles width={100} height={70} intensity={0.3} type="xen" />
          <div className="stat-content">
            <div className="stat-title">XEN BALANCE</div>
            <div className="stat-value">{formatDecimals(stats.xenBalance)}</div>
          </div>
        </div>
        
        <div className="stat-box xen">
          <FireParticles width={100} height={70} intensity={0.3} type="xen" />
          <div className="stat-content">
            <div className="stat-title">XEN APPROVED</div>
            <div className="stat-value">{formatDecimals(stats.xenApproved)}</div>
          </div>
        </div>
        
        <div className="stat-box xen">
          <FireParticles width={100} height={70} intensity={0.3} type="xen" />
          <div className="stat-content">
            <div className="stat-title">USER XEN 🔥</div>
            <div className="stat-value">{formatDecimals(stats.xenBurned)}</div>
          </div>
        </div>

        {/* Row 2: XBURN Stats - Orange */}
        <div className="stat-box xburn">
          <FireParticles width={100} height={70} intensity={0.3} type="xburn" />
          <div className="stat-content">
            <div className="stat-title">XBURN BALANCE</div>
            <div className="stat-value">{formatDecimals(stats.xburnBalance)}</div>
          </div>
        </div>
        
        <div className="stat-box xburn">
          <FireParticles width={100} height={70} intensity={0.3} type="xburn" />
          <div className="stat-content">
            <div className="stat-title">XBURN APPROVED</div>
            <div className="stat-value">{formatDecimals(stats.xburnApproved)}</div>
          </div>
        </div>
        
        <div className="stat-box xburn">
          <FireParticles width={100} height={70} intensity={0.3} type="xburn" />
          <div className="stat-content">
            <div className="stat-title">USER XBURN 🔥</div>
            <div className="stat-value">{formatDecimals(stats.xburnBurned)}</div>
          </div>
        </div>

        {/* Row 3: Supply Stats - Yellow */}
        <div className="stat-box supply">
          <FireParticles width={100} height={70} intensity={0.3} type="supply" />
          <div className="stat-content">
            <div className="stat-title">XEN SUPPLY</div>
            <div className="stat-value">{formatDecimals(stats.xenSupply)}</div>
          </div>
        </div>
        
        <div className="stat-box supply">
          <FireParticles width={100} height={70} intensity={0.3} type="supply" />
          <div className="stat-content">
            <div className="stat-title">XBURN SUPPLY</div>
            <div className="stat-value">{formatDecimals(stats.xburnSupply)}</div>
          </div>
        </div>
        
        <div className="stat-box supply">
          <FireParticles width={100} height={70} intensity={0.3} type="supply" />
          <div className="stat-content">
            <div className="stat-title">CONTRACT</div>
            <div className="stat-value">
              <a 
                href="https://sepolia.etherscan.io/address/0x00a99B5cAEdaDFEFd34DD7AF4fec3A909eBa0667"
                target="_blank"
                rel="noopener noreferrer"
                className="stat-value link"
              >
                $XBURN
              </a>
            </div>
          </div>
        </div>

        {/* Row 4: Pool Stats - Red */}
        <div className="stat-box pool">
          <FireParticles width={100} height={70} intensity={0.3} type="pool" />
          <div className="stat-content">
            <div className="stat-title">XEN IN POOL</div>
            <div className="stat-value">{formatDecimals(stats.xenInPool)}</div>
          </div>
        </div>
        
        <div className="stat-box pool">
          <FireParticles width={100} height={70} intensity={0.3} type="pool" />
          <div className="stat-content">
            <div className="stat-title">XBURN IN POOL</div>
            <div className="stat-value">{formatDecimals(stats.xburnInPool)}</div>
          </div>
        </div>
        
        <div className="stat-box pool">
          <FireParticles width={100} height={70} intensity={0.3} type="pool" />
          <div className="stat-content">
            <div className="stat-title">XEN PER XBURN</div>
            <div className="stat-value">{formatDecimals(stats.ratio, true)}</div>
          </div>
        </div>

        {/* Row 5: Global Burn Stats - Purple */}
        <div className="stat-box global">
          <FireParticles width={100} height={70} intensity={0.3} type="global" />
          <div className="stat-content">
            <div className="stat-title">GLOBAL XEN 🔥</div>
            <div className="stat-value">{formatDecimals(stats.globalXenBurned)}</div>
          </div>
        </div>
        
        <div className="stat-box global">
          <FireParticles width={100} height={70} intensity={0.3} type="global" />
          <div className="stat-content">
            <div className="stat-title">GLOBAL XBURN 🔥</div>
            <div className="stat-value">{formatDecimals(stats.globalXburnBurned)}</div>
          </div>
        </div>
        
        <div className="stat-box global">
          <FireParticles width={100} height={70} intensity={0.3} type="global" />
          <div className="stat-content">
            <div className="stat-title">BURN RATIO</div>
            <div className="stat-value">{stats.burnRate}:1</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 