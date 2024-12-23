import React from 'react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <a href="https://docs.xenburn.io" target="_blank" rel="noopener noreferrer" className="footer-link">
          Documentation
        </a>
        <a href="https://t.me/xenburn" target="_blank" rel="noopener noreferrer" className="footer-link">
          Community
        </a>
        <a href="https://twitter.com/xenburn" target="_blank" rel="noopener noreferrer" className="footer-link">
          Twitter
        </a>
      </div>
    </footer>
  );
} 