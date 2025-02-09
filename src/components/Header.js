import React from 'react';
import './Header.css';

export function Header() {
  const tickerContent = (
    <>
      <div className="ticker-item">
        <span className="ticker-label">Contact</span>
        <a href="mailto:wes@burnxen.com" className="ticker-link">wes@burnxen.com</a>
      </div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">
        <span className="ticker-label">Launch Date</span>
        <span className="ticker-value">Q2 2025</span>
      </div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">
        <span className="ticker-label">Website</span>
        <a href="https://burnxen.com" target="_blank" rel="noopener noreferrer" className="ticker-link">burnxen.com</a>
      </div>
      <div className="ticker-separator">•</div>
      <div className="ticker-item">
        <span className="ticker-label">Docs</span>
        <a href="https://xenburner.gitbook.io/xenburner" target="_blank" rel="noopener noreferrer" className="ticker-link">xenburner.gitbook.io</a>
      </div>
    </>
  );

  return (
    <header className="app-header">
      <div className="header-content container">
        <div className="brand">
          <span className="brand-text fire-text">XBURN</span>
          <div className="network-wrapper">
            <span className="network">on BASE</span>
          </div>
        </div>

        <div className="ticker-wrapper">
          <div className="ticker">
            <div className="ticker-content">
              {tickerContent}
              <div className="ticker-separator">•</div>
              {tickerContent}
            </div>
          </div>
        </div>

        <button className="connect-button" disabled>
          Launch Coming Soon
        </button>
      </div>
    </header>
  );
} 
