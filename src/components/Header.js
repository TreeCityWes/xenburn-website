import React, { useState, useEffect } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { xburnABI } from '../abis';
import './Header.css';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens/0x22f41abf77905f50df398f21213290597e7414dd';

export function Header() {
  const { address } = useAccount();
  const [displayData, setDisplayData] = useState({
    price: '$0',
    liquidity: '$0',
    marketCap: '$0',
    volume: '$0',
    xenBurned: '0',
    xburnBurned: '0',
    supply: '0'
  });

  // Get stats from contract
  const { data: stats } = useContractRead({
    address: CONTRACT_ADDRESSES.XBURN,
    abi: xburnABI,
    functionName: 'getStats',
    args: ['0x0000000000000000000000000000000000000000'],
    watch: true
  });

  // Format stats with fallback
  const formatStats = (value, index) => {
    if (!stats || !stats[index]) return '0';
    try {
      return Number(formatEther(stats[index])).toLocaleString();
    } catch (error) {
      return '0';
    }
  };

  // Fetch price data from DexScreener
  useEffect(() => {
    const fetchDexData = async () => {
      try {
        const response = await fetch(DEXSCREENER_API);
        const data = await response.json();
        const pair = data.pairs?.[0]; // Get the first pair

        if (pair) {
          setDisplayData(prev => ({
            ...prev,
            price: `$${Number(pair.priceUsd).toFixed(4)}`,
            liquidity: `$${Number(pair.liquidity?.usd || 0).toLocaleString()}`,
            marketCap: `$${Number(pair.fdv || 0).toLocaleString()}`,
            volume: `$${Number(pair.volume?.h24 || 0).toLocaleString()}`
          }));
        }
      } catch (error) {
        console.error('Error fetching DexScreener data:', error);
      }
    };

    fetchDexData();
    const interval = setInterval(fetchDexData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update on-chain data
  useEffect(() => {
    if (stats) {
      setDisplayData(prev => ({
        ...prev,
        xenBurned: formatStats(stats, 4), // globalXenBurned
        xburnBurned: formatStats(stats, 5), // globalXburnBurned
        supply: formatStats(stats, 6), // totalXburnSupply
      }));
    }
  }, [stats]);

  const tickerContent = (
    <>
      <div className="ticker-item">
        <span className="ticker-label">Price</span>
        <span className="ticker-value">{displayData.price}</span>
      </div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">
        <span className="ticker-label">Liquidity</span>
        <span className="ticker-value">{displayData.liquidity}</span>
      </div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">
        <span className="ticker-label">Market Cap</span>
        <span className="ticker-value">{displayData.marketCap}</span>
      </div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">
        <span className="ticker-label">24h Vol</span>
        <span className="ticker-value">{displayData.volume}</span>
      </div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">
        <span className="ticker-label">XEN Burned</span>
        <span className="ticker-value">{displayData.xenBurned}</span>
      </div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">
        <span className="ticker-label">XBURN Burned</span>
        <span className="ticker-value">{displayData.xburnBurned}</span>
      </div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">
        <span className="ticker-label">Supply</span>
        <span className="ticker-value">{displayData.supply}</span>
      </div>
    </>
  );

  return (
    <header className="app-header">
      <div className="header-content container">
        <div className="brand">
          <span className="logo">🔥</span>
          <span className="brand-text">$XBURN</span>
          <span className="network">on BASE</span>
        </div>

        <div className="ticker-wrapper">
          <div className="ticker">
            <div className="ticker-content">
              {tickerContent}
              <div className="ticker-separator">•</div>
              {tickerContent}
              <div className="ticker-separator">•</div>
              {tickerContent}
            </div>
          </div>
        </div>

        <ConnectButton 
          chainStatus="icon"
          accountStatus="address"
          showBalance={false}
        />
      </div>
    </header>
  );
} 