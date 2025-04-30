import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import xenBurnerAbi from '../contracts/XBurnMinter.json';
import xburnNftAbi from '../contracts/XBurnNFT.json';
import { getAddresses, XEN_ABI } from '../constants/addresses';
import { supportedChains, getChainById, base } from '../constants/chains';

// Define ERC20 ABI here if not imported elsewhere reliably
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)', // Added spender/amount names
  'function allowance(address owner, address spender) view returns (uint256)', // Added owner/spender names
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)', // Often needed
  'function symbol() view returns (string)', // Often needed
  'function name() view returns (string)' // Often needed
];

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

// Track if a network switch is in progress to prevent loops
let networkSwitchInProgress = false;

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
  const [xenContract, setXenContract] = useState(null);
  const [xburnTokenContract, setXburnTokenContract] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [xburnMinterContract, setXburnMinterContract] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState(() => {
      const storedChainId = localStorage.getItem('selectedChainId');
      if (storedChainId) {
        const parsedChainId = parseInt(storedChainId, 10);
        if (supportedChains.some(chain => chain.id === parsedChainId)) {
            return parsedChainId;
        }
        localStorage.removeItem('selectedChainId'); // Clean up invalid stored ID
      }
      return base.id; // Default to Base
  }); 
  const [xenBalanceRaw, setXenBalanceRaw] = useState(null);
  const [xburnBalanceRaw, setXburnBalanceRaw] = useState(null);
  const [xenApprovalRaw, setXenApprovalRaw] = useState(null);
  const [xburnApprovalRaw, setXburnApprovalRaw] = useState(null);
  const initialCheckDone = useRef(false);
  const isMounted = useRef(true); // Track mount status

  // *** ADD isLoadingContracts state ***
  const [isLoadingContracts, setIsLoadingContracts] = useState(true); 

  // Cleanup on unmount
  useEffect(() => {
      isMounted.current = true;
      return () => {
          isMounted.current = false;
      };
  }, []); // REMOVED balanceInterval dependency

  const getCurrentAddresses = useCallback(() => {
    // Return null if no valid chain ID is selected
    if (!selectedChainId || !supportedChains.some(c => c.id === selectedChainId)) {
      return null;
    }
    return getAddresses(selectedChainId);
  }, [selectedChainId]);

  const safeRequest = useCallback(async (requestFn, errorMsg = 'RPC request failed') => {
      return enqueueRequest(async () => {
      try {
        return await requestFn();
      } catch (error) {
        console.warn(`${errorMsg}:`, error);
        throw new Error(errorMsg);
      }
    });
   }, []);

  // Function to clear balance & approval state
  const clearBalanceState = useCallback(() => {
      if (isMounted.current) {
          setEthBalance('0'); setXenBalance('0'); setXburnBalance('0');
          setXenBalanceRaw('0'); setXburnBalanceRaw('0');
          setXenApprovalRaw('0'); setXburnApprovalRaw('0');
      }
  }, []);

  // Function to clear contract state
  const clearContractState = useCallback(() => {
     if (isMounted.current) {
          setXenContract(null); setXburnTokenContract(null); 
          setNftContract(null); setXburnMinterContract(null); 
     }
  }, []);
  
  // --- Define fetchBalances BEFORE initializeContracts --- 
  const fetchBalances = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    // Check core dependencies including contract readiness NOW
    if (!account || !provider || !selectedChainId || !supportedChains.some(c => c.id === selectedChainId) || isLoadingContracts || !xenContract || !xburnTokenContract) {
      console.log('WalletContext: Skipping balance fetch - Core dependencies/contracts not ready:', 
          { account: !!account, provider: !!provider, selectedChainId, isLoadingContracts, xenContract: !!xenContract, xburnTokenContract: !!xburnTokenContract });
      return; 
    }

    // Don't attempt to fetch balances during network switching
    if (networkSwitchInProgress) {
      console.log('WalletContext: Skipping balance fetch during network switch');
      return;
    }

    // --- Ensure network consistency --- 
    try {
      // Get current network from provider
      const network = await provider.getNetwork();
      const providerChainId = network.chainId;
      
      // Verify the network matches our state
      if (providerChainId !== selectedChainId) {
        console.log(`WalletContext: Network ID mismatch detected. Provider: ${providerChainId}, State: ${selectedChainId}`);
        console.log(`WalletContext: Detected supported network ${providerChainId}. Synchronizing state...`);
        
        // Let the app know we detected a network change so it can update
        setSelectedChainId(providerChainId);
        return; // Exit to allow state update to propagate
      }
    } catch (error) {
      console.error('WalletContext: Error checking network during balance fetch:', error);
      return;
    }

    // Get addresses for the CURRENT selected chain ID (verified)
    const currentAddresses = getAddresses(selectedChainId); 
    // Use state contract instances directly
    const currentXenContract = xenContract;
    const currentXburnTokenContract = xburnTokenContract;
    
    // Check if contracts and addresses are valid for the current chain
    if (!currentAddresses || !currentAddresses.XENBURNER_ADDRESS || 
        !currentXenContract || !currentXburnTokenContract) {
        console.warn(`WalletContext: Skipping balance fetch - Contract/address mismatch for chain ${selectedChainId}`);
        console.log({ 
            currentAddresses: !!currentAddresses,
            burnerAddr: currentAddresses?.XENBURNER_ADDRESS,
            xenContractAddr: currentXenContract?.address,
            expectedXenAddr: currentAddresses?.XEN_ADDRESS,
            xburnTokenAddr: currentXburnTokenContract?.address,
            expectedXburnAddr: currentAddresses?.XBURN_TOKEN_ADDRESS
         });
        // Clear balances if addresses are missing/mismatched
        clearBalanceState(); 
        return;
    }
    
    const now = Date.now();
    if (!forceRefresh && now - lastBalanceFetchTime < MIN_BALANCE_FETCH_INTERVAL) return;
    lastBalanceFetchTime = now;
    
    console.log(`WalletContext: Fetching balances/allowances for account: ${account} on chain: ${selectedChainId} using state contracts.`);
    
    try {
      const burnerAddr = currentAddresses.XENBURNER_ADDRESS;

      // Check if addresses and contracts are defined (additional safety check)
      if (!burnerAddr || !currentXenContract.address || !currentXburnTokenContract.address) {
        console.error('WalletContext: Missing critical contract addresses/instances for chain', selectedChainId);
        return;
      }

      // Use separate try/catch blocks for each balance/allowance check
      let ethBal = '0', xenBal = '0', xburnBal = '0', xenApproval = '0', xburnApproval = '0';
      
      // ETH balance
      try {
        ethBal = await safeRequest(() => provider.getBalance(account), 'Error fetching ETH balance');
      } catch (err) {
        console.warn('WalletContext: Error fetching ETH balance:', err);
      }
      
      // XEN balance
      try {
        xenBal = await safeRequest(() => currentXenContract.balanceOf(account), 'Error fetching XEN balance');
      } catch (err) {
        console.warn('WalletContext: Error fetching XEN balance:', err);
      }
      
      // XBURN balance
      try {
        xburnBal = await safeRequest(() => currentXburnTokenContract.balanceOf(account), 'Error fetching XBURN balance');
      } catch (err) {
        console.warn('WalletContext: Error fetching XBURN balance:', err);
      }
      
      // XEN allowance
      try {
        xenApproval = await safeRequest(() => currentXenContract.allowance(account, burnerAddr), 'Error fetching XEN allowance');
      } catch (err) {
        console.warn('WalletContext: Error fetching XEN allowance:', err);
      }
      
      // XBURN allowance
      try {
        xburnApproval = await safeRequest(() => currentXburnTokenContract.allowance(account, burnerAddr), 'Error fetching XBURN allowance');
      } catch (err) {
        console.warn('WalletContext: Error fetching XBURN allowance:', err);
      }
      
      if (isMounted.current) {
          // Update state with fetched values - use default '0' for null/undefined values
          setXenBalanceRaw(xenBal ?? '0');
          setXburnBalanceRaw(xburnBal ?? '0');
          setXenApprovalRaw(xenApproval ?? '0');
          setXburnApprovalRaw(xburnApproval ?? '0');
          setEthBalance(ethers.utils.formatEther(ethBal ?? '0'));
          setXenBalance(ethers.utils.formatUnits(xenBal ?? '0', 18));
          setXburnBalance(ethers.utils.formatUnits(xburnBal ?? '0', 18));
          console.log('WalletContext: Balances/allowances updated successfully.');
      }
    } catch (error) {
      console.error('WalletContext: Error fetching balances/allowances:', error);
      if (isMounted.current) {
          toast.error(`Failed to fetch balances on ${getChainById(selectedChainId)?.name || 'this network'}.`);
          // Optionally clear balances on error
          // clearBalanceState(); 
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, provider, selectedChainId, isLoadingContracts, xenContract, xburnTokenContract, 
      safeRequest, setSelectedChainId]);

  // Memoize initializeContracts with useCallback
  const initializeContracts = useCallback(async (providerInstance, chainId) => {
    if (!providerInstance || !chainId) {
      console.error("WalletContext: Missing provider or chainId for contract initialization");
      return;
    }
    
    try {
      console.log(`WalletContext: Initializing contracts for chain ${chainId}`);
      setIsLoadingContracts(true);
      
      // Verify the provider's network matches the expected chainId
      let actualChainId;
      try {
        const network = await providerInstance.getNetwork();
        actualChainId = network.chainId;
        
        if (actualChainId !== chainId) {
          console.error(`WalletContext: Provider network (${actualChainId}) doesn't match requested chainId (${chainId})`);
          // Create a fresh provider to avoid stale network state
          if (window.ethereum) {
            const freshProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            const freshNetwork = await freshProvider.getNetwork();
            if (freshNetwork.chainId === chainId) {
              console.log(`WalletContext: Using fresh provider with correct network`);
              providerInstance = freshProvider;
              setProvider(freshProvider);
              setSigner(freshProvider.getSigner());
            } else {
              console.error(`WalletContext: Even fresh provider has wrong network. Cannot initialize contracts.`);
              setIsLoadingContracts(false);
              return;
            }
          } else {
            setIsLoadingContracts(false);
            return;
          }
        }
      } catch (error) {
        console.error("WalletContext: Error checking provider network:", error);
        // Continue anyway, but be aware we might have network inconsistencies
      }
      
      const addresses = getAddresses(chainId);
      
      if (!addresses) {
        console.error(`WalletContext: No addresses found for chain ${chainId}`);
        setIsLoadingContracts(false);
        return;
      }
      
      // Special case for Base chain where XEN is called XENON
      if (chainId === base.id) {
        console.log("WalletContext: Using XENON token for Base chain (instead of XEN)");
      }
      
      // Create contract instances
      const newXenContract = new ethers.Contract(addresses.XEN_ADDRESS, XEN_ABI, providerInstance);
      const newXburnTokenContract = new ethers.Contract(addresses.XBURN_TOKEN_ADDRESS, ERC20_ABI, providerInstance);
      const newXburnMinterContract = new ethers.Contract(addresses.XBURN_MINTER_ADDRESS, xenBurnerAbi, providerInstance);
      const newNftContract = new ethers.Contract(addresses.XBURN_NFT_ADDRESS, xburnNftAbi, providerInstance);
      
      // Set state for each contract
      setXenContract(newXenContract);
      setXburnTokenContract(newXburnTokenContract);
      setXburnMinterContract(newXburnMinterContract);
      setNftContract(newNftContract);
      
      // Mark contracts as loaded
      setIsLoadingContracts(false);
      
      // We no longer call fetchBalances here to avoid the circular dependency
      // The component will trigger fetchBalances through its useEffect when isLoadingContracts becomes false
      
      console.log(`WalletContext: Contracts initialized for chain ${chainId}`);
    } catch (error) {
      console.error(`WalletContext: Error initializing contracts for chain ${chainId}:`, error);
      setIsLoadingContracts(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setIsLoadingContracts, setXenContract, setXburnTokenContract, setNftContract, setXburnMinterContract]);

  // Clear all user-specific state (including contracts)
  // eslint-disable-next-line no-unused-vars
  const clearUserState = useCallback(() => {
    setAccount(null); setSigner(null); setProvider(null); 
    clearBalanceState();
    clearContractState();
    if(isMounted.current) setIsLoadingContracts(true);
    if(isMounted.current) setConnecting(false); 
  }, [clearBalanceState, clearContractState]);

  // Handler for chainChanged event
  const handleChainChanged = useCallback((chainIdHex) => {
    const chainId = parseInt(chainIdHex, 16);
    console.log(`WalletContext: Wallet network changed event. New chainId: ${chainId}`);
    
    // Prevent processing if another network switch is in progress
    if (networkSwitchInProgress) {
      console.log(`WalletContext: Ignoring chain changed event during network switch`);
      return;
    }
    
    // Update state if chain is supported
    if (supportedChains.some(c => c.id === chainId)) {
      console.log(`WalletContext: Switched to supported network: ${chainId}. Updating state...`);
      
      // Create a completely new provider instance to avoid network mismatch issues
      if (window.ethereum) {
        const newProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        setProvider(newProvider);
        setSigner(newProvider.getSigner());
      }
      
      // Update chain ID
      setSelectedChainId(chainId);
      localStorage.setItem('selectedChainId', chainId.toString());
      
      // Force re-initialize contracts for new chain
      clearContractState();
      clearBalanceState();
    } else {
      console.log(`WalletContext: Wallet switched to unsupported network: ${chainId}`);
      if (isMounted.current) {
        toast.error(`Network ${chainId} is not supported. Please switch to a supported network.`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearContractState, clearBalanceState]);
  
  // Handle account changes
  const handleAccountsChanged = useCallback((accounts) => {
    console.log('WalletContext: Accounts changed:', accounts);
    if (accounts.length > 0) {
      setAccount(accounts[0]);
    } else {
      // User disconnected account in wallet - call disconnectWallet directly
      // instead of using disconnect to avoid circular dependency
      disconnectWallet(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to disconnect wallet - implementation
  const disconnectWallet = (isWalletInitiated = false) => {
    // Set manual flag only if user actually clicked disconnect
    userManuallyDisconnected = !isWalletInitiated; 
    
    // Remove event listeners if ethereum is available
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
    
    // Clear state
    if (isMounted.current) {
      setAccount(null);
      setProvider(null);
      setSigner(null);
      clearBalanceState();
      clearContractState();
    }
    
    // Clear local storage flag
    localStorage.removeItem('walletConnected');
    console.log('WalletContext: Wallet disconnected.', isWalletInitiated ? '(wallet-initiated)' : '(user-initiated)');
  };

  // Function to disconnect wallet - exposed in context
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const disconnect = useCallback(disconnectWallet, [clearBalanceState, clearContractState]);

  // Function to handle network switching request
  const switchNetwork = useCallback(async (newChainId) => {
    // Prevent multiple simultaneous network switches
    if (networkSwitchInProgress) {
      console.log("Network switch already in progress, ignoring request");
      return false;
    }

    if (!window.ethereum) {
      toast.error("Please install a compatible wallet.");
      return false;
    }
    const targetChain = getChainById(newChainId);
    if (!targetChain) {
      toast.error("Unsupported network selected.");
      return false;
    }
    
    // Check current network
    let currentNetworkId;
    try {
      const currentProviderCheck = provider || new ethers.providers.Web3Provider(window.ethereum, 'any');
      const networkCheck = await currentProviderCheck.getNetwork();
      currentNetworkId = networkCheck.chainId;
    } catch (error) {
      console.error("Error checking current network:", error);
      // Proceed anyway, maybe the provider is just in a bad state
    }
    
    if (currentNetworkId === newChainId) {
      console.log("WalletContext: Already on the selected network.");
      if(selectedChainId !== newChainId && isMounted.current) {
          setSelectedChainId(newChainId);
          localStorage.setItem('selectedChainId', newChainId.toString());
          
          // Initialize contracts if we're already on the target chain but context isn't updated
          if (!isLoadingContracts) {
              // Create a fresh provider to avoid stale network state
              const freshProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
              setProvider(freshProvider);
              setSigner(freshProvider.getSigner());
              // Then initialize contracts with the fresh provider
              initializeContracts(freshProvider, newChainId);
          }
      }
      return true;
    }
    
    console.log(`WalletContext: Attempting to switch wallet network to ${targetChain.name} (${newChainId})`);
    const targetChainIdHex = ethers.utils.hexValue(newChainId);
    if(isMounted.current) setConnecting(true);

    // Set flag to prevent re-entry
    networkSwitchInProgress = true;
    
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChainIdHex }] });
      console.log("WalletContext: Network switch request sent successfully.");
      
      // Wait a moment for chain change event to be processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a completely new provider after chain switch
      const newProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      const network = await newProvider.getNetwork();
      
      // Update provider state with the new instance
      if (isMounted.current) {
        setProvider(newProvider);
        setSigner(newProvider.getSigner());
        
        // IMPORTANT: Immediately update the selectedChainId state to match the network
        // This synchronizes the app state with the actual network
        if (network.chainId === newChainId) {
          console.log(`WalletContext: Updating selectedChainId state to ${newChainId}`);
          setSelectedChainId(newChainId);
          localStorage.setItem('selectedChainId', newChainId.toString());
          
          // Clear existing contracts to force re-initialization with the new network
          clearContractState();
          clearBalanceState();
          
          // After a short delay, force refresh balances to ensure updated data
          setTimeout(() => {
            if (isMounted.current) {
              fetchBalances(true);
            }
          }, 1500); // Wait for contracts to initialize
        }
      }
      
      if (network.chainId === newChainId) {
        console.log(`WalletContext: Switch to chain ${newChainId} confirmed successful.`);
        return true;
      } else {
        console.log(`WalletContext: Expected chain ${newChainId} but got ${network.chainId}`);
        return false;
      }
    } catch (switchError) {
      console.error('WalletContext: Error switching network:', switchError);
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{
                chainId: targetChainIdHex, chainName: targetChain.name, nativeCurrency: targetChain.nativeCurrency,
                rpcUrls: targetChain.rpcUrls.default.http, blockExplorerUrls: [targetChain.blockExplorers.default.url],
              },],
          });
          // Check if adding the network was successful
          await new Promise(resolve => setTimeout(resolve, 1000));
          const newProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
          const network = await newProvider.getNetwork();
          
          // Update provider state
          if (isMounted.current) {
            setProvider(newProvider);
            setSigner(newProvider.getSigner());
            
            // Also update chain ID here for consistency
            if (network.chainId === newChainId) {
              setSelectedChainId(newChainId);
              localStorage.setItem('selectedChainId', newChainId.toString());
              
              // Clear existing contracts to force re-initialization
              clearContractState();
              clearBalanceState();
              
              // Also refresh balances after a delay
              setTimeout(() => {
                if (isMounted.current) {
                  fetchBalances(true);
                }
              }, 1500);
            }
          }
          
          return network.chainId === newChainId;
        } catch (addError) {
          console.error("WalletContext: Failed to add network:", addError);
          toast.error(`Failed to add ${targetChain.name} network.`);
          return false;
        }
      } else {
        toast.error(`Failed to switch to ${targetChain.name}. Please switch manually.`);
        return false;
      }
    } finally {
       if(isMounted.current) setConnecting(false);
       // Reset flag when done
       networkSwitchInProgress = false;
    }
  }, [provider, selectedChainId, isLoadingContracts, initializeContracts, clearContractState, clearBalanceState, fetchBalances]);

  // Connect function implementation
  const connectWallet = async (isAutoConnect = false, targetChainId = selectedChainId) => {
    if (connecting && !isAutoConnect) return; // Prevent duplicate connect attempts
    if (isAutoConnect) {
      console.log(`WalletContext: Attempting connection. Auto: ${isAutoConnect}, Target Chain: ${targetChainId}`);
    }
    
    try {
      setConnecting(true);
      
      if (!window.ethereum) {
        if (!isAutoConnect) {
          toast.error('Ethereum provider not found. Please install a wallet.');
        }
        setConnecting(false);
        return;
      }
      
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const newAccount = accounts[0];
      console.log(`WalletContext: Account acquired: ${newAccount}`);
      
      // Create a fresh provider instance
      const providerInstance = new ethers.providers.Web3Provider(window.ethereum, 'any');
      
      // Check if connected on a supported network
      const network = await providerInstance.getNetwork();
      console.log(`WalletContext: Wallet is currently on chain: ${network.chainId}`);
      
      // If target chain specified & different from current, try to switch network
      let newChainId = targetChainId;
      if (!supportedChains.some(c => c.id === targetChainId)) {
        // If target chain is not supported, use the current network if supported, or default to first supported chain
        newChainId = supportedChains.some(c => c.id === network.chainId) ? 
          network.chainId : supportedChains[0].id;
      }
      
      console.log(`WalletContext: Proceeding with connection setup for chain: ${newChainId}`);
      
      // Clear any existing event listeners first
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
      
      // Set up provider event listeners for account and chain changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Set account and provider state
      setAccount(newAccount);
      setProvider(providerInstance);
      setSigner(providerInstance.getSigner());
      
      // Save connection state for reconnection 
      localStorage.setItem('walletConnected', 'true');
      
      // If connected on unsupported chain or different from target, try to switch
      if (newChainId !== network.chainId) {
        console.log(`WalletContext: Need to switch from ${network.chainId} to ${newChainId}`);
        
        // Set the target chain ID directly to avoid race conditions
        // This will trigger the effect to initialize contracts AFTER the network switch completes
        if (networkSwitchInProgress) {
          console.log("WalletContext: Network switch already in progress, skipping additional switch");
        } else {
          // Attempt to switch networks, but don't wait for it to complete
          // The chainChanged event handler will update the state when switch completes
          switchNetwork(newChainId);
        }
      } else {
        // Already on the correct chain, update selectedChainId in state
        console.log(`WalletContext: Already on correct chain ${network.chainId}, updating state`);
        setSelectedChainId(network.chainId);
        localStorage.setItem('selectedChainId', network.chainId.toString());
      }
      
      userManuallyDisconnected = false;
    } catch (error) {
      console.error('WalletContext: Connection error:', error);
      if (!isAutoConnect) { // Only show error for manual connections
        toast.error(`Could not connect to wallet: ${error.message}`);
      }
    } finally {
      setConnecting(false);
    }
  };

  // Connect function - exposed in context
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const connect = useCallback(connectWallet, [connecting, selectedChainId, supportedChains]);

  // Effect to handle wallet events (accountsChanged, chainChanged)
  useEffect(() => {
    if (window.ethereum) {
      // Clean up any existing listeners first to avoid duplicates
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
      
      // Set up the listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Return cleanup function
      return () => {
        if (window.ethereum && window.ethereum.removeListener) { 
           window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
           window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [handleAccountsChanged, handleChainChanged]);

  // Check connection on initial load
  useEffect(() => {
    if (initialCheckDone.current || typeof window === 'undefined') return;
    initialCheckDone.current = true;
    const checkInitialConnection = async () => {
      if (userManuallyDisconnected) return;
      const previouslyConnected = localStorage.getItem('walletConnected') === 'true';
      if (previouslyConnected && window.ethereum) {
          console.log('WalletContext: Attempting auto-reconnect...');
          await connect(true, selectedChainId); 
      } else {
          setIsLoadingContracts(false);
      }
    };
    checkInitialConnection(); 
  }, [connect, selectedChainId]);

  // --- Balance Polling Effect --- 
  useEffect(() => {
      if (!isMounted.current) return;
      let intervalId = null; 
      
      // Check dependencies including contract readiness
      if (account && provider && selectedChainId && !isLoadingContracts && xenContract && xburnTokenContract) { 
          console.log(`WalletContext: Contracts ready, setting up balance polling for chain ${selectedChainId}`);
          // Clear previous interval just in case
          if (intervalId) clearInterval(intervalId);
          
          // Initial fetch right away when all dependencies are met
          fetchBalances(true); 
          // Setup interval
          intervalId = setInterval(() => fetchBalances(false), MIN_BALANCE_FETCH_INTERVAL * 3); 
      } else {
          console.log("WalletContext: Clearing balance polling (dependencies not met or contracts loading).");
          if (intervalId) {
              clearInterval(intervalId);
          }
      }
      // Return cleanup function
      return () => {
          if (intervalId) {
              clearInterval(intervalId);
          }
      };
  }, [account, provider, selectedChainId, isLoadingContracts, xenContract, xburnTokenContract, fetchBalances]);

  // --- Initialize Contract Instances --- 
  useEffect(() => {
    if (!isMounted.current) return;
    
    // Skip initialization during active network switching
    if (networkSwitchInProgress) {
      console.log(`WalletContext: Skipping contract initialization during network switch`);
      return;
    }
    
    // Set loading state to true when starting initialization
    if (provider && selectedChainId && supportedChains.some(c => c.id === selectedChainId)) {
      console.log(`WalletContext: Initializing contracts using effect for chain ${selectedChainId}`);
      
      // Add a small delay to ensure the network has stabilized
      const timer = setTimeout(() => {
        if (isMounted.current) {
          initializeContracts(provider, selectedChainId);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      console.log(`WalletContext: Cannot initialize contracts: missing provider or invalid chain ID`);
      clearContractState();
      clearBalanceState();
      setIsLoadingContracts(false); // Set loading to false if provider/chain invalid
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, selectedChainId, clearContractState, clearBalanceState]);

  // Fetch token allowance with better error handling
  const fetchTokenAllowance = useCallback(async (tokenContract, ownerAddress, spenderAddress, tokenName) => {
    try {
      if (!tokenContract || !ownerAddress || !spenderAddress) {
        console.log(`Skipping ${tokenName} allowance check - missing dependencies`);
        return ethers.constants.Zero;
      }
      
      // Check if contract has allowance method before calling
      if (!tokenContract.allowance) {
        console.log(`Contract for ${tokenName} doesn't have allowance method - likely on unsupported network`);
        return ethers.constants.Zero;
      }
      
      try {
        const allowance = await enqueueRequest(() => tokenContract.allowance(ownerAddress, spenderAddress));
        return allowance;
      } catch (error) {
        console.warn(`Error fetching ${tokenName} allowance:`, error);
        // Return zero instead of throwing for better user experience on unsupported networks
        return ethers.constants.Zero;
      }
    } catch (error) {
      console.warn(`Error in fetchTokenAllowance for ${tokenName}:`, error);
      return ethers.constants.Zero;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Better contract availability checking
  const isContractAvailable = useCallback((contract) => {
    if (!contract) return false;
    
    // If we're on a testnet like Sepolia, some contracts might not be deployed
    // Return false so the UI can handle it gracefully
    if (selectedChainId === 11155111) { // Sepolia 
      return false;
    }
    
    return true;
  }, [selectedChainId]);

  // Context Value exposed to consumers
  const contextValue = {
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
    // Expose all contract instances
    xenContract,
    xburnTokenContract,
    nftContract,
    xburnMinterContract, 
    isConnected: !!account && !!provider && !!selectedChainId && supportedChains.some(c => c.id === selectedChainId),
    isConnecting: connecting,
    isLoadingContracts, // <-- Expose loading state
    selectedChainId,
    supportedChains,
    getCurrentAddresses,
    connect,
    disconnect,
    switchNetwork,
    safeRequest,
    fetchBalances, // Expose fetchBalances for manual refresh
    fetchTokenAllowance,
    isContractAvailable
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Hook to use the wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
