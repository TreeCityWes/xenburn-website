import React from 'react';
import './IntroBanner.css';

export const IntroBanner = () => {
  return (
    <div className="intro-banner">
      <div className="sparx-banner">
        <div className="banner-content">
          <div className="banner-line">
            <img src="/sparx-circle-logo.png" alt="SPARX" className="sparx-logo" />
            <span>XenFerno LP Farm now live on Sepolia Testnet</span>
          </div>
          <div className="banner-line">
            <a href="https://sparx.burnxen.com" target="_blank" rel="noopener noreferrer">sparx.burnxen.com</a>
            <span className="separator">-</span>
            <a href="https://xenburner.gitbook.io/sparx" target="_blank" rel="noopener noreferrer">Read Gitbook</a>
          </div>
        </div>
      </div>
    </div>
  );
}; 