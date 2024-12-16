import React from 'react';
import { useTransactions } from '../context/TransactionContext';
import { formatEther } from 'ethers/lib/utils';

export function TransactionHistory() {
  const { transactions } = useTransactions();

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatTxHash = (hash) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const getTxTypeDetails = (tx) => {
    switch (tx.type) {
      case 'BURN_XEN':
        return {
          label: 'Burned XEN',
          value: `${Number(formatEther(tx.amount)).toLocaleString()} XEN`,
          subValue: `Received ${Number(formatEther(tx.rewards)).toLocaleString()} XBURN`,
          color: 'blue'
        };
      case 'BURN_XBURN':
        return {
          label: 'Burned XBURN',
          value: `${Number(formatEther(tx.amount)).toLocaleString()} XBURN`,
          color: 'red'
        };
      case 'SWAP':
        return {
          label: 'Buy & Burn',
          value: `${Number(formatEther(tx.xenAmount)).toLocaleString()} XEN`,
          subValue: `${Number(formatEther(tx.xburnAmount)).toLocaleString()} XBURN`,
          color: 'green'
        };
      default:
        return { label: 'Transaction', value: '', color: 'gray' };
    }
  };

  if (!transactions.length) {
    return null;
  }

  return (
    <div className="card transaction-history fade-in">
      <h2>Recent Transactions</h2>
      <div className="transactions-list">
        {transactions.map((tx, index) => {
          const details = getTxTypeDetails(tx);
          return (
            <div 
              key={tx.hash} 
              className={`transaction-item ${details.color}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="transaction-header">
                <span className="transaction-type">{details.label}</span>
                <span className="transaction-time">{formatTime(tx.timestamp)}</span>
              </div>
              <div className="transaction-amount">{details.value}</div>
              {details.subValue && (
                <div className="transaction-sub-amount">{details.subValue}</div>
              )}
              <a 
                href={`https://basescan.org/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="transaction-hash"
              >
                {formatTxHash(tx.hash)}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
} 