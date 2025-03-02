import React from 'react';
import './InfoCards.css';
import FireParticles from './FireParticles';

export const InfoCards = () => {
  return (
    <div className="info-cards">
      <div className="info-card">
        <FireParticles width={200} height={100} intensity={0.2} type="xburn" />
        <div className="info-card-content">
          <h3>The LitBook</h3>
          <p>Discover the innovative burning mechanism and tokenomics behind XBURN</p>
        </div>
        <a href="https://xenburner.gitbook.io/xenburner" className="info-button" target="_blank" rel="noopener noreferrer">
          <span>DOCS</span>
          <span>→</span>
        </a>
      </div>

      <div className="info-card">
        <FireParticles width={200} height={100} intensity={0.2} type="xburn" />
        <div className="info-card-content">
          <h3>Fire Follow</h3>
          <p>Stay updated with the latest news and announcements</p>
        </div>
        <a href="https://x.com/burnmorexen" className="info-button" target="_blank" rel="noopener noreferrer">
          <span>X.COM</span>
          <span>→</span>
        </a>
      </div>

      <div className="info-card">
        <FireParticles width={200} height={100} intensity={0.2} type="xburn" />
        <div className="info-card-content">
          <h3>Spark Convo</h3>
          <p>Connect with other burners and get involved</p>
        </div>
        <a href="https://t.me/burnmorexen" className="info-button" target="_blank" rel="noopener noreferrer">
          <span>TELEGRAM</span>
          <span>→</span>
        </a>
      </div>
    </div>
  );
}; 