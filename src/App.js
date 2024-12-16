import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WalletConnect } from './components/WalletConnect';
import { GlobalStats } from './components/GlobalStats';
import { BurnForm } from './components/BurnForm';
import { BuyAndBurn } from './components/BuyAndBurn';
import { BurnXburn } from './components/BurnXburn';
import { useWeb3 } from './hooks/useWeb3';
import { NotificationProvider } from './context/NotificationContext';
import { TransactionProvider } from './context/TransactionContext';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function AppContent() {
  const { account, balance } = useWeb3();
  const [activeTab, setActiveTab] = useState('burn');

  const tabs = [
    { id: 'burn', label: 'Burn CBXEN', icon: '🔥' },
    { id: 'buyburn', label: 'Buy & Burn', icon: '💱' },
    { id: 'xburn', label: 'Burn XBURN', icon: '⚡' },
  ];

  return (
    <div className="App">
      <div className="menu">
        <WalletConnect />
        <div className="balance-list">
          <div className="balance-item">
            <span className="balance-label">ETH:</span>
            <span className="balance-value">
              {account ? Number(balance).toFixed(4) : '0.0'}
            </span>
          </div>
          <div className="balance-item">
            <span className="balance-label">CBXEN:</span>
            <span className="balance-value">0</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">XBURN:</span>
            <span className="balance-value">0</span>
          </div>
        </div>
      </div>
      
      <div className="container">
        <h1>XEN Burner on BASE</h1>
        
        <div className="main-interface">
          <div className="stats-overlay">
            <GlobalStats />
          </div>

          <div className="interface-content">
            <div className="tabs">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  {tab.label}
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode='wait'>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="tab-content"
              >
                {activeTab === 'burn' && (
                  <div className="burn-interface">
                    <h2>Burn CBXEN</h2>
                    <p>1 XBURN = 1,000,000 CBXEN</p>
                    <BurnForm />
                  </div>
                )}
                {activeTab === 'buyburn' && (
                  <div className="buyburn-interface">
                    <BuyAndBurn />
                  </div>
                )}
                {activeTab === 'xburn' && (
                  <div className="xburn-interface">
                    <BurnXburn />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <TransactionProvider>
          <AppContent />
        </TransactionProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
