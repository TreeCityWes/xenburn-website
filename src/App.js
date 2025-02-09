import React from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import './styles/theme.css';
import './AppStyles.css';

export function App() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <div className="container">
          <div className="coming-soon-content">
            <img src="/xenburn.png" alt="XENBURN" className="hero-logo" />
            <p className="coming-soon-subtitle">The Ultimate XEN Burning Experience</p>
            
            <div className="docs-cta">
              <h2>Read Our Paper</h2>
              <p>Learn about the innovative burning mechanism and tokenomics</p>
              <a href="https://xenburner.gitbook.io/xenburner" target="_blank" rel="noopener noreferrer" className="cta-button">
                Read the Paper →
              </a>
            </div>

            <div className="stats-grid compact">
              <div className="stat-box fire-border">
                <h4>Total CBXEN Burned</h4>
                <div className="stat-value fire-text">0</div>
                <div className="stat-label">CBXEN</div>
              </div>
              <div className="stat-box fire-border">
                <h4>Total Value Burned</h4>
                <div className="stat-value fire-text">$0</div>
                <div className="stat-label">USD</div>
              </div>
              <div className="stat-box fire-border">
                <h4>XBURN Price</h4>
                <div className="stat-value fire-text">$0.00</div>
                <div className="stat-label">USD</div>
              </div>
              <div className="stat-box fire-border">
                <h4>Market Cap</h4>
                <div className="stat-value fire-text">$0</div>
                <div className="stat-label">USD</div>
              </div>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">🔥</span>
                <h3>Burn CBXEN</h3>
                <p>Burn your CBXEN tokens to earn XBURN rewards</p>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💎</span>
                <h3>Earn XBURN</h3>
                <p>Get XBURN tokens for participating in burns</p>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🚀</span>
                <h3>Swap & Burn</h3>
                <p>Automatically swap and burn in one transaction</p>
              </div>
            </div>

            <div className="launch-info">
              <h2>Launch Coming Soon</h2>
              <p>Get ready for the hottest burning experience on Base</p>
              <button className="notify-button" disabled>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
