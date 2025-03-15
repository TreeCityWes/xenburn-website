import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './context/WalletContext';
import { GlobalDataProvider } from './context/GlobalDataContext';
import BurnPanel from './components/BurnPanel';
import { NFTPanel } from './components/NFTPanel';
import StatsPanel from './components/StatsPanel/index';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BurnPanelProvider } from './components/BurnPanel/BurnPanelContext';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('burn'); // burn, nfts, or stats

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <WalletProvider>
      <GlobalDataProvider>
        <div className="App" data-active-tab={activeTab}>
          <div className="app-background">

          </div>
          <Toaster position="top-right" />
          <Navbar onTabChange={handleTabChange} activeTab={activeTab} />
          
          <div className="app-content-container">
            <div className="logo-container">
              <img src="/xenburn.png" alt="XENBURNER" />
            </div>
            
            <div className="tab-navigation">
              <button 
                className={`tab-button ${activeTab === 'burn' ? 'active' : ''}`}
                onClick={() => handleTabChange('burn')}
              >
                Burn XEN
              </button>
              <button 
                className={`tab-button ${activeTab === 'nfts' ? 'active' : ''}`}
                onClick={() => handleTabChange('nfts')}
              >
                XBURN NFTs
              </button>
              <button 
                className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => handleTabChange('stats')}
              >
                Stats
              </button>
            </div>
            
            <main className="main-content">
              {activeTab === 'burn' && (
                <BurnPanelProvider>
                  <BurnPanel />
                </BurnPanelProvider>
              )}
              {activeTab === 'nfts' && <NFTPanel />}
              {activeTab === 'stats' && <StatsPanel />}
            </main>
          </div>
          
          <Footer />
        </div>
      </GlobalDataProvider>
    </WalletProvider>
  );
}

export default App;
