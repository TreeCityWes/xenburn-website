import React, { useEffect } from 'react';
import './App.css';
import BurnPanel from './components/BurnPanel';
import { NFTPanel } from './components/NFTPanel';
import { StatsPanel } from './components/StatsPanel';
import { Navbar } from './components/Navbar';
import { useWallet } from './context/WalletContext';
import { useGlobalData } from './context/GlobalDataContext';
import { Footer } from './components/Footer';
import { IntroBanner } from './components/IntroBanner';

function App() {
  const { isConnected, selectedChainId, isConnecting, isLoadingContracts } = useWallet();
  const { 
    activeTab,
    setActiveTab,
    loadNFTs
  } = useGlobalData();
  
  // Handle tab changes
  const handleTabChange = (tab) => {
    console.log(`App: Tab changed to ${tab}`);
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
    
    // Trigger specific data loading depending on tab
    if (tab === 'nfts' && isConnected) {
      console.log('App: Triggering NFT load for NFT tab.');
      loadNFTs(true);
    }
  };
  
  // On initial load
  useEffect(() => {
    console.log(`App: Initial load or network change, active tab: ${activeTab}, chain: ${selectedChainId}`);
  }, [activeTab, selectedChainId]);
  
  // Determine loading state for transitions
  const isAppLoading = isConnecting || isLoadingContracts;
  
  // Render app content based on selected tab
  const renderContent = () => {
    switch (activeTab) {
      case 'nfts':
        return <NFTPanel />;
      case 'stats':
        return <StatsPanel />;
      case 'burn':
      default:
        return <BurnPanel />;
    }
  };

  return (
    <div className="App">
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
      
      <div className={`app-content-container ${isAppLoading ? 'app-content-loading' : ''}`}>
        {/* Logo and Banner */}
        <div className="logo-container">
          <img src="/xenburn.png" alt="XENBURNER" />
        </div>
        <IntroBanner />

        <div className="main-content">
          {renderContent()}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

export default App;
