import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import './BurnPanel.css';

// Import sub-components
import BurnXENTab from './BurnXENTab';
import BurnXBURNTab from './BurnXBURNTab';
import SwapBurnTab from './SwapBurnTab';
// import SwapTab from './SwapTab'; // REMOVED IMPORT
import { BurnPanelContext } from './BurnPanelContext';
import TabView from './TabView';
// eslint-disable-next-line no-unused-vars
import TermSelect from './TermSelect';
// eslint-disable-next-line no-unused-vars
import InputToken from './InputToken';

// eslint-disable-next-line no-unused-vars
import FireParticles from '../FireParticles';
import { Instructions } from '../Instructions';
import { InfoCards } from '../InfoCards';

// Import utility functions
import { 
  // Removed unused: formatDecimals, formatTokenAmount, parseInputValue, calculateDaysForMultiplier 
  safelyCompareWithBalance
} from '../../utils/tokenUtils';

// Import constants
import { 
  DEFAULT_AMP_START,
} from '../../utils/constants';

// Import contract addresses and ABIs - REMOVED unused import
// import {
//   XENBURNER_ADDRESS 
// } from '../../constants/addresses';

// Import wallet context
import { useWallet } from '../../context/WalletContext';
import { useGlobalData } from '../../context/GlobalDataContext';

// Update logo references to use public folder paths
// eslint-disable-next-line no-unused-vars
const xenLogo = '/xen.png';
// eslint-disable-next-line no-unused-vars
const xburnLogo = '/logo192.png';

// Add Uniswap constants
// const UNISWAP_ROUTER = UNISWAP_ROUTER_ADDRESS; // Keep if needed by Swap&Burn

// Create memoized components to prevent unnecessary re-renders
const MemoizedTabView = React.memo(TabView);
const MemoizedInstructions = React.memo(Instructions);
const MemoizedInfoCards = React.memo(InfoCards);
const MemoizedBurnXENTab = React.memo(BurnXENTab);
const MemoizedBurnXBURNTab = React.memo(BurnXBURNTab);
const MemoizedSwapBurnTab = React.memo(SwapBurnTab);

// Cache for progress data to reduce re-fetches
const progressCache = {
  data: null,
  timestamp: 0,
  expiryTime: 30000 // 30 seconds cache
};

/**
 * BurnPanel - Main component container for different burn/swap tabs
 */
const BurnPanel = () => {
  const { 
    account, 
    signer, 
    provider, 
    xenBalance, 
    xburnBalance, 
    xburnApprovalRaw, 
    xburnMinterContract, 
    xburnTokenContract, 
    fetchBalances, 
    getCurrentAddresses,
    selectedChainId
  } = useWallet();
  
  const { stats: globalStatsData } = useGlobalData(); 

  const { activeTab, setActiveTab } = useContext(BurnPanelContext);
  
  const [isLoading, setIsLoading] = useState(false); 
  const [progress, setProgress] = useState({ percentage: 0, accumulated: '0', threshold: '0' });
  const [approving, setApproving] = useState(false);
  const [xburnAmount, setXburnAmount] = useState('');
  
  // Memoize this function to improve performance
  const fetchSwapBurnProgress = useCallback(async () => { 
    // Check cache first
    const now = Date.now();
    if (progressCache.data && (now - progressCache.timestamp < progressCache.expiryTime)) {
      console.log("Using cached progress data");
      setProgress(progressCache.data);
      return;
    }

    const currentAddresses = getCurrentAddresses();
    
    // Remove isLoadingContracts check here, rely on GlobalDataContext trigger
    if (!account || !xburnMinterContract || !currentAddresses || !currentAddresses.XBURN_MINTER_ADDRESS) {
        console.log("Fetch Swap Burn Progress: Skipped, dependencies not ready (account, contract, addresses).");
        return; 
    }

    // Keep address check
    if (xburnMinterContract.address.toLowerCase() !== currentAddresses.XBURN_MINTER_ADDRESS.toLowerCase()) {
        console.warn(`Fetch Swap Burn Progress: Contract address mismatch. Expected ${currentAddresses.XBURN_MINTER_ADDRESS}, got ${xburnMinterContract.address}`);
        setProgress({ percentage: 0, accumulated: '0', threshold: '0' });
        return; 
    }

    console.log("Fetching Swap Burn Progress...");
    try {
      const progressRaw = await xburnMinterContract.getAccumulationProgress();
      const accumulated = ethers.utils.formatUnits(progressRaw.accumulated || '0', 18);
      const threshold = ethers.utils.formatUnits(progressRaw.threshold || '0', 18);
      const accumulatedNum = parseFloat(accumulated);
      const thresholdNum = parseFloat(threshold);
      let percentageFromContract = 0;
      if (progressRaw.percentage !== undefined && progressRaw.percentage.gt(0)) {
        try {
          percentageFromContract = progressRaw.percentage.toNumber() / 100;
        } catch (e) {
          console.warn("Could not parse percentage from contract, using calculated.", e);
          percentageFromContract = 0;
        } 
      } 
      const percentageToStore = percentageFromContract > 0 
          ? Math.min(100, percentageFromContract)
          : thresholdNum > 0 ? Math.min(100, (accumulatedNum / thresholdNum) * 100) : 0;
      const progressData = { 
          accumulated,
          threshold,
          percentage: percentageToStore
      };
      
      // Update the cache
      progressCache.data = progressData;
      progressCache.timestamp = now;
      
      setProgress(prev => ({ ...prev, ...progressData })); 
      console.log("Swap Burn Progress fetched.");
    } catch (error) {
      console.error('Error fetching Swap Burn Progress:', error);
    }
  }, [account, xburnMinterContract, getCurrentAddresses]);

  // Use a single effect to fetch progress data
  useEffect(() => {
    if (account && xburnMinterContract) {
      fetchSwapBurnProgress();
      
      // Set up interval with a longer delay for less frequent refreshes
      const intervalId = setInterval(fetchSwapBurnProgress, 60000); // Check once per minute
      
      return () => clearInterval(intervalId);
    }
  }, [account, xburnMinterContract, fetchSwapBurnProgress]);

  // Memoize this calculation to avoid recalculating on every render
  const formattedXburnApproval = useMemo(() => {
    return xburnApprovalRaw 
     ? ethers.utils.formatUnits(xburnApprovalRaw, 18)
     : '0';
  }, [xburnApprovalRaw]);

  // Helper function to validate chain consistency - memoized for performance
  const validateChainConsistency = useCallback(async () => {
    try {
      if (!provider) return false;
      
      const network = await provider.getNetwork();
      const providerChainId = network.chainId;
      
      // Check if we're on Sepolia testnet and show a friendly message
      if (providerChainId === 11155111) {
        console.log("Sepolia testnet detected - burn functionality not available");
        toast.error('Sepolia testnet is not supported for burning operations. Please switch to a supported network.');
        return false;
      }
      
      // Change to compare provider chain ID with selectedChainId instead
      if (providerChainId !== selectedChainId) {
        console.error(`Chain ID mismatch. Provider: ${providerChainId}, Selected: ${selectedChainId}`);
        toast.error('Network mismatch detected. Please refresh the page or switch networks in your wallet.');
        return false;
      }
      
      // Validate contract addresses
      const currentAddresses = getCurrentAddresses();
      if (!currentAddresses) {
        toast.error('Network configuration not found. Please switch to a supported network.');
        return false;
      }
      
      if (!xburnMinterContract) {
        toast.error('Contract not available. Please refresh or switch to a supported network.');
        return false;  
      }
      
      if (xburnMinterContract.address.toLowerCase() !== currentAddresses.XENBURNER_ADDRESS.toLowerCase()) {
        console.error(`Contract address mismatch. Expected: ${currentAddresses.XENBURNER_ADDRESS}, Got: ${xburnMinterContract?.address}`);
        toast.error('Contract configuration mismatch. Please refresh the page.');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Failed to validate chain consistency:", error);
      toast.error('Network validation failed. Please refresh and try again.');
      return false;
    }
  }, [provider, selectedChainId, getCurrentAddresses, xburnMinterContract]);

  const handleApprove = useCallback(async () => {
    const currentAddresses = getCurrentAddresses(); 
    if (!account || !signer || !xburnTokenContract || !currentAddresses) { 
      toast.error('Please connect wallet and ensure token contract is loaded.');
      return;
    }

    // Validate chain consistency
    if (!(await validateChainConsistency())) {
      return;
    }

    const amountToApprove = xburnAmount; 
    const tokenBalance = xburnBalance;
    const tokenName = 'XBURN';
    if (!amountToApprove || parseFloat(amountToApprove) <= 0) {
      toast.error(`Please enter an amount to approve`);
      return;
    }
    if (safelyCompareWithBalance(amountToApprove, tokenBalance)) {
      toast.error('Amount exceeds your balance');
      return;
    }

    setIsLoading(true); 
    setApproving(true);
    try {
      console.log(`Approving ${tokenName} tokens...`);
      const maxApproval = ethers.constants.MaxUint256;
      const spenderAddress = currentAddresses.XENBURNER_ADDRESS; 
      if (!spenderAddress) {
        toast.error('Burner address not found for this network.');
        setIsLoading(false);
        setApproving(false);
        return;
      }
      
      const tx = await xburnTokenContract.connect(signer).approve(spenderAddress, maxApproval);
        
      toast('Approval transaction submitted...', { icon: 'ℹ️' });
      await tx.wait();
      
      if (fetchBalances) { 
          await fetchBalances(true); 
      } else {
          console.warn("Could not refresh balances after approval - missing dependencies");
      }
      
      toast.success(`${tokenName} tokens approved successfully!`);
    } catch (error) {
      console.error('Error approving tokens:', error);
      toast.error(`Error approving tokens: ${error.message || error.reason}`);
    } finally {
      setIsLoading(false);
      setApproving(false);
    }
  }, [account, signer, xburnTokenContract, getCurrentAddresses, validateChainConsistency, xburnAmount, xburnBalance, fetchBalances]);

  const handleBurnXBURN = useCallback(async () => {
    if (!account || !signer || !xburnMinterContract) {
      toast.error('Please connect your wallet');
      return;
    }

    // Validate chain consistency
    if (!(await validateChainConsistency())) {
      return;
    }

    if (!xburnAmount || parseFloat(xburnAmount) <= 0) {
      toast.error('Please enter an amount to burn');
      return;
    }
    if (safelyCompareWithBalance(xburnAmount, xburnBalance)) {
      toast.error('Amount exceeds your balance');
      return;
    }
    if (safelyCompareWithBalance(xburnAmount, formattedXburnApproval)) { 
      toast.error('Please approve the tokens first');
      return;
    }

    setIsLoading(true);
    try {
      const xburnMinterWithSigner = xburnMinterContract.connect(signer);
      const amountWei = ethers.utils.parseUnits(xburnAmount, 18);
      
      // Add gas parameters to improve reliability
      const gasPrice = await provider.getGasPrice();
      const adjustedGasPrice = gasPrice.mul(120).div(100);
      
      // Call the contract's burnXburn function instead of transferring to a dead wallet
      const tx = await xburnMinterWithSigner.burnXburn(amountWei, {
        gasLimit: 1000000,
        gasPrice: adjustedGasPrice
      });
      
      toast('Burn transaction submitted...', { icon: 'ℹ️' });
      await tx.wait();
      
      setXburnAmount('');
      if (fetchBalances) await fetchBalances(true); 
      
      toast.success('XBURN burned successfully!');
    } catch (error) {
      console.error('Error burning XBURN:', error);
      toast.error(`Error burning XBURN: ${error.message || error.reason}`);
    } finally {
      setIsLoading(false);
    }
  }, [account, signer, xburnMinterContract, validateChainConsistency, xburnAmount, xburnBalance, formattedXburnApproval, provider, fetchBalances]);

  const handleSwapAndBurn = useCallback(async () => {
    if (!account || !signer || !xburnMinterContract) {
      toast.error('Please connect your wallet');
      return;
    }

    // Validate chain consistency
    if (!(await validateChainConsistency())) {
      return;
    }

    const accumulatedNum = parseFloat(progress?.accumulated || '0');
    const thresholdNum = parseFloat(progress?.threshold || '0');
    if (!progress || accumulatedNum < (thresholdNum * 0.999)) { 
       toast.error('Threshold not reached yet for Swap & Burn.');
       return;
    }

    setIsLoading(true);
    try {
      const xburnMinterWithSigner = xburnMinterContract.connect(signer);
      const minXburnReceived = ethers.utils.parseUnits("1", 0); 
      console.log("Swap & Burn parameters:", { minXburnReceived: minXburnReceived.toString() });
      
      const gasPrice = await provider.getGasPrice();
      const adjustedGasPrice = gasPrice.mul(120).div(100);
      
      const tx = await xburnMinterWithSigner.swapXenForXburn(minXburnReceived, {
        gasLimit: 2000000, 
        gasPrice: adjustedGasPrice 
      });
      
      toast('Swap & Burn transaction submitted...', { icon: 'ℹ️' });
      await tx.wait();
      
      if (fetchBalances) await fetchBalances(true);
      fetchSwapBurnProgress();
      
      toast.success('Swap & Burn executed successfully!');
    } catch (error) {
      console.error('Error executing Swap & Burn:', error);
       if (error.message?.includes('cannot estimate gas') || error.reason?.includes('gas required exceeds allowance')) {
        toast.error('Gas estimation failed. Contract may not be ready or issue with state. Try later.');
      } else if (error.message?.includes('execution reverted') || error.reason) {
         toast.error(`Transaction reverted: ${error.reason || 'Check threshold/state.'}`);
      } else if (error.message?.includes('user rejected')) {
        toast.error('Transaction was rejected by user.');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient funds for gas.');
      } else {
        toast.error(`Error executing Swap & Burn: ${error.message || error.reason}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [account, signer, xburnMinterContract, validateChainConsistency, progress, provider, fetchBalances, fetchSwapBurnProgress]);

  // Monitor tab changes to reduce console logs
  useEffect(() => {
    console.log(`BurnPanel: Tab changed to ${activeTab}`);
  }, [activeTab]);

  // Only log rendering once, not for every re-render
  console.log(`BurnPanel: Rendering tab content for ${activeTab}`);

  // Calculate which panel to display - using memoized calculation
  const activePanel = useMemo(() => {
    switch (activeTab) {
      case 'nfts':
        return <MemoizedBurnXENTab 
                  xenBalance={xenBalance}
                  ampStart={2397}
                  ampSnapshot={parseInt(globalStatsData?.data?.currentAMP || DEFAULT_AMP_START.toString())}
                  daysSinceLaunch={parseInt(globalStatsData?.data?.daysSinceLaunch || '0')}
                  totalBurnedXEN={globalStatsData?.data?.totalXenBurned || '0'}
                  totalMintedXBURN={globalStatsData?.data?.totalXburnMinted || '0'}
               />;
      case 'stats':
        return null;
      case 'burn':
      default:
        return <MemoizedBurnXENTab 
                  xenBalance={xenBalance}
                  ampStart={2397}
                  ampSnapshot={parseInt(globalStatsData?.data?.currentAMP || DEFAULT_AMP_START.toString())}
                  daysSinceLaunch={parseInt(globalStatsData?.data?.daysSinceLaunch || '0')}
                  totalBurnedXEN={globalStatsData?.data?.totalXenBurned || '0'}
                  totalMintedXBURN={globalStatsData?.data?.totalXburnMinted || '0'}
               />;
    }
  }, [activeTab, xenBalance, globalStatsData?.data]);

  return (
    <div className="burn-content">
      <MemoizedTabView activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'burnXEN' && (
        <MemoizedBurnXENTab
          xenBalance={xenBalance}
          ampStart={2397}
          ampSnapshot={parseInt(globalStatsData?.data?.currentAMP || DEFAULT_AMP_START.toString())}
          daysSinceLaunch={parseInt(globalStatsData?.data?.daysSinceLaunch || '0')}
          totalBurnedXEN={globalStatsData?.data?.totalXenBurned || '0'}
          totalMintedXBURN={globalStatsData?.data?.totalXburnMinted || '0'}
        />
      )}
      
      {activeTab === 'burnXBURN' && (
        <MemoizedBurnXBURNTab
          amount={xburnAmount} 
          setAmount={setXburnAmount} 
          balance={xburnBalance}
          approved={formattedXburnApproval}
          isLoading={isLoading && activeTab === 'burnXBURN'} 
          approving={approving && activeTab === 'burnXBURN'} 
          handleApprove={handleApprove} 
          handleBurn={handleBurnXBURN} 
          amountExceedsBalance={safelyCompareWithBalance(xburnAmount, xburnBalance)} 
        />
      )}
      
      {activeTab === 'swapBurn' && (
        <MemoizedSwapBurnTab
          progress={progress}
          isLoading={isLoading && activeTab === 'swapBurn'} 
          handleSwapAndBurn={handleSwapAndBurn} 
        />
      )}
      
      <MemoizedInstructions />
      <MemoizedInfoCards />
    </div>
  );
};

export default React.memo(BurnPanel); 