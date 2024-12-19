import React from 'react';
import { useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export function BalancesBar({ address }) {
  const { data: ethBalance } = useBalance({ address });
  const { data: cbxenBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.CBXEN
  });
  const { data: xburnBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.XBURN
  });

  return (
    <div className="balances-bar">
      <div className="balance-pill">
        <span className="token-icon">⚫</span>
        <span className="balance-amount">
          {ethBalance ? Number(formatEther(ethBalance.value)).toFixed(5) : '0'}
        </span>
        <span className="token-symbol">ETH</span>
      </div>
      
      <div className="balance-pill">
        <span className="token-icon">🟠</span>
        <span className="balance-amount">
          {cbxenBalance ? Number(formatEther(cbxenBalance.value)).toLocaleString(undefined, {maximumFractionDigits: 0}) : '0'}
        </span>
        <span className="token-symbol">CBXEN</span>
      </div>
      
      <div className="balance-pill">
        <span className="token-icon">🔥</span>
        <span className="balance-amount">
          {xburnBalance ? Number(formatEther(xburnBalance.value)).toFixed(2) : '0'}
        </span>
        <span className="token-symbol">XBURN</span>
      </div>
    </div>
  );
} 