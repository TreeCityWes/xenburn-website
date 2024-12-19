import React, { useState } from 'react';

export function StatsPanel() {
  const [activeTab, setActiveTab] = useState('price');

  return (
    <div className="stats-panel">
      <div className="tab-buttons">
        <button className={`tab-button ${activeTab === 'price' ? 'active' : ''}`} onClick={() => setActiveTab('price')}>
          Price
        </button>
        <button className={`tab-button ${activeTab === 'xburn-stats' ? 'active' : ''}`} onClick={() => setActiveTab('xburn-stats')}>
          XBURN Stats
        </button>
        <button className={`tab-button ${activeTab === 'holder-stats' ? 'active' : ''}`} onClick={() => setActiveTab('holder-stats')}>
          Holder Stats
        </button>
      </div>

      <div className="stats-content">
        <div className="stats-header">
          <div className="stats-row">
            <div className="stats-item">
              <div className="stats-label">XBURN/CBXEN</div>
              <div className="stats-value">$0.0032</div>
              <div className="stats-change negative">-4.46%</div>
            </div>
            <div className="stats-item">
              <div className="stats-label">Market Cap</div>
              <div className="stats-value">$1.9M</div>
              <div className="stats-change positive">+12.5%</div>
            </div>
            <div className="stats-item">
              <div className="stats-label">Circulating Supply</div>
              <div className="stats-value">594.3M</div>
              <div className="stats-change">XBURN</div>
            </div>
          </div>
        </div>

        <div className="chart-area">
          <div className="chart-placeholder">
            Price chart coming soon...
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">TVL</div>
            <div className="stat-value">$1.9B</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">24H VOLUME</div>
            <div className="stat-value">$2.2B</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">TOTAL CBXEN BURNED</div>
            <div className="stat-value">0</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">TOTAL XBURN SUPPLY</div>
            <div className="stat-value">0</div>
          </div>
        </div>

        <div className="help-links">
          <a href="#" className="help-link">Read Whitepaper</a>
          <a href="#" className="help-link">Join Telegram</a>
          <a href="#" className="help-link">Follow Twitter</a>
        </div>
      </div>
    </div>
  );
} 