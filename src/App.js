import React from 'react';
import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config, chains } from './config/wagmi';
import { Header } from './components/Header';
import { AppContent } from './components/AppContent';
import { Footer } from './components/Footer';
import '@rainbow-me/rainbowkit/styles.css';
import './styles/theme.css';

export function App() {
  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider
        chains={chains}
        theme={darkTheme({
          accentColor: '#FF3D00',
          accentColorForeground: 'white',
          borderRadius: 'large',
          fontStack: 'system',
          overlayBlur: 'small',
          modalBackground: '#0D0E13',
          modalBackdropBackground: 'rgba(0, 0, 0, 0.5)',
          modalBorderRadius: '16px',
        })}
        appInfo={{
          appName: 'XENBURNER',
          learnMoreUrl: 'https://docs.xenburner.com',
        }}
        showRecentTransactions={true}
      >
        <div className="app">
          <Header />
          <AppContent />
          <Footer />
        </div>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
