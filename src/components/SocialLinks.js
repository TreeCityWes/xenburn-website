import React from 'react';
import './SocialLinks.css';

export const SocialLinks = () => {
  return (
    <div className="social-links">
      <div className="social-card">
        <h3 className="social-title">The LitBook</h3>
        <p className="social-description">
          Discover the innovative burning mechanism and tokenomics behind XBURN
        </p>
        <a 
          href="https://xenburner.gitbook.io/xenburner" 
          target="_blank" 
          rel="noopener noreferrer"
          className="social-button"
        >
          Read Docs →
        </a>
      </div>

      <div className="social-card">
        <h3 className="social-title">Fire Follow</h3>
        <p className="social-description">
          Stay updated with the latest news and announcements
        </p>
        <a 
          href="https://x.com/BurnMoreXen" 
          target="_blank" 
          rel="noopener noreferrer"
          className="social-button"
        >
          Follow on X.com →
        </a>
      </div>

      <div className="social-card">
        <h3 className="social-title">Spark Chat</h3>
        <p className="social-description">
          Connect with other burners and get involved
        </p>
        <a 
          href="https://t.me/BurnMoreXen" 
          target="_blank" 
          rel="noopener noreferrer"
          className="social-button"
        >
          Join Telegram →
        </a>
      </div>
    </div>
  );
}; 