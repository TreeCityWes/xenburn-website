import React from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FireParticles } from './components/FireParticles';
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
            <p className="coming-soon-subtitle">Burn. More. Xen.</p>
            
            <div className="cta-grid">
              <div className="cta-card">
                <div className="fire-background">
                  <FireParticles width={300} height={200} intensity={0.6} isBackground={true} />
                </div>
                <div className="fire-container">
                  <FireParticles width={300} height={200} intensity={0.8} />
                </div>
                <h2>The LitBook</h2>
                <p>Discover the innovative burning mechanism and tokenomics behind XBURN</p>
                <a href="https://xenburner.gitbook.io/xenburner" target="_blank" rel="noopener noreferrer" className="cta-button">
                  Read Docs →
                </a>
              </div>
              
              <div className="cta-card">
                <div className="fire-background">
                  <FireParticles width={300} height={200} intensity={0.6} isBackground={true} />
                </div>
                <div className="fire-container">
                  <FireParticles width={300} height={200} intensity={0.8} />
                </div>
                <h2>Fire Follow</h2>
                <p>Stay updated with the latest news and announcements</p>
                <a href="https://x.com/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="cta-button">
                  Follow on X.com →
                </a>
              </div>
              
              <div className="cta-card">
                <div className="fire-background">
                  <FireParticles width={300} height={200} intensity={0.6} isBackground={true} />
                </div>
                <div className="fire-container">
                  <FireParticles width={300} height={200} intensity={0.8} />
                </div>
                <h2>Spark Chat</h2>
                <p>Connect with other burners and get involved</p>
                <a href="https://t.me/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="cta-button">
                  Join Telegram →
                </a>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <h4>Total CBXEN Burned</h4>
                <div className="stat-value">0</div>
                <div className="stat-label">CBXEN</div>
              </div>
              <div className="stat-box">
                <h4>Total Value Burned</h4>
                <div className="stat-value">$0</div>
                <div className="stat-label">USD</div>
              </div>
              <div className="stat-box">
                <h4>XBURN Price</h4>
                <div className="stat-value">$0.00</div>
                <div className="stat-label">USD</div>
              </div>
              <div className="stat-box">
                <h4>Market Cap</h4>
                <div className="stat-value">$0</div>
                <div className="stat-label">USD</div>
              </div>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-fire">
                  <FireParticles width={300} height={200} intensity={0.5} isBackground={true} />
                </div>
                <h3>Burn CBXEN</h3>
                <p>Burn your CBXEN tokens to earn XBURN rewards</p>
              </div>
              <div className="feature-item">
                <div className="feature-fire">
                  <FireParticles width={300} height={200} intensity={0.5} isBackground={true} />
                </div>
                <h3>Earn XBURN</h3>
                <p>Get XBURN tokens for participating in burns</p>
              </div>
              <div className="feature-item">
                <div className="feature-fire">
                  <FireParticles width={300} height={200} intensity={0.5} isBackground={true} />
                </div>
                <h3>Swap & Burn</h3>
                <p>Automatically swap and burn in one transaction</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
