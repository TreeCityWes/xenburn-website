import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { useTokenApproval } from '../hooks/useTokenApproval';
import { useNotification } from '../context/NotificationContext';
import { CONTRACT_CONFIG } from '../config';
import { useTransaction } from '../hooks/useTransaction';
import { validateAmount } from '../utils/errorHandling';

export function BurnForm() {
  const { contract, account, xenContract } = useWeb3();
  const { notify } = useNotification();
  const { approving, allowance, checkAllowance, approve } = useTokenApproval(xenContract);
  const { loading: transactionLoading, handleTransaction } = useTransaction();
  
  const [amount, setAmount] = useState('');
  const [needsApproval, setNeedsApproval] = useState(true);

  useEffect(() => {
    if (account && xenContract) {
      checkAllowance(account, CONTRACT_CONFIG.XEN_BURNER_ADDRESS);
    }
  }, [account, xenContract, checkAllowance]);

  useEffect(() => {
    if (amount && allowance) {
      const amountWei = ethers.utils.parseEther(amount);
      setNeedsApproval(amountWei.gt(ethers.BigNumber.from(allowance)));
    }
  }, [amount, allowance]);

  const handleApprove = async () => {
    if (!amount) return;
    try {
      const amountWei = ethers.utils.parseEther(amount);
      await approve(amountWei, account);
    } catch (err) {
      notify(`Approval failed: ${err.message}`, 'error');
    }
  };

  const handleBurn = async () => {
    if (!contract || !amount) return;

    try {
      const amountWei = ethers.utils.parseEther(amount);
      const balance = await xenContract.balanceOf(account);
      
      // Validate the amount
      validateAmount(amount, ethers.utils.formatEther(balance));

      await handleTransaction(
        () => contract.burnXEN(amountWei),
        {
          pendingMessage: 'Burning XEN...',
          successMessage: `Successfully burned ${amount} XEN`,
          onSuccess: () => {
            setAmount('');
            // Refresh balances or stats here
          }
        }
      );
    } catch (err) {
      console.error('Error burning XEN:', err);
    }
  };

  return (
    <div className="burn-form">
      <h2>Burn XEN Tokens</h2>
      <div className="allowance-display">
        Current Approval: {ethers.utils.formatEther(allowance)} XEN
      </div>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="input-group">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount of XEN to burn"
            disabled={transactionLoading || approving}
            min="0"
            step="any"
          />
          <span className="token-label">XEN</span>
        </div>
        
        {needsApproval ? (
          <button 
            onClick={handleApprove}
            disabled={approving || !amount}
            className="button blue-button"
          >
            {approving ? 'Approving...' : 'Approve XEN'}
          </button>
        ) : (
          <button
            onClick={handleBurn}
            disabled={transactionLoading || !amount}
            className="button red-button"
          >
            {transactionLoading ? 'Burning...' : 'Burn XEN'}
          </button>
        )}
      </form>
    </div>
  );
} 