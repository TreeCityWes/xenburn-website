import React, { createContext, useContext, useState } from 'react';
import { useNotification } from './NotificationContext';

const TransactionContext = createContext({});

export function TransactionProvider({ children }) {
  const [pending, setPending] = useState(false);
  const { notify } = useNotification();

  const handleTransaction = async (transactionPromise, options = {}) => {
    const { onSuccess, onError } = options;
    
    try {
      setPending(true);
      notify('Transaction pending...', 'info');
      
      const tx = await transactionPromise;
      await tx.wait();
      
      notify('Transaction successful!', 'success');
      onSuccess?.();
      return true;
    } catch (error) {
      notify(`Transaction failed: ${error.message}`, 'error');
      onError?.(error);
      return false;
    } finally {
      setPending(false);
    }
  };

  return (
    <TransactionContext.Provider value={{ pending, handleTransaction }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionHandler() {
  return useContext(TransactionContext);
} 