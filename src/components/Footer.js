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
              <li><a href="https://xenburner.gitbook.io/xenburner" target="_blank" rel="noopener noreferrer">Documentation</a></li>
              <li><a href="/XBurnAudit-April2025.pdf" target="_blank" rel="noopener noreferrer">Audit Report</a></li>
              <li><a href="/XBurnAudit-Response.pdf" target="_blank" rel="noopener noreferrer">Audit Response</a></li>
              <li><a href="https://github.com/TreeCityWes/xenburn-sepolia" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="https://hashhead.io" target="_blank" rel="noopener noreferrer">Blog</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Community</h3>
            <ul>
              <li><a href="https://twitter.com/BurnMoreXen" target="_blank" rel="noopener noreferrer">Twitter</a></li>
              <li><a href="https://t.me/BurnMoreXen" target="_blank" rel="noopener noreferrer">Telegram</a></li>
              <li><a href="https://treecitytrading.us" target="_blank" rel="noopener noreferrer">Tree City Trading</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Contracts</h3>
            <ul>
              <li>
                <a 
                  href="https://eth-sepolia.blockscout.com/token/0x1EbC3157Cc44FE1cb0d7F4764D271BAD3deB9a03" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  XenBurner Contract
                </a>
              </li>
              <li>
                <a 
                  href="https://eth-sepolia.blockscout.com/token/0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189" 
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