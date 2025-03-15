import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useGlobalData } from '../context/GlobalDataContext';
import './Navbar.css';
import FireParticles from './FireParticles';

export const Navbar = ({ onTabChange, activeTab }) => {
  const { 
    account, 
    connect, 
    disconnect,
    connecting
  } = useWallet();
  
  const { balances, xenftBurnContract } = useGlobalData();
  const [contractReady, setContractReady] = useState(false);
  
  // Check if the contract is ready
  useEffect(() => {
    const checkContract = async () => {
      if (account) {
        const contract = xenftBurnContract();
        setContractReady(!!contract);
      } else {
        setContractReady(false);
      }
    };
    
    checkContract();
  }, [account, xenftBurnContract]);
  
  const formatBalance = (balance, type) => {
    if (!balance) return '0';
    
    // Convert to number
    const balanceNum = parseFloat(balance);
    
    if (isNaN(balanceNum)) return '0';
    
    if (type === 'ETH') {
      return balanceNum.toFixed(4);
    }
    
    // For XEN and XBURN with larger values, use K/M formatting
    if (balanceNum >= 1000000) {
      return (balanceNum / 1000000).toFixed(2) + 'M';
    } else if (balanceNum >= 1000) {
      return (balanceNum / 1000).toFixed(2) + 'K';
    }
    
    // For smaller values, show 2 decimal places
    return balanceNum.toFixed(2);
  };

  const handleConnect = () => {
    console.log('Connect button clicked');
    connect();
  };
  
  const handleDisconnect = () => {
    console.log('Disconnect button clicked');
    disconnect();
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

        {account ? (
          <>
            <div className={`nav-balances ${!balances ? 'balances-loading' : ''}`}>
              <span className="balance-item">
                <span className="balance-value">{formatBalance(balances?.eth, 'ETH')}</span> ETH
              </span>
              <span className="balance-item">
                <span className="balance-value">{formatBalance(balances?.xen, 'XEN')}</span> XEN
              </span>
              <span className="balance-item">
                <span className="balance-value">{formatBalance(balances?.xburn, 'XBURN')}</span> XBURN
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
                  XLOCK NFTs
                </button>
                <button 
                  className={`nav-tab ${activeTab === 'stats' ? 'active' : ''}`}
                  onClick={() => onTabChange('stats')}
                >
                  Stats
                </button>
              </div>
              <button className="wallet-address" onClick={handleDisconnect} title="Click to disconnect">
                {account.slice(0, 6)}...{account.slice(-4)}
              </button>
            </div>
          </>
        ) : (
          <button 
            className={`connect-wallet ${connecting ? 'connecting' : ''}`} 
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  );
}; 