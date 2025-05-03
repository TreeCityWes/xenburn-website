import React from 'react';
import { useWallet } from '../context/WalletContext';
import { useGlobalData } from '../context/GlobalDataContext';
import { NetworkSwitcher } from './NetworkSwitcher';
import './Navbar.css';
import { getChainById } from '../constants/chains';

// --- Launch Control Flag --- 
// Set to true to enable wallet connection for launch
const isLaunchReady = true;
// ---------------------------

export const Navbar = ({ onTabChange, activeTab }) => {
  const { 
    account, 
    connect, 
    disconnect,
    isConnected,
    isConnecting: connecting,
    selectedChainId
  } = useWallet();
  
  const { balances } = useGlobalData();
  
  // Get current chain info
  const currentChain = getChainById(selectedChainId);
  const chainName = currentChain?.name || 'Unknown Network';
  const chainIcon = currentChain?.icon || null;
  
  const formatBalance = (balance, type) => {
    if (!balance) return '0';
    
    // Convert to number
    const balanceNum = parseFloat(balance);
    
    if (isNaN(balanceNum)) return '0';
    
    if (type === 'ETH') {
      return balanceNum.toFixed(4);
    }
    
    // For XEN and XBURN with larger values, use K/M/B formatting
    if (balanceNum >= 1000000000) {
      return (balanceNum / 1000000000).toFixed(2) + 'B';
    }
    if (balanceNum >= 1000000) {
      return (balanceNum / 1000000).toFixed(2) + 'M';
    } else if (balanceNum >= 1000) {
      return (balanceNum / 1000).toFixed(2) + 'K';
    }
    
    // For smaller values, show 2 decimal places
    return balanceNum.toFixed(2);
  };

  const handleConnect = () => {
    if (!isLaunchReady) {
      console.log('Wallet connection disabled until launch.');
      // Optionally show a toast message
      // import toast from 'react-hot-toast';
      // toast('Launching soon!');
      return;
    }
    console.log('Connect button clicked');
    connect();
  };
  
  const handleDisconnect = () => {
    console.log('Disconnect button clicked');
    disconnect();
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-content">
          <div className="nav-left">
            <span className="nav-brand">XBURN</span>
            <span className="nav-dot">·</span>
            <a href="https://x.com/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="nav-link">@BurnMoreXen</a>
            <span className="nav-dot">·</span>
            <a href="https://t.me/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="nav-link">Telegram</a>
            <span className="nav-dot">·</span>
            <a href="https://burnxen.gitbook.io/burnmorexen" target="_blank" rel="noopener noreferrer" className="nav-link">GitBook</a>
            <span className="nav-dot">·</span>
            <a href="/XBurnAudit-April2025.pdf" target="_blank" rel="noopener noreferrer" className="nav-link">Audit</a>
          </div>

          {isConnected && account ? (
            <>
              <div className={`nav-balances ${!balances ? 'balances-loading' : ''}`}>
                <span className="network-indicator" title={chainName}>
                  {chainIcon && <img src={chainIcon} alt={chainName} className="chain-icon" />}
                </span>
                <span className="balance-item" title={balances?.eth || '0'}>
                  <span className="balance-value">{formatBalance(balances?.eth, 'ETH')}</span> ETH
                </span>
                <span className="balance-item" title={balances?.xen || '0'}>
                  <span className="balance-value">{formatBalance(balances?.xen, 'XEN')}</span> XEN
                </span>
                <span className="balance-item" title={balances?.xburn || '0'}>
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
                <NetworkSwitcher />
                <button className="wallet-address" onClick={handleDisconnect} title="Click to disconnect">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </button>
              </div>
            </>
          ) : (
            <button 
              className={`connect-wallet ${connecting ? 'connecting' : ''}`} 
              onClick={handleConnect}
              disabled={connecting || !isLaunchReady}
            >
              {isLaunchReady 
                ? (connecting ? 'Connecting...' : 'Connect Wallet') 
                : 'Launching 4/20/25'}
            </button>
          )}
        </div>
      </nav>
      
      {/* Mobile-only navigation container with two rows */}
      <div className="mobile-nav-container">
        {/* First row: Main navigation */}
        <div className="mobile-nav-links">
          <a 
            href="#" 
            className={`mobile-nav-link ${activeTab === 'burn' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onTabChange('burn'); }}
          >
            BURN
          </a>
          <a 
            href="#" 
            className={`mobile-nav-link ${activeTab === 'nfts' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onTabChange('nfts'); }}
          >
            XLOCK NFT
          </a>
          <a 
            href="#" 
            className={`mobile-nav-link ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onTabChange('stats'); }}
          >
            STATS
          </a>
        </div>
        
        {/* Second row: Burn tabs (only show on burn tab) */}
        {activeTab === 'burn' && (
          <div className="mobile-tab-links">
            <a 
              href="#" 
              className={`mobile-tab-link ${activeTab === 'burn' && window.burnActiveTab === 'burnXEN' ? 'active' : ''}`}
              onClick={(e) => { 
                e.preventDefault(); 
                if (window.setActiveBurnTab) window.setActiveBurnTab('burnXEN');
              }}
            >
              Burn XEN
            </a>
            <a 
              href="#" 
              className={`mobile-tab-link ${activeTab === 'burn' && window.burnActiveTab === 'burnXBURN' ? 'active' : ''}`}
              onClick={(e) => { 
                e.preventDefault(); 
                if (window.setActiveBurnTab) window.setActiveBurnTab('burnXBURN');
              }}
            >
              Burn XBURN
            </a>
            <a 
              href="#" 
              className={`mobile-tab-link ${activeTab === 'burn' && window.burnActiveTab === 'swapBurn' ? 'active' : ''}`}
              onClick={(e) => { 
                e.preventDefault(); 
                if (window.setActiveBurnTab) window.setActiveBurnTab('swapBurn');
              }}
            >
              Swap & Burn
            </a>
          </div>
        )}
      </div>
    </>
  );
}; 