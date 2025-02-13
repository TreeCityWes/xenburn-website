import React from 'react';
import { FireEffect } from './FireEffect';
import './Footer.css';
import { FireParticles } from './FireParticles';
import { SOCIAL_LINKS, CONTACT_EMAIL } from '../constants/social';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-fire">
        <FireParticles width={window.innerWidth} height={150} intensity={0.6} />
      </div>
      <div className="footer-content">
        <div className="footer-links">
          <a 
            href={SOCIAL_LINKS.X.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="footer-link"
          >
            X.com
          </a>
          <a 
            href={SOCIAL_LINKS.TELEGRAM.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="footer-link"
          >
            Telegram
          </a>
          <a 
            href={SOCIAL_LINKS.DOCS.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="footer-link"
          >
            Docs
          </a>
          <a 
            href={`mailto:${CONTACT_EMAIL}`} 
            className="footer-link"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
} 
