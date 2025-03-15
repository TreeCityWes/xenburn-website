import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/XBurnMinter.json';
import xburnNftAbi from '../contracts/XBurnNFT.json';
import {
  XEN_ADDRESS,
  XENBURNER_ADDRESS,
  XBURN_NFT_ADDRESS
} from '../constants/addresses';

const WalletContext = createContext();

// Global request tracker to limit requests across the app
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // Reduced from 2000ms to 500ms for faster requests
let requestQueue = [];
let isProcessingQueue = false;
// Track if user manually disconnected to prevent auto-reconnect
let userManuallyDisconnected = false;

// Global flags to prevent duplicate fetches
let lastBalanceFetchTime = 0;
const MIN_BALANCE_FETCH_INTERVAL = 5000; // Reduced from 60000ms to 5000ms (5 seconds)
let isAutoConnectAttempted = false; // Flag to ensure we only auto-connect once

// Queue system for RPC requests to prevent overwhelming the provider
const enqueueRequest = (requestFn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ requestFn, resolve, reject });
    processQueue();
  });
};

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  // Respect global rate limit
  const now = Date.now();
  const timeToWait = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime));
  
  if (timeToWait > 0) {
    await new Promise(resolve => setTimeout(resolve, timeToWait));
  }
  
  const { requestFn, resolve, reject } = requestQueue.shift();
  lastRequestTime = Date.now();
  
  try {
    const result = await requestFn();
    resolve(result);
  } catch (error) {
    console.error('RPC Request failed:', error);
    reject(error);
  } finally {
    isProcessingQueue = false;
    // Process next request after a small delay
    setTimeout(processQueue, 200);
  }
};

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [ethBalance, setEthBalance] = useState(null);
  const [xenBalance, setXenBalance] = useState(null);
  const [xburnBalance, setXburnBalance] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [xburnMinterContract, setXburnMinterContract] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [balanceInterval, setBalanceInterval] = useState(null);
  const [reconnectTimeout, setReconnectTimeout] = useState(null);
  const [xenBalanceRaw, setXenBalanceRaw] = useState(null);
  const [xburnBalanceRaw, setXburnBalanceRaw] = useState(null);
  const [xenApprovalRaw, setXenApprovalRaw] = useState(null);
  const [xburnApprovalRaw, setXburnApprovalRaw] = useState(null);
  
  // Safe RPC request function 
  const safeRequest = useCallback(async (requestFn, errorMsg = 'RPC request failed') => {
    // Enqueue the request to prevent overloading the RPC
    return enqueueRequest(async () => {
      try {
        return await requestFn();
      } catch (error) {
        console.warn(`${errorMsg}:`, error);
        // Throw a cleaner error for handling upstream
        throw new Error(errorMsg);
      }
    });
  }, []);
  
  // Fetch balances function that properly handles errors and updates state
  const fetchBalances = useCallback(async (ethersProvider, userAccount, forceRefresh = false) => {
    if (!ethersProvider || !userAccount) {
      console.log('Missing provider or account, skipping balance fetch');
      return;
    }
    
    // Implement time-based debouncing, but allow bypassing with forceRefresh
    const now = Date.now();
    if (!forceRefresh && now - lastBalanceFetchTime < MIN_BALANCE_FETCH_INTERVAL) {
      console.log('Skipping balance fetch, last fetch was too recent');
      return;
    }
    
    // Update last fetch time
    lastBalanceFetchTime = now;
    
    console.log('Fetching balances for account:', userAccount);
    
    try {
      // Create contract instances
      const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, ethersProvider);
      const xburnContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, ethersProvider);
      
      // Set up parallel promises for all balances
      const [ethBal, xenBal, xburnBal, xenApproval, xburnApproval] = await Promise.all([
        // Fetch ETH balance
        safeRequest(
          () => ethersProvider.getBalance(userAccount),
          'Error fetching ETH balance'
        ),
        // Fetch XEN balance
        safeRequest(
          () => xenContract.balanceOf(userAccount),
          'Error fetching XEN balance'
        ),
        // Fetch XBURN balance
        safeRequest(
          () => xburnContract.balanceOf(userAccount),
          'Error fetching XBURN balance'
        ),
        // Fetch XEN allowance for burner contract
        safeRequest(
          () => xenContract.allowance(userAccount, XENBURNER_ADDRESS),
          'Error fetching XEN allowance'
        ),
        // Fetch XBURN allowance for burner contract
        safeRequest(
          () => xburnContract.allowance(userAccount, XENBURNER_ADDRESS),
          'Error fetching XBURN allowance'
        )
      ]);
      
      // Store raw values for contract interactions (important!)
      setXenBalanceRaw(xenBal || '0');
      setXburnBalanceRaw(xburnBal || '0');
      setXenApprovalRaw(xenApproval || '0');
      setXburnApprovalRaw(xburnApproval || '0');
      
      // Convert ETH balance to human-readable format
      const formattedEthBal = ethers.utils.formatEther(ethBal || '0');
      setEthBalance(formattedEthBal);
      
      // Convert XEN balance to human-readable format (18 decimals)
      const formattedXenBal = ethers.utils.formatUnits(xenBal || '0', 18);
      setXenBalance(formattedXenBal);
      
      // Convert XBURN balance to human-readable format (18 decimals)
      const formattedXburnBal = ethers.utils.formatUnits(xburnBal || '0', 18);
      setXburnBalance(formattedXburnBal);
      
      // Initialize contract instances
      setNftContract(new ethers.Contract(XBURN_NFT_ADDRESS, xburnNftAbi, ethersProvider));
      setXburnMinterContract(xburnContract);
      
      console.log('Balances updated successfully:', {
        eth: formattedEthBal,
        xen: formattedXenBal,
        xburn: formattedXburnBal,
        xenApproval: ethers.utils.formatUnits(xenApproval || '0', 18),
        xburnApproval: ethers.utils.formatUnits(xburnApproval || '0', 18)
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
      // Don't clear balances on error, keep the last known values
    }
  }, [safeRequest]);
  
  // Connect function that handles wallet connection
  const connect = useCallback(async (isAutoConnect = false) => {
    // Don't connect if we're already in the process of connecting
    if (connecting) {
      console.log('Already connecting, skipping duplicate request');
      return;
    }
    
    // If user manually disconnected, don't auto-connect
    if (isAutoConnect && userManuallyDisconnected) {
      console.log('User manually disconnected, skipping auto-connect');
      return;
    }
    
    // Mark that we've attempted auto-connect
    if (isAutoConnect) {
      isAutoConnectAttempted = true;
    }
    
    setConnecting(true);
    
    try {
      // Check if ethereum is available in the window object
      if (typeof window.ethereum === 'undefined') {
        if (!isAutoConnect) {
          toast.error('Please install a Web3 wallet like MetaMask or Rabby');
        }
        setConnecting(false);
        return;
      }
      
      // Request accounts from the wallet
      let accounts;
      try {
        if (!isAutoConnect) {
          // Force prompt for wallet connection 
          console.log('Requesting accounts...');
          accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log('Accounts received:', accounts);
          
          // Reset the manual disconnect flag when user actively connects
          userManuallyDisconnected = false;
          
          // Store connection preference for future visits
          localStorage.setItem('walletConnected', 'true');
        } else {
          // Just check if we already have permission without prompting
          accounts = await window.ethereum.request({ method: 'eth_accounts' });
        }
      } catch (requestError) {
        console.error('Error requesting accounts:', requestError);
        if (!isAutoConnect) {
          toast.error(`Wallet connection rejected: ${requestError.message || 'User rejected the request'}`);
        }
        setConnecting(false);
        return;
      }
      
      // Check if accounts were returned
      if (!accounts || accounts.length === 0) {
        if (!isAutoConnect) {
          toast.error('Please connect to your wallet');
        }
        setConnecting(false);
        return;
      }
      
      // Create provider from the user's wallet
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Check network
      const network = await ethersProvider.getNetwork();
      if (network.chainId !== 11155111) {
        try {
          // Attempt to switch to Sepolia
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
          });
          // Reload the page after network switch
          window.location.reload();
          setConnecting(false);
          return;
        } catch (switchError) {
          console.error('Error switching network:', switchError);
          // This error code indicates the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia',
                  nativeCurrency: {
                    name: 'Sepolia ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://sepolia.infura.io/v3/'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io/']
                }]
              });
              // Try connecting again
              connect();
              return;
            } catch (addError) {
              toast.error('Failed to add Sepolia network');
              setConnecting(false);
              return;
            }
          } else {
            toast.error('Please switch to Sepolia network');
            setConnecting(false);
            return;
          }
        }
      }
      
      // Get signer from provider
      const ethersSigner = ethersProvider.getSigner();
      
      // Update state
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setAccount(accounts[0]);
      setChainId(network.chainId);
      
      // Clear any existing interval first to prevent duplicates
      if (balanceInterval) {
        clearInterval(balanceInterval);
        setBalanceInterval(null);
      }
      
      // Fetch balances only once on initial connection
      fetchBalances(ethersProvider, accounts[0]);
      
      if (!isAutoConnect) {
        toast.success('Wallet connected successfully');
      }
      console.log('Wallet connected:', accounts[0]);
      
    } catch (error) {
      console.error('Error in connect:', error);
      if (!isAutoConnect) {
        toast.error(`Failed to connect: ${error.message}`);
      }
    } finally {
      setConnecting(false);
    }
  }, [connecting, fetchBalances, balanceInterval]);
  
  // Check if already connected on initial load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Skip if already attempted or user manually disconnected
        if (isAutoConnectAttempted || userManuallyDisconnected) return;
        
        // Mark that we've attempted auto-connect
        isAutoConnectAttempted = true;
        
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
    
    // Slight delay to ensure page is fully loaded
    setTimeout(checkConnection, 1000);
    
    // Clean up function
    return () => {
      isAutoConnectAttempted = true; // Prevent reconnection if component remounts
    };
  }, [connect]);

  // Disconnect function that properly disconnects and prevents auto-reconnect
  const disconnect = useCallback(() => {
    console.log('Disconnecting wallet...');
    
    // Set manual disconnect flag
    userManuallyDisconnected = true;
    isAutoConnectAttempted = true;
    
    // Clear all connection state
    setAccount(null);
    setSigner(null);
    setChainId(null);
    setEthBalance('0');
    setXenBalance('0');
    setXburnBalance('0');
    setProvider(null);
    setXburnMinterContract(null);
    setNftContract(null);
    
    // Clear the stored provider preference
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('WALLET_RECONNECT');
    
    // Clear any reconnection attempts
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }
    
    // Make sure we're not using the cached provider
    window.localStorage.removeItem('walletconnect');
    window.localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
    
    // Reset connection state
    setConnecting(false);
    
    // Stop the polling interval for balances
    if (balanceInterval) {
      clearInterval(balanceInterval);
      setBalanceInterval(null);
    }
    
    toast.success('Wallet disconnected successfully');
    console.log('Wallet disconnected successfully');
  }, [reconnectTimeout, balanceInterval]);

  // Add effect to set up event listeners for wallet changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnect();
        } else if (accounts[0] !== account) {
          // Account changed, update state
          setAccount(accounts[0]);
          if (provider) {
            fetchBalances(provider, accounts[0]);
          }
        }
      };
      
      const handleChainChanged = (chainIdHex) => {
        console.log('Network changed:', chainIdHex);
        const newChainId = parseInt(chainIdHex, 16);
        setChainId(newChainId);
        
        // If chain changed to something other than Sepolia, prompt to switch back
        if (newChainId !== 11155111) {
          toast.error('Please switch to Sepolia testnet');
        } else if (account && provider) {
          // Refresh balances on correct network
          fetchBalances(provider, account);
        }
      };
      
      // Set up listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Cleanup function
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account, provider, disconnect, fetchBalances]);

  // Return the provider with context values
  return (
    <WalletContext.Provider
      value={{
        account,
        provider,
        signer,
        ethBalance,
        xenBalance,
        xburnBalance,
        xenBalanceRaw,
        xburnBalanceRaw,
        xenApprovalRaw,
        xburnApprovalRaw,
        nftContract,
        xburnMinterContract,
        isConnected: !!account,
        isConnecting: connecting,
        connect,
        disconnect,
        safeRequest,
        fetchBalances,
        balanceInterval,
        setBalanceInterval,
        reconnectTimeout,
        setReconnectTimeout,
        chainId
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
} 