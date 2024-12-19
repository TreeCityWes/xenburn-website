import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BalancesBar } from './BalancesBar';

export function Header() {
  const { address } = useAccount();
  
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="brand-logo">🔥</div>
          <div className="brand-text">$XBURN</div>
          <div className="network-name">on BASE</div>
        </div>

        <div className="header-right">
          <BalancesBar address={address} />
          <div className="wallet-connect">
            <ConnectButton 
              chainStatus="icon"
              showBalance={false}
            />
          </div>
        </div>
      </div>
    </header>
  );
} 