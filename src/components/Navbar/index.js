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