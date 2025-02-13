import React from 'react';
import { FireParticles } from './FireParticles';
import { SOCIAL_LINKS } from '../constants/social';

export function CTACard({ type, title, description, buttonText }) {
  const getLink = () => {
    switch(type) {
      case 'docs':
        return SOCIAL_LINKS.DOCS.url;
      case 'x':
        return SOCIAL_LINKS.X.url;
      case 'telegram':
        return SOCIAL_LINKS.TELEGRAM.url;
      default:
        return '#';
    }
  };

  return (
    <div className="cta-card">
      {/* Background fire */}
      <div className="fire-background">
        <FireParticles width={300} height={200} intensity={0.6} isBackground={true} />
      </div>
      {/* Foreground fire */}
      <div className="fire-container">
        <FireParticles width={300} height={200} intensity={0.8} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <a href={getLink()} target="_blank" rel="noopener noreferrer" className="cta-button">
        {buttonText}
      </a>
    </div>
  );
} 