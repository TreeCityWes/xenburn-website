import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from '../config';
import xenBurnerAbi from '../abis/xenBurnerAbi.json';
import cbXenAbi from '../abis/cbXenAbi.json';

export function useWeb3() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [xenContract, setXenContract] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState('0');

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      // Request accounts
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);

      // Get network
      const { chainId } = await provider.getNetwork();
      setChainId(chainId);

      // Check if we're on BASE
      if (chainId !== 8453) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }], // BASE chainId in hex
          });
          // After switching, get the new provider and chainId
          const newProvider = new ethers.providers.Web3Provider(window.ethereum);
          const { chainId: newChainId } = await newProvider.getNetwork();
          setChainId(newChainId);
          setProvider(newProvider);
        } catch (switchError) {
          setError('Please switch to BASE network');
          return;
        }
      }

      // Initialize contracts with the correct provider
      const signer = provider.getSigner();
      
      const burnerContract = new ethers.Contract(
        CONTRACT_CONFIG.XEN_BURNER_ADDRESS,
        xenBurnerAbi,
        signer
      );
      setContract(burnerContract);

      const xenTokenContract = new ethers.Contract(
        CONTRACT_CONFIG.XEN_TOKEN_ADDRESS,
        cbXenAbi,
        signer
      );
      setXenContract(xenTokenContract);

      // Update balances
      const balance = await provider.getBalance(accounts[0]);
      setBalance(ethers.utils.formatEther(balance));

      setError(null);
    } catch (err) {
      console.error('Connection Error:', err);
      setError(err.message);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setXenContract(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', async (newChainId) => {
        const chainIdNum = parseInt(newChainId, 16);
        setChainId(chainIdNum);
        
        if (chainIdNum !== 8453) {
          setError('Please switch to BASE network');
          setContract(null);
          setXenContract(null);
        } else {
          setError(null);
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          
          // Reinitialize contracts
          const burnerContract = new ethers.Contract(
            CONTRACT_CONFIG.XEN_BURNER_ADDRESS,
            xenBurnerAbi,
            signer
          );
          setContract(burnerContract);

          const xenTokenContract = new ethers.Contract(
            CONTRACT_CONFIG.XEN_TOKEN_ADDRESS,
            cbXenAbi,
            signer
          );
          setXenContract(xenTokenContract);

          // Update balance
          if (account) {
            const balance = await provider.getBalance(account);
            setBalance(ethers.utils.formatEther(balance));
          }
        }
      });

      // Add balance update on account change
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAccount(accounts[0]);
          if (provider) {
            const balance = await provider.getBalance(accounts[0]);
            setBalance(ethers.utils.formatEther(balance));
          }
        }
      });

      window.ethereum.on('disconnect', () => {
        disconnect();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
        window.ethereum.removeAllListeners('disconnect');
      }
    };
  }, [account, provider, disconnect]);

  return {
    account,
    provider,
    contract,
    xenContract,
    chainId,
    error,
    balance,
    connect,
    disconnect
  };
} 