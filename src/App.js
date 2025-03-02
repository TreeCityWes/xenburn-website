import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './context/WalletContext';
import { BurnPanel } from './components/BurnPanel';
import { NFTPanel } from './components/NFTPanel';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { StatsPanel } from './components/StatsPanel';
import { SocialLinks } from './components/SocialLinks';
import FireParticles from './components/FireParticles';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('burn'); // burn or nfts

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <WalletProvider>
      <div className="App" data-active-tab={activeTab}>
        <FireParticles 
          width={window.innerWidth}
          height={window.innerHeight}
          intensity={0.3} 
          isBackground={true} 
          type="xburn" 
        />
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
              My NFTs
            </button>
          </div>
          
          <main className="main-content">
            {activeTab === 'burn' ? <BurnPanel /> : <NFTPanel />}
          </main>
        </div>
        
        <Footer />
      </div>
    </WalletProvider>
  );
}

export default App;
