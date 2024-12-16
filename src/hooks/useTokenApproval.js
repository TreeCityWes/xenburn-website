import { useState, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useTransactionHandler } from './useTransactionHandler';
import { CONTRACT_CONFIG } from '../config';

export function useTokenApproval(tokenContract) {
  const [approving, setApproving] = useState(false);
  const [allowance, setAllowance] = useState('0');
  const { notify } = useNotification();
  const { handleTransaction } = useTransactionHandler();

  const checkAllowance = useCallback(async (owner, spender) => {
    if (!tokenContract) return '0';
    try {
      const allowance = await tokenContract.allowance(owner, spender);
      setAllowance(allowance.toString());
      return allowance.toString();
    } catch (error) {
      console.error('Error checking allowance:', error);
      return '0';
    }
  }, [tokenContract]);

  const approve = async (amount) => {
    if (!tokenContract) throw new Error('Token contract not initialized');
    
    try {
      setApproving(true);
      const notificationId = notify('Approval pending...', 'info');

      await handleTransaction(
        tokenContract.methods.approve(CONTRACT_CONFIG.XEN_BURNER_ADDRESS, amount)
      );

      await checkAllowance();
      return true;
    } catch (error) {
      notify(`Approval failed: ${error.message}`, 'error');
      return false;
    } finally {
      setApproving(false);
    }
  };

  return {
    approving,
    allowance,
    checkAllowance,
    approve
  };
} 