import { useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useWeb3 } from './useWeb3';

export function useTransactionHandler() {
  const { notify } = useNotification();
  const { account } = useWeb3();

  const handleTransaction = useCallback(async (method, options = {}) => {
    if (!account) throw new Error('No account connected');

    return new Promise((resolve, reject) => {
      method.send({ from: account, ...options })
        .on('transactionHash', (hash) => {
          notify('Transaction submitted...', 'info');
        })
        .on('receipt', (receipt) => {
          if (receipt.status) {
            notify('Transaction successful!', 'success');
            resolve(receipt);
          } else {
            notify('Transaction failed', 'error');
            reject(new Error('Transaction failed'));
          }
        })
        .on('error', (error) => {
          notify(`Transaction failed: ${error.message}`, 'error');
          reject(error);
        });
    });
  }, [account, notify]);

  return { handleTransaction };
} 