import React from 'react';
import './Header.css';
import { Helmet } from 'react-helmet';
import { FireParticles } from './FireParticles';

export function Header() {
  const tickerItem = (
    <>
      <div className="ticker-item">Launch: Q2 2024</div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">X: <a href="https://x.com/BurnMoreXen" className="ticker-link">@BurnMoreXen</a></div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">TG: <a href="https://t.me/BurnMoreXen" className="ticker-link">BurnMoreXen</a></div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">Docs: <a href="https://xenburner.gitbook.io/xenburner" className="ticker-link">GitBook</a></div>
    </>
  );

  return (
    <header className="app-header">
      <div className="header-fire">
        <FireParticles width={window.innerWidth} height={80} intensity={1.2} isBackground={true} />
      </div>
      <div className="header-content container">
        <div className="brand">
          <span className="brand-text">XBURN</span>
        </div>

        <div className="ticker-wrapper">
          <div className="ticker">
            <div className="ticker-content">
              {tickerItem}
              {tickerItem}
              {tickerItem}
              {tickerItem}
            </div>
          </div>
        </div>

        <button className="connect-button" disabled>
          Coming Soon
        </button>
      </div>
      <Helmet>
        <title>XenBurn - Burn Your Xen</title>
        <meta name="description" content="XenBurn - A platform to burn your Xen tokens" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.burnxen.com/" />
        <meta property="og:title" content="XenBurn - Burn Your Xen" />
        <meta property="og:description" content="XenBurn - A platform to burn your Xen tokens" />
        <meta property="og:image" content="https://www.burnxen.com/xenburn.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.burnxen.com/" />
        <meta property="twitter:title" content="XenBurn - Burn Your Xen" />
        <meta property="twitter:description" content="XenBurn - A platform to burn your Xen tokens" />
        <meta property="twitter:image" content="https://www.burnxen.com/xenburn.png" />
      </Helmet>
    </header>
  );
} 
