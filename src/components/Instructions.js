import React from 'react';
import './Instructions.css';
import FireParticles from './FireParticles';

export const Instructions = () => {
  return (
    <div className="instructions">
      <FireParticles width="100%" height="100%" intensity={0.1} isBackground={true} type="audit" />
      <h3>How to Burn XEN</h3>
      <div className="steps">
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <p>
              Acquire XEN tokens by minting at <a href="https://xen.network" target="_blank" rel="noopener noreferrer">xen.network</a> or swapping on a decentralized exchange.
            </p>
          </div>
        </div>

        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <p>
              Approve the XenBurner contract to spend your XEN tokens.
            </p>
          </div>
        </div>

        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <p>Enter the XEN amount to burn, optionally select a term length, and click 'BURN XEN NOW'!</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 