import React from 'react';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './context/WalletContext';
import { BurnPanel } from './components/BurnPanel';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import FireParticles from './components/FireParticles';
import './App.css';

function App() {
  return (
    <WalletProvider>
      <div className="App">
        <FireParticles 
          width={window.innerWidth}
          height={window.innerHeight}
          intensity={0.4} 
          isBackground={true} 
          type="xburn" 
        />
        <Toaster position="top-right" />
        <Navbar />
        <div className="logo-container">
          <img src="/xenburn.png" alt="XENBURNER" />
        </div>
        <main className="main-content">
          <BurnPanel />
        </main>
        <Footer />
      </div>
    </WalletProvider>
  );
}

export default App;
