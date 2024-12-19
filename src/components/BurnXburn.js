import React, { useState } from 'react';
import { useAccount, useContractWrite, useBalance } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { xburnABI } from '../abis';
import { parseEther, formatEther } from 'viem';
import { GlobalStats } from './GlobalStats';

export function BurnXburn() {
  return (
    <div className="burn-content">
      <h2 className="burn-title">Burn XBURN</h2>
      <p className="burn-description">Burn your XBURN tokens!</p>
      
      {/* Add XBURN burning functionality here */}
      <div className="coming-soon">
        Coming Soon...
      </div>
    </div>
  );
} 