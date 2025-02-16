import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { InjectedConnector } from '@web3-react/injected-connector';
import toast from 'react-hot-toast';
import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/xen_burner.json';

const WalletContext = createContext();

// Contract addresses
const XEN_ADDRESS = '0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB';
const XENBURNER_ADDRESS = '0xd60483890f9aae31bc19cef2523072151f23c54c';

export const injected = new InjectedConnector({
  supportedChainIds: [11155111], // Sepolia testnet
});

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [ethBalance, setEthBalance] = useState(null);
  const [xenBalance, setXenBalance] = useState(null);
  const [xburnBalance, setXburnBalance] = useState(null);

  const connect = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const account = await signer.getAddress();
        const network = await provider.getNetwork();
        
        if (network.chainId !== 11155111) {
          toast.error('Please connect to Sepolia testnet');
          return;
        }

        setProvider(provider);
        setSigner(signer);
        setAccount(account);
        toast.success('Wallet connected!');
      } else {
        toast.error('Please install a Web3 wallet like Rabby');
      }
    } catch (error) {
      toast.error('Failed to connect wallet');
      console.error(error);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setEthBalance(null);
    setXenBalance(null);
    setXburnBalance(null);
    toast.success('Wallet disconnected');
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => {
        window.location.reload();
      });
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  useEffect(() => {
    if (account && provider) {
      const fetchBalances = async () => {
        try {
          // Get ETH balance
          const ethBal = await provider.getBalance(account);
          setEthBalance(ethers.utils.formatEther(ethBal));

          // Get XEN balance
          const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, provider);
          const xenBal = await xenContract.balanceOf(account);
          setXenBalance(ethers.utils.formatUnits(xenBal, 18));

          // Get XBURN balance
          const xburnContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, provider);
          const xburnBal = await xburnContract.balanceOf(account);
          setXburnBalance(ethers.utils.formatUnits(xburnBal, 18));
        } catch (error) {
          console.error('Error fetching balances:', error);
        }
      };

      fetchBalances();
      const interval = setInterval(fetchBalances, 15000);
      return () => clearInterval(interval);
    }
  }, [account, provider]);

  return (
    <WalletContext.Provider 
      value={{ 
        account, 
        provider, 
        signer, 
        connect, 
        disconnect, 
        ethBalance, 
        xenBalance, 
        xburnBalance 
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
} 