import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { getChainById } from '../../constants/chains';
import './NetworkSwitcher.css';

export const NetworkSwitcher = () => {
  const { 
    selectedChainId, 
    supportedChains, 
    switchNetwork, 
    isConnected, 
    isConnecting
  } = useWallet();
  
  const [isSwitching, setIsSwitching] = useState(false);

  // Find the current chain object
  const currentChain = getChainById(selectedChainId);

  if (!isConnected) {
    return null; // Don't show switcher if wallet is not connected
  }

  const handleSwitch = async (event) => {
    const newChainId = parseInt(event.target.value, 10);
    if (newChainId !== selectedChainId) {
      try {
        setIsSwitching(true);
        console.log(`Requesting switch to chain ID: ${newChainId}`);
        await switchNetwork(newChainId);
        
        // Add delay before removing switching state to improve UX
        setTimeout(() => {
          setIsSwitching(false);
        }, 1000);
      } catch (error) {
        console.error("Error switching network:", error);
        setIsSwitching(false);
      }
    }
  };

  return (
    <div className={`network-switcher ${isSwitching ? 'switching' : ''}`}>
      {/* Display current network logo */} 
      {currentChain?.logoUrl && (
        <img 
          src={currentChain.logoUrl} 
          alt={`${currentChain.name} logo`} 
          className="network-logo" 
        />
      )}
      {/* Select dropdown */}
      <select 
        className="network-select" 
        value={selectedChainId || ''} // Handle null case if disconnected but component somehow renders
        onChange={handleSwitch}
        disabled={isConnecting || isSwitching} // Disable while connecting/switching
        title={currentChain ? `Current Network: ${currentChain.name}` : 'Select Network'}
      >
        {/* Add a placeholder if no chain is selected (shouldn't happen if isConnected is true) */}
        {!currentChain && <option value="" disabled>Select Network</option>}
        
        {/* Map supported chains to options */}
        {supportedChains.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
      {isSwitching && <span className="switching-indicator">Switching...</span>}
    </div>
  );
}; 