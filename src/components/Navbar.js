import React from 'react';
import { useWallet } from '../context/WalletContext';
import './Navbar.css';
import FireParticles from './FireParticles';

export const Navbar = ({ onTabChange, activeTab }) => {
  const { account, connect, disconnect, ethBalance, xenBalance, xburnBalance } = useWallet();

  const formatBalance = (balance, type) => {
    if (!balance) return '0';
    if (type === 'ETH') {
      return parseFloat(balance).toFixed(4);
    }
    // For XEN and XBURN, show only 2 decimal places
    return parseFloat(balance).toFixed(2);
  };

  return (
    <nav className="navbar">
      <FireParticles width={window.innerWidth} height={48} intensity={0.2} isBackground={true} />
      <div className="navbar-content">
        <div className="nav-left">
          <span className="nav-brand">XBURN</span>
          <span className="nav-dot">·</span>
          <a href="https://x.com/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="nav-link">@BurnMoreXen</a>
          <span className="nav-dot">·</span>
          <a href="https://t.me/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="nav-link">Telegram</a>
          <span className="nav-dot">·</span>
          <a href="https://xenburner.gitbook.io/xenburner" target="_blank" rel="noopener noreferrer" className="nav-link">GitBook</a>
          <span className="nav-dot">·</span>
          <span className="nav-text">Launch: Q2 2025</span>
        </div>

        <div className="nav-right">
          {account ? (
            <>
              <div className="nav-balances">
                <span className="balance-item">
                  <span className="balance-value">{formatBalance(ethBalance, 'ETH')}</span> ETH
                </span>
                <span className="balance-item">
                  <span className="balance-value">{formatBalance(xenBalance, 'XEN')}</span> XEN
                </span>
                <span className="balance-item">
                  <span className="balance-value">{formatBalance(xburnBalance, 'XBURN')}</span> XBURN
                </span>
              </div>
              <div className="nav-actions">
                <div className="nav-tabs">
                  <button 
                    className={`nav-tab ${activeTab === 'burn' ? 'active' : ''}`}
                    onClick={() => onTabChange('burn')}
                  >
                    Burn
                  </button>
                  <button 
                    className={`nav-tab ${activeTab === 'nfts' ? 'active' : ''}`}
                    onClick={() => onTabChange('nfts')}
                  >
                    NFTs
                  </button>
                </div>
                <button className="wallet-address" onClick={disconnect}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </button>
              </div>
            </>
          ) : (
            <button className="connect-wallet" onClick={connect}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}; 