import React from 'react';
import './Footer.css';
// import FireParticles from '../FireParticles/FireParticles'; // Removed

const Footer = () => {
  return (
    <footer className="footer">
      {/* <div className="footer-fire-container">
        <FireParticles count={40} speed={1.2} size={3} position="bottom" />
      </div> Removed */}
      <div className="footer-content">
        <div className="footer-logo">
          <span className="logo-text">XBURN</span>
        </div>
        <div className="footer-links">
          <a href="https://x.com/burnmorexen" target="_blank" rel="noopener noreferrer">Twitter</a>
          <a href="https://t.me/burnmorexen" target="_blank" rel="noopener noreferrer">Telegram</a>
          <a href="https://burnxen.com" target="_blank" rel="noopener noreferrer">Website</a>
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} XENBurner. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer; 