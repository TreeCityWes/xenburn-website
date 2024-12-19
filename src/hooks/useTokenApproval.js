import { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useTransactionHandler } from './useTransactionHandler';

export function useTokenApproval(contract) {
  const [approving, setApproving] = useState(false);
  const [allowance, setAllowance] = useState('0');
  const { notify } = useNotification();
  const { handleTransaction } = useTransactionHandler();

  const approve = async (amount, spender) => {
    try {
      setApproving(true);
      notify('Approval pending...', 'info');
      
      const tx = await contract.approve(spender, amount);
      await tx.wait();
      await checkAllowance(spender);
      
      notify('Approval successful', 'success');
    } catch (error) {
      notify(`Approval failed: ${error.message}`, 'error');
      throw error;
    } finally {
      setApproving(false);
    }
  };

  const checkAllowance = async (spender) => {
    if (!contract) return;
    const amount = await contract.allowance(spender);
    setAllowance(amount.toString());
  };

  return { approving, allowance, checkAllowance, approve };
} 