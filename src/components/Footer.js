import React from 'react';
import './Footer.css';
import FireParticles from './FireParticles';

export const Footer = () => {
  return (
    <footer className="footer">
      <FireParticles width={window.innerWidth} height={30} intensity={0.2} isBackground={true} />
      <div className="footer-content">
        <div className="footer-links">
          <a href="https://t.me/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="footer-link">
            Telegram
          </a>
          <a href="https://xenburner.gitbook.io/xenburner" target="_blank" rel="noopener noreferrer" className="footer-link">
            GitBook
          </a>
          <a href="https://x.com/BurnMoreXen" target="_blank" rel="noopener noreferrer" className="footer-link">
            X.com
          </a>
        </div>
      </div>
    </footer>
  );
}; 