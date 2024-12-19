import React from 'react';
import { useContractRead } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { xburnABI } from '../abis';

export function TopHeader() {
  const { data: stats } = useContractRead({
    address: CONTRACT_ADDRESSES.XBURN,
    abi: xburnABI,
    functionName: 'getGlobalStats',
    watch: true
  });

  return (
    <div className="top-header">
      <div className="header-content">
        <div className="header-left">
          <div className="project-brand">
            <span className="brand-icon">🔥</span>
            <span className="brand-name">$XBURN on Base Network</span>
          </div>
          <div className="price-pills">
            <div className="price-pill">
              <span className="token-name">CBXEN</span>
              <span className="token-price">$0.0032</span>
            </div>
            <div className="price-pill">
              <span className="token-name">XBURN</span>
              <span className="token-price">$0.85</span>
            </div>
          </div>
        </div>

        <div className="ticker-container">
          <div className="ticker-content">
            Over {Number(stats?.[0] || 0).toLocaleString()} CBXEN tokens burned since launch
          </div>
        </div>

        <div className="header-links">
          <a href="#" className="header-link" title="White Paper">
            📄 Docs
          </a>
          <a href="#" className="header-link" title="Join our Telegram">
            💬 Telegram
          </a>
          <a href="#" className="header-link" title="Follow us on Twitter">
            🐦 Twitter
          </a>
          <a href="#" className="header-link" title="View on Block Explorer">
            🔍 Explorer
          </a>
        </div>
      </div>
    </div>
  );
} 