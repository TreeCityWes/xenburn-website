import React from 'react';
import './IntroBanner.css';

export const IntroBanner = () => {
  return (
    <div className="intro-banner">
      <div className="sparx-banner">
        <p>
          <img src="/sparx-circle-logo.png" alt="SPARX" className="sparx-logo" />
          <span>XenFerno LP Farm now live on Sepolia Testnet at</span>
          <a href="https://sparx.burnxen.com" target="_blank" rel="noopener noreferrer">sparx.burnxen.com</a>
          <span>-</span>
          <a href="https://xenburner.gitbook.io/sparx" target="_blank" rel="noopener noreferrer">Read Gitbook</a>
        </p>
      </div>
    </div>
  );
}; 