import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
// Increased interval slightly to further reduce pressure
const MIN_REQUEST_INTERVAL = 750; // Increased from 500ms 
let requestQueue = [];
let isProcessingQueue = false;
// Track if user manually disconnected to prevent auto-reconnect
let userManuallyDisconnected = false;

// Global flags to prevent duplicate fetches
let lastBalanceFetchTime = 0;
const MIN_BALANCE_FETCH_INTERVAL = 5000; // Reduced from 60000ms to 5000ms (5 seconds)

// Define the target network (Base Mainnet)
const TARGET_CHAIN_ID = '0x2105'; // 8453 in hex
const TARGET_NETWORK_NAME = 'Base';
const TARGET_RPC_URL = 'https://base.api.onfinality.io/public'; // Changed RPC to OnFinality
const TARGET_EXPLORER_URL = 'https://basescan.org/';
const TARGET_CURRENCY_NAME = 'ETH';
const TARGET_CURRENCY_SYMBOL = 'ETH';
const TARGET_CURRENCY_DECIMALS = 18;

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
    // Process next request after a slightly longer delay
    setTimeout(processQueue, 300); // Increased from 200ms
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
  const initialCheckDone = useRef(false); // Ref to track if initial check ran
  
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
    if (connecting) {
      console.log('Already connecting, skipping duplicate request');
      return;
    }
    
    // If user manually disconnected, don't auto-connect
    if (isAutoConnect && userManuallyDisconnected) {
      console.log('User manually disconnected, skipping auto-connect');
      return;
    }
    
    setConnecting(true);
    
    try {
      if (typeof window.ethereum === 'undefined') {
        if (!isAutoConnect) {
          toast.error('Please install a Web3 wallet like MetaMask or Rabby');
        }
        setConnecting(false);
        return;
      }
      
      let accounts;
      try {
        // Always use eth_accounts first for auto-connect to check permission silently
        if (isAutoConnect) {
          accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (!accounts || accounts.length === 0) {
            // No permission or no accounts available silently
            console.log('Auto-connect failed: No accounts found silently.');
            // Clear local storage flag if auto-connect fails
            localStorage.removeItem('walletConnected'); 
            setConnecting(false);
            return;
          }
        } else {
          // Prompt user for connection if not auto-connecting
          console.log('Requesting accounts...');
          accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log('Accounts received:', accounts);
        }

      } catch (requestError) {
        console.error('Error requesting accounts:', requestError);
        if (!isAutoConnect) {
          toast.error(`Wallet connection rejected: ${requestError.message || 'User rejected the request'}`);
        }
        // Clear local storage flag on error during connection attempt
        localStorage.removeItem('walletConnected'); 
        setConnecting(false);
        return;
      }
      
      if (!accounts || accounts.length === 0) {
        // This case should ideally be caught above for auto-connect
        if (!isAutoConnect) {
          toast.error('No accounts found. Please connect to your wallet.');
        }
        localStorage.removeItem('walletConnected'); // Clear flag if connect fails
        setConnecting(false);
        return;
      }
      
      // Successfully connected or reconnected
      console.log('Wallet connected/reconnected with account:', accounts[0]);

      // Reset the manual disconnect flag when user actively connects or auto-connects successfully
      userManuallyDisconnected = false;
      // Store connection preference persistently
      localStorage.setItem('walletConnected', 'true');

      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await ethersProvider.getNetwork();
      
      // Check network
      if (network.chainId !== parseInt(TARGET_CHAIN_ID, 16)) {
        try {
          // Attempt to switch to Base
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: TARGET_CHAIN_ID }],
          });
          // Reload the page after network switch
          window.location.reload();
          localStorage.removeItem('walletConnected'); // Remove flag if network switch fails
          setConnecting(false);
          return;
        } catch (switchError) {
          console.error('Error switching network:', switchError);
          // This error code indicates the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: TARGET_CHAIN_ID,
                    chainName: TARGET_NETWORK_NAME,
                    nativeCurrency: {
                      name: TARGET_CURRENCY_NAME,
                      symbol: TARGET_CURRENCY_SYMBOL,
                      decimals: TARGET_CURRENCY_DECIMALS,
                    },
                    rpcUrls: [TARGET_RPC_URL],
                    blockExplorerUrls: [TARGET_EXPLORER_URL],
                  },
                ],
              });
              // Try connecting again
              connect();
              return;
            } catch (addError) {
              toast.error('Failed to add Base network');
              localStorage.removeItem('walletConnected'); // Remove flag if network switch fails
              setConnecting(false);
              return;
            }
          } else {
            toast.error('Please switch to Base network');
            localStorage.removeItem('walletConnected'); // Remove flag if network switch fails
            setConnecting(false);
            return;
          }
        }
      }
      
      const ethersSigner = ethersProvider.getSigner();
      
      // Update state
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setAccount(accounts[0]);
      setChainId(network.chainId);
      
      // Clear any existing interval first
      if (balanceInterval) {
        clearInterval(balanceInterval);
        setBalanceInterval(null);
      }
      
      // Fetch balances immediately on connection
      fetchBalances(ethersProvider, accounts[0], true); // Force refresh on connect
      
      if (!isAutoConnect) {
        toast.success('Wallet connected successfully');
      }
      console.log('Wallet connection state updated for:', accounts[0]);
      
    } catch (error) {
      console.error('Error in connect function:', error);
      localStorage.removeItem('walletConnected'); // Clear flag on any unexpected error
      if (!isAutoConnect) {
        toast.error(`Failed to connect: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setConnecting(false);
    }
  }, [connecting, fetchBalances, balanceInterval]);
  
  // Check connection on initial load using localStorage
  useEffect(() => {
    // Ensure this runs only ONCE on mount
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;

    const checkInitialConnection = async () => {
      if (userManuallyDisconnected) { // Skip if user explicitly disconnected last time
        console.log('Skipping auto-reconnect: User manually disconnected.');
        return;
      }

      const previouslyConnected = localStorage.getItem('walletConnected') === 'true';
      console.log('Checking initial connection, previouslyConnected:', previouslyConnected);

      if (previouslyConnected && typeof window.ethereum !== 'undefined') {
          console.log('Attempting auto-reconnect...');
          await connect(true); // Pass true to indicate auto-connect
      }
    };

    // Delay slightly to let wallet providers inject
    const timeoutId = setTimeout(checkInitialConnection, 500); 

    return () => clearTimeout(timeoutId); // Cleanup timeout
  // Add connect to dependency array as it's used inside checkInitialConnection
  }, [connect]); // connect is stable due to useCallback, add to satisfy lint rule

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('Disconnecting wallet...');
    
    // Set manual disconnect flag
    userManuallyDisconnected = true;
    
    // Clear connection state
    setAccount(null);
    setSigner(null);
    setChainId(null);
    setEthBalance('0');
    setXenBalance('0');
    setXburnBalance('0');
    setProvider(null);
    setXburnMinterContract(null);
    setNftContract(null);
    // Clear raw balances and approvals as well
    setXenBalanceRaw(null);
    setXburnBalanceRaw(null);
    setXenApprovalRaw(null);
    setXburnApprovalRaw(null);
    
    // Clear the stored connection preference
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('WALLET_RECONNECT'); // Keep removing this if used elsewhere
    
    // Clear any reconnection attempts timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }
    
    // Clear other potential wallet provider cache
    window.localStorage.removeItem('walletconnect');
    window.localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
    
    setConnecting(false);
    
    // Stop the balance polling interval
    if (balanceInterval) {
      clearInterval(balanceInterval);
      setBalanceInterval(null);
    }
    
    toast.success('Wallet disconnected successfully');
    console.log('Wallet disconnected successfully');
  }, [reconnectTimeout, balanceInterval]); // balanceInterval dependency added

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
      
      const handleChainChanged = (chainId) => {
        console.log('Network changed to:', chainId);
        if (chainId !== TARGET_CHAIN_ID) {
          disconnect(); // Disconnect if switched away from Base
          toast.error(`Please switch to ${TARGET_NETWORK_NAME} network`);
        } else {
          // Re-fetch data if switched back to Base
          connect(); 
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
    // Ensure dependencies are stable
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