import React from 'react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-links">
          <a href="https://x.com/burnmorexen" target="_blank" rel="noopener noreferrer" className="footer-link">
            X (Twitter)
          </a>
          <a href="https://t.me/xenburner" target="_blank" rel="noopener noreferrer" className="footer-link">
            Telegram
          </a>
          <a href="https://xenburner.gitbook.io/xenburner" target="_blank" rel="noopener noreferrer" className="footer-link">
            Docs
          </a>
          <a href="mailto:wes@burnxen.com" className="footer-link">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
} 
