import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/XBurnMinter.json';
import xburnNftAbi from '../contracts/XBurnNFT.json';
import {
  XEN_ADDRESS,
  XENBURNER_ADDRESS,
  XBURN_NFT_ADDRESS
} from '../constants/contracts';

const WalletContext = createContext();

// Remove InjectedConnector dependency which might be causing storage issues
// export const injected = new InjectedConnector({
//   supportedChainIds: [11155111], // Sepolia testnet
// });

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [ethBalance, setEthBalance] = useState(null);
  const [xenBalance, setXenBalance] = useState(null);
  const [xburnBalance, setXburnBalance] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [xburnMinterContract, setXburnMinterContract] = useState(null);
  
  // Check if already connected on initial load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof window.ethereum !== 'undefined') {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            // User has already authorized this site
            connect(true); // Pass true to indicate this is an auto-connect
          }
        }
      } catch (error) {
        console.error("Failed to check initial connection:", error);
      }
    };
    
    checkConnection();
  }, []);

  const connect = async (isAutoConnect = false) => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        let accounts;
        
        if (!isAutoConnect) {
          // Only request accounts if not auto-connecting
          accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        } else {
          accounts = await window.ethereum.request({ method: 'eth_accounts' });
        }
        
        if (!accounts || accounts.length === 0) {
          if (!isAutoConnect) {
            toast.error('Please connect to your wallet');
          }
          return;
        }
        
        // First create provider without any storage operations
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Check network before doing anything else
        const network = await provider.getNetwork();
        if (network.chainId !== 11155111) {
          try {
            // Attempt to switch to Sepolia
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
            });
            // Reload the page after network switch
            window.location.reload();
            return;
          } catch (switchError) {
            // This error code indicates the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              toast.error('Please add Sepolia network to your wallet');
            } else {
              toast.error('Please connect to Sepolia testnet');
            }
            return;
          }
        }

        const signer = provider.getSigner();
        const account = await signer.getAddress();

        // Initialize contract instances with readonly provider first
        const nftContract = new ethers.Contract(XBURN_NFT_ADDRESS, xburnNftAbi, provider);
        const minterContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, provider);
        
        setProvider(provider);
        setSigner(signer);
        setAccount(account);
        setNftContract(nftContract);
        setXburnMinterContract(minterContract);
        
        if (!isAutoConnect) {
          toast.success('Wallet connected!');
        }
      } else {
        if (!isAutoConnect) {
          toast.error('Please install a Web3 wallet like MetaMask or Rabby');
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      if (!isAutoConnect) {
        toast.error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setEthBalance(null);
    setXenBalance(null);
    setXburnBalance(null);
    setNftContract(null);
    setXburnMinterContract(null);
    toast.success('Wallet disconnected');
  };

  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnect();
      } else if (accounts[0] !== account) {
        // User switched accounts
        window.location.reload();
      }
    };

    const handleChainChanged = () => {
      // Always reload on chain change to get the new chain's data
      window.location.reload();
    };

    if (window.ethereum) {
      // Clean way to add listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Cleanup function
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [account]);

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
          
          // Initialize contract instances if not already set
          if (!nftContract) {
            const nftContract = new ethers.Contract(XBURN_NFT_ADDRESS, xburnNftAbi, provider);
            setNftContract(nftContract);
          }
          
          if (!xburnMinterContract) {
            const minterContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, provider);
            setXburnMinterContract(minterContract);
          }
        } catch (error) {
          console.error('Error fetching balances:', error);
        }
      };

      fetchBalances();
      const interval = setInterval(fetchBalances, 15000);
      return () => clearInterval(interval);
    }
  }, [account, provider, nftContract, xburnMinterContract]);

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
        xburnBalance,
        nftContract,
        xburnMinterContract
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
} 