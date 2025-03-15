import React from 'react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-logo">
          <img src="/xenburn.png" alt="XenBurner" className="footer-logo-img" />
        </div>
        
        <div className="footer-links">
          <div className="footer-section">
            <h3>Resources</h3>
            <ul>
              <li><a href="https://docs.xenburner.io" target="_blank" rel="noopener noreferrer">Documentation</a></li>
              <li><a href="https://github.com/XenBurner" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="https://medium.com/@xenburner" target="_blank" rel="noopener noreferrer">Blog</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Community</h3>
            <ul>
              <li><a href="https://twitter.com/XenBurner" target="_blank" rel="noopener noreferrer">Twitter</a></li>
              <li><a href="https://t.me/xenburner" target="_blank" rel="noopener noreferrer">Telegram</a></li>
              <li><a href="https://discord.gg/xenburner" target="_blank" rel="noopener noreferrer">Discord</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Contracts</h3>
            <ul>
              <li>
                <a 
                  href="https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  XenBurner Contract
                </a>
              </li>
              <li>
                <a 
                  href="https://sepolia.etherscan.io/address/0x0987654321098765432109876543210987654321" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  XBURN Token
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p className="copyright">© {new Date().getFullYear()} XenBurner. All rights reserved.</p>
        <p className="disclaimer">
          XenBurner is an experimental protocol. Use at your own risk.
        </p>
      </div>
    </footer>
  );
}

export default Footer; 