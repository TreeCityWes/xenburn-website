import React from 'react';
import './Instructions.css';

export const Instructions = () => {
  return (
    <div className="instructions">
      <h3>How to Burn XEN</h3>
      <div className="steps">
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <p>
              Visit <a href="https://faucet.quicknode.com/ethereum/sepolia/ref?=TreeCityWes" target="_blank" rel="noopener noreferrer">QuickNode</a> to sign up, 
              then use their <a href="https://faucet.quicknode.com/ethereum/sepolia/ref?=TreeCityWes" target="_blank" rel="noopener noreferrer">Sepolia faucet</a>
            </p>
          </div>
        </div>

        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <p>
              Visit <a href="https://testnet.xen.network" target="_blank" rel="noopener noreferrer">testnet.xen.network</a> and mint XEN (max term mints within 1 hour)
            </p>
          </div>
        </div>

        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <p>Burn XEN and test the dApp features!</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 