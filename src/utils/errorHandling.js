export function parseError(error) {
  if (typeof error === 'string') return error;

  // Handle MetaMask errors
  if (error?.code === 4001) {
    return 'Transaction rejected by user';
  }

  // Handle contract revert errors
  if (error?.data?.message) {
    return error.data.message.replace('execution reverted: ', '');
  }

  // Handle other contract errors
  if (error?.reason) {
    return error.reason;
  }

  // Handle RPC errors
  if (error?.message) {
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    return error.message.replace('MetaMask Tx Signature: ', '');
  }

  return 'An unexpected error occurred';
}

export function validateAmount(amount, balance, decimals = 18) {
  if (!amount || amount <= 0) {
    throw new Error('Please enter a valid amount');
  }

  if (amount > balance) {
    throw new Error('Insufficient balance');
  }

  // Check for reasonable decimal places
  const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > decimals) {
    throw new Error(`Maximum ${decimals} decimal places allowed`);
  }

  return true;
} 