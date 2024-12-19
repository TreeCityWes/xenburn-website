import React from 'react';
import { BurnForm } from './BurnForm';
import { StatsPanel } from './StatsPanel';

export function AppContent() {
  return (
    <div className="app-content">
      <div className="content-wrapper">
        <div className="burn-panel">
          <BurnForm />
        </div>
        <div className="stats-panel">
          <StatsPanel />
        </div>
      </div>
    </div>
  );
} 