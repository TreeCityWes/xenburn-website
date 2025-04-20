import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { useGlobalData } from '../../context/GlobalDataContext';
import './Navbar.css';

export const Navbar = ({ onTabChange, activeTab }) => {
  const { account, connect, disconnect } = useWallet();
  const { balances } = useGlobalData();

  const formatBalance = (balance, type) => {
    if (!balance) return '0';
    const num = parseFloat(balance);
    if (type === 'ETH') {
      return num.toFixed(4);
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <nav className="navbar">
      <div className="nav-content">
        <div className="nav-links">
          <button 
            className={`nav-link ${activeTab === 'burn' ? 'active' : ''}`}
            onClick={() => onTabChange('burn')}
          >
            Burn XEN
          </button>
          <button 
            className={`nav-link ${activeTab === 'nfts' ? 'active' : ''}`}
            onClick={() => onTabChange('nfts')}
          >
            XBURN NFTs
          </button>
          <button 
            className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => onTabChange('stats')}
          >
            Stats
          </button>
          <div className="nav-left">
            <span className="nav-brand">XBURN</span>
            <span className="nav-dot">·</span>
            <a href="https://x.com/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="nav-link">@BurnMoreXen</a>
            <span className="nav-dot">·</span>
            <a href="https://t.me/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="nav-link">Telegram</a>
            <span className="nav-dot">·</span>
            <a href="https://xenburner.gitbook.io/xenburner" target="_blank" rel="noopener noreferrer" className="nav-link">GitBook</a>
            <span className="nav-dot">·</span>
            <a 
              href="/XBurnAudit-April2025.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="nav-link external-link" 
            >
              2025 AI Audit
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', opacity: 0.7 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>

        <div className="wallet-section">
          {account ? (
            <>
              <div className="balances">
                <span className="balance-item">
                  <span className="balance-label">ETH:</span>
                  <span className="balance-value">{formatBalance(balances.eth, 'ETH')}</span>
                </span>
                <span className="balance-item">
                  <span className="balance-label">XEN:</span>
                  <span className="balance-value">{formatBalance(balances.xen, 'XEN')}</span>
                </span>
                <span className="balance-item">
                  <span className="balance-label">XBURN:</span>
                  <span className="balance-value">{formatBalance(balances.xburn, 'XBURN')}</span>
                </span>
              </div>
              <button className="wallet-button" onClick={disconnect}>
                {account.slice(0, 6)}...{account.slice(-4)}
              </button>
            </>
          ) : (
            <button className="wallet-button" onClick={connect}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}; 