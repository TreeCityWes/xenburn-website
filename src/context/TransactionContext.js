import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useNotification } from './NotificationContext';

const TransactionContext = createContext();

export function TransactionProvider({ children }) {
  const { contract, account } = useWeb3();
  const { notify } = useNotification();
  const [transactions, setTransactions] = useState([]);

  // Listen for contract events
  useEffect(() => {
    if (!contract || !account) return;

    const burnedXENFilter = contract.filters.BurnedXEN(account);
    const xburnBurnedFilter = contract.filters.XburnBurned(account);
    const xburnSwappedFilter = contract.filters.XburnSwapped(account);

    const handleBurnedXEN = (user, amountBurned, rewardsMinted, event) => {
      const tx = {
        type: 'BURN_XEN',
        hash: event.transactionHash,
        amount: amountBurned.toString(),
        rewards: rewardsMinted.toString(),
        timestamp: Date.now(),
      };
      addTransaction(tx);
      notify(`Successfully burned ${amountBurned.toString()} XEN`, 'success');
    };

    const handleXburnBurned = (caller, amount, event) => {
      const tx = {
        type: 'BURN_XBURN',
        hash: event.transactionHash,
        amount: amount.toString(),
        timestamp: Date.now(),
      };
      addTransaction(tx);
      notify(`Successfully burned ${amount.toString()} XBURN`, 'success');
    };

    const handleXburnSwapped = (caller, xenSwapped, xburnReceived, event) => {
      const tx = {
        type: 'SWAP',
        hash: event.transactionHash,
        xenAmount: xenSwapped.toString(),
        xburnAmount: xburnReceived.toString(),
        timestamp: Date.now(),
      };
      addTransaction(tx);
      notify('Buy & Burn completed successfully', 'success');
    };

    contract.on(burnedXENFilter, handleBurnedXEN);
    contract.on(xburnBurnedFilter, handleXburnBurned);
    contract.on(xburnSwappedFilter, handleXburnSwapped);

    return () => {
      contract.off(burnedXENFilter, handleBurnedXEN);
      contract.off(xburnBurnedFilter, handleXburnBurned);
      contract.off(xburnSwappedFilter, handleXburnSwapped);
    };
  }, [contract, account, notify]);

  const addTransaction = (tx) => {
    setTransactions(prev => [tx, ...prev].slice(0, 10)); // Keep last 10 transactions
  };

  return (
    <TransactionContext.Provider value={{ transactions }}>
      {children}
    </TransactionContext.Provider>
  );
}

export const useTransactions = () => useContext(TransactionContext); 