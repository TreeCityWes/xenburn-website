import React from 'react';
import './Footer.css';
import { useWallet } from '../context/WalletContext';
import { getChainById } from '../constants/chains'; // Import chain helper

export function Footer() {
  const { selectedChainId, getCurrentAddresses } = useWallet();

  // Get current network addresses and chain info
  const currentAddresses = getCurrentAddresses(); // Can be null if no chain selected
  const currentChain = getChainById(selectedChainId);
  const explorerUrl = currentChain?.blockExplorers?.default?.url;

  // Helper to generate explorer links safely
  const explorerLink = (address) => {
    if (!explorerUrl || !address || address.includes('PLACEHOLDER')) {
      return null; // Return null if explorer or address is invalid
    }
    // Ensure explorer URL ends with a slash for proper joining
    const baseUrl = explorerUrl.endsWith('/') ? explorerUrl : `${explorerUrl}/`;
    return `${baseUrl}address/${address}`;
  };

  const burnerLink = explorerLink(currentAddresses?.XENBURNER_ADDRESS);
  const tokenLink = explorerLink(currentAddresses?.XBURN_TOKEN_ADDRESS);
  const lpLink = explorerLink(currentAddresses?.XBURN_XEN_LP_ADDRESS);

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
              <li><a href="https://burnxen.gitbook.io/burnmorexen" target="_blank" rel="noopener noreferrer">Documentation</a></li>
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
            <h3>Contracts ({currentChain?.name || 'Select Network'})</h3>
            <ul>
              <li>
                {burnerLink ? (
                  <a 
                    href={burnerLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    XenBurner Contract
                  </a>
                ) : (
                  <span>XenBurner Contract (N/A)</span>
                )}
              </li>
              <li>
                {tokenLink ? (
                  <a 
                    href={tokenLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    XBURN Token
                  </a>
                ) : (
                  <span>XBURN Token (N/A)</span>
                )}
              </li>
              <li>
                {lpLink ? (
                  <a 
                    href={lpLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    XBURN/XEN LP
                  </a>
                ) : (
                  <span>XBURN/XEN LP (N/A)</span>
                )}
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