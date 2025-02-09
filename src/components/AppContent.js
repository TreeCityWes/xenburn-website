import React from 'react';
import { BurnForm } from './BurnForm';
import { StatsPanel } from './StatsPanel';
import './AppContent.css';

export function AppContent() {
  return (
    <main className="app-main">
      <div className="banner-container">
        <img src="/xenburn.png" alt="XenBurn Banner" className="banner-image" />
      </div>
      <div className="content-wrapper">
        <div className="burn-section">
          <BurnForm />
        </div>
        <div className="stats-section">
          <StatsPanel />
        </div>
      </div>
    </main>
  );
} 