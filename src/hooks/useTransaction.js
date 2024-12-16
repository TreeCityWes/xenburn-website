import { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { parseError } from '../utils/errorHandling';

export function useTransaction() {
  const [loading, setLoading] = useState(false);
  const { notify, updateNotification } = useNotification();

  const handleTransaction = async (
    transactionFn,
    {
      onSuccess,
      onError,
      pendingMessage = 'Transaction pending...',
      successMessage = 'Transaction successful!',
    } = {}
  ) => {
    setLoading(true);
    let notificationId;

    try {
      notificationId = notify(pendingMessage, 'info');
      
      const tx = await transactionFn();
      updateNotification(notificationId, 'Waiting for confirmation...', 'info');
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        updateNotification(notificationId, successMessage, 'success');
        if (onSuccess) await onSuccess(receipt);
      } else {
        throw new Error('Transaction failed');
      }
      
      return receipt;
    } catch (error) {
      const errorMessage = parseError(error);
      updateNotification(notificationId, `Transaction failed: ${errorMessage}`, 'error');
      if (onError) onError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleTransaction
  };
} 