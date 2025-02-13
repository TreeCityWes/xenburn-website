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
   </footer>
  );
} 
