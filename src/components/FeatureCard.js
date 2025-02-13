import React from 'react';
import { FireParticles } from './FireParticles';

export function FeatureCard({ title, description }) {
  return (
    <div className="feature-item">
      <div className="feature-fire">
        <FireParticles width={300} height={200} intensity={0.5} isBackground={true} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
} 