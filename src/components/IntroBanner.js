import React from 'react';
import './IntroBanner.css';

export const IntroBanner = () => {
  return (
    <div className="intro-banner">
      <div className="sparx-banner">
        <p>
          <span>🔥 $SPARX now live on XenFerno Farms (Sepolia)</span>
          <span className="separator">•</span>
          <a href="https://sparx.burnxen.com" target="_blank" rel="noopener noreferrer">Visit Website</a>
          <span className="separator">•</span>
          <a href="https://xenburner.gitbook.io/sparx" target="_blank" rel="noopener noreferrer">Read Docs</a>
        </p>
      </div>
    </div>
  );
}; 