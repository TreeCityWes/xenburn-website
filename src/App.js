import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig, chains } from './config/wagmi';
import { NotificationProvider } from './context/NotificationContext';
import { AppContent } from './components/AppContent';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import '@rainbow-me/rainbowkit/styles.css';
import './AppStyles.css';

function App() {
  return (
    <ErrorBoundary>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider 
          chains={chains} 
          theme={darkTheme({
            accentColor: '#FF3D00',
            borderRadius: 'small'
          })}
        >
          <NotificationProvider>
            <div className="App">
              <Header />
              <AppContent />
              <Footer />
            </div>
          </NotificationProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    </ErrorBoundary>
  );
}

export default App;
