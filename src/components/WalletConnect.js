import React from 'react';
import { useWeb3 } from '../hooks/useWeb3';

export function WalletConnect() {
  const { account, chainId, error, connect, disconnect } = useWeb3();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId) => {
    if (chainId === 8453) return 'BASE';
    return 'Unsupported Network';
  };

  const handleConnect = async () => {
    if (account) {
      await disconnect();
    } else {
      await connect();
    }
  };

  return (
    <div className="wallet-connect">
      {error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="wallet-info">
            <span className="network">{getNetworkName(chainId)}</span>
            <span className="address">{account ? formatAddress(account) : 'Not Connected'}</span>
          </div>
          <button 
            onClick={handleConnect}
            className={`button ${account ? 'red-button' : 'blue-button'}`}
          >
            {account ? 'Disconnect' : 'Connect'}
          </button>
        </>
      )}
    </div>
  );
} 