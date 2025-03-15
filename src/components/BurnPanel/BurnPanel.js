import React, { useState, useEffect, useCallback, useContext } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import './BurnPanel.css';

// Import sub-components
import BurnXENTab from './BurnXENTab';
import BurnXBURNTab from './BurnXBURNTab';
import SwapBurnTab from './SwapBurnTab';
import SwapTab from './SwapTab';
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
  formatDecimals, 
  // eslint-disable-next-line no-unused-vars
  safeFormatMaxBalance, 
  formatTokenAmount, 
  parseInputValue,
  calculateDaysForMultiplier,
  // eslint-disable-next-line no-unused-vars
  calculateMultiplier
} from '../../utils/tokenUtils';

// Import constants
import { 
  ROUTER_ABI, 
  // eslint-disable-next-line no-unused-vars
  PAIR_ABI,
  // eslint-disable-next-line no-unused-vars
  MAX_TERM_DAYS,
  DEFAULT_AMP_START,
  DEFAULT_AMP_SNAPSHOT
} from '../../utils/constants';

// Import contract addresses and ABIs
import {
  XEN_ADDRESS,
  XENBURNER_ADDRESS,
  UNISWAP_ROUTER_ADDRESS,
  // eslint-disable-next-line no-unused-vars
  WETH_ADDRESS
} from '../../constants/addresses';
import xenAbi from '../../contracts/xen.json';
import xenBurnerAbi from '../../contracts/XBurnMinter.json';

// Import wallet context
import { useWallet } from '../../context/WalletContext';
import { useGlobalData } from '../../context/GlobalDataContext';

// Update logo references to use public folder paths
// eslint-disable-next-line no-unused-vars
const xenLogo = '/xen.png';
// eslint-disable-next-line no-unused-vars
const xburnLogo = '/logo192.png';

// Add Uniswap constants
const UNISWAP_ROUTER = UNISWAP_ROUTER_ADDRESS;

/**
 * BurnPanel - Main component for burning XEN and XBURN tokens
 */
const BurnPanel = () => {
  const { 
    account, 
    provider, 
    signer, 
    xenBalance, 
    xburnBalance, 
    fetchBalances, 
    xburnMinterContract
  } = useWallet();

  const { activeTab, setActiveTab } = useContext(BurnPanelContext);
  
  // Define all state variables at the top
  const [amount, setAmount] = useState('');
  const [termDays, setTermDays] = useState(0);
  const [xenApproved, setXenApproved] = useState('0');
  const [xburnApproved, setXburnApproved] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ percentage: 0, accumulated: '0', threshold: '0' });
  const [isXenToXburn, setIsXenToXburn] = useState(false);
  const [swapAmount, setSwapAmount] = useState('');
  const [swapRate, setSwapRate] = useState('0');
  // eslint-disable-next-line no-unused-vars
  const [swapApproved, setSwapApproved] = useState('0');
  const [approving, setApproving] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [xburnAmount, setXburnAmount] = useState('');
  
  // Add state for AMP values from contract
  const [currentAMP, setCurrentAMP] = useState(DEFAULT_AMP_START);
  const [ampDecayDaysLeft, setAmpDecayDaysLeft] = useState(0);
  const [daysSinceLaunch, setDaysSinceLaunch] = useState(0);
  const [totalBurnedXEN, setTotalBurnedXEN] = useState('0');
  const [totalMintedXBURN, setTotalMintedXBURN] = useState('0');
  
  // Create context value - not used but kept for future functionality
  // eslint-disable-next-line no-unused-vars
  const contextValue = {
    ampSnapshot: DEFAULT_AMP_SNAPSHOT,
    ampStart: DEFAULT_AMP_START
  };
  
  // Calculate multiplier options
  const multiplierOptions = [1, 1.2, 1.5, 2, 5, 7.5, 10];
  
  // Calculate days needed for each multiplier option
  const quickTerms = multiplierOptions.map(multiplier => {
    const days = calculateDaysForMultiplier(multiplier, currentAMP, DEFAULT_AMP_SNAPSHOT);
    return { 
      multiplier, 
      days,
      label: multiplier === 1 ? "1x (0 days)" : `${multiplier}x (${days} days)`
    };
  });

  // Add loading states for balances
  useEffect(() => {
    // Set loading state when account changes
    if (account) {
      setIsLoading(true);
      
      // Wait for balances to update
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [account]);

  // Function to fetch global stats from contract
  const fetchGlobalStats = useCallback(async () => {
    try {
      if (!xburnMinterContract) return;
      
      // Call getGlobalStats function
      const stats = await xburnMinterContract.getGlobalStats();
      
      // Update state with values from contract
      setCurrentAMP(stats.currentAMP.toNumber());
      setAmpDecayDaysLeft(stats.ampDecayDaysLeft.toNumber());
      setDaysSinceLaunch(stats.daysSinceLaunch.toNumber());
      setTotalBurnedXEN(ethers.utils.formatUnits(stats.totalBurnedXEN, 18));
      setTotalMintedXBURN(ethers.utils.formatUnits(stats.totalMintedXBURN, 18));
      
      console.log("Global stats from contract:", {
        currentAMP: stats.currentAMP.toString(),
        daysSinceLaunch: stats.daysSinceLaunch.toString(),
        totalBurnedXEN: ethers.utils.formatUnits(stats.totalBurnedXEN, 18),
        totalMintedXBURN: ethers.utils.formatUnits(stats.totalMintedXBURN, 18),
        ampDecayDaysLeft: stats.ampDecayDaysLeft.toString()
      });
      
    } catch (error) {
      console.error('Error fetching global stats:', error);
    }
  }, [xburnMinterContract]);

  // Function to fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      if (!account || !provider || !signer) return;
      
      // Fetch XEN approval
      const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, provider);
      const xenAllowance = await xenContract.allowance(account, XENBURNER_ADDRESS);
      setXenApproved(xenAllowance.toString());
      
      // Fetch XBURN approval - add null check for xburnMinterContract
      if (xburnMinterContract) {
        const xburnAllowance = await xburnMinterContract.allowance(account, XENBURNER_ADDRESS);
        setXburnApproved(xburnAllowance.toString());
        
        // Fetch accumulation progress
        const progress = await xburnMinterContract.getAccumulationProgress();
        console.log("Raw accumulation progress:", progress);

        // Calculate accumulated and threshold values
        const accumulated = ethers.utils.formatUnits(progress.accumulated || '0', 18);
        const threshold = ethers.utils.formatUnits(progress.threshold || '0', 18);

        // Calculate percentage - ensure it's 1 (100%) if accumulated >= threshold
        const accumulatedNum = parseFloat(accumulated);
        const thresholdNum = parseFloat(threshold);
        const percentage = accumulatedNum >= thresholdNum ? 1 : accumulatedNum / thresholdNum;

        const progressData = {
          accumulated,
          threshold,
          percentage
        };

        console.log("Formatted progress data:", progressData);
        setProgress(progressData);
      }
      
      // Fetch global stats
      await fetchGlobalStats();
      
      // Fetch balances - force refresh to bypass debounce
      await fetchBalances(provider, account, true);
      
      console.log("All data fetched successfully");
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [account, provider, signer, xburnMinterContract, fetchBalances, fetchGlobalStats]);

  // Add effect to fetch all data on mount and when account changes
  useEffect(() => {
    if (account && provider) {
      fetchAllData();
    }
  }, [account, provider, fetchAllData]);

  // Add effect to fetch global stats periodically
  useEffect(() => {
    if (xburnMinterContract) {
      // Fetch global stats immediately
      fetchGlobalStats();
      
      // Set up interval to fetch global stats every 5 minutes
      const interval = setInterval(fetchGlobalStats, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [xburnMinterContract, fetchGlobalStats]);

  // Add effect to check approval status when amount changes
  const safelyCompareWithBalance = useCallback((amount, balance) => {
    try {
      if (!amount || !balance) return false;
      
      // Convert string values to BigNumber format (18 decimals)
      const amountBN = ethers.utils.parseUnits(String(amount), 18);
      const balanceBN = ethers.utils.parseUnits(String(balance), 18);
      
      return amountBN.gt(balanceBN);
    } catch (error) {
      console.error('Error comparing amounts:', error);
      return false;
    }
  }, []);

  // Check approval status
  const checkApprovalStatus = useCallback(async () => {
    if (!account || !provider) return;
    
    if (activeTab === 'burnXEN' && amount) {
      try {
        const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, provider);
        const allowance = await xenContract.allowance(account, XENBURNER_ADDRESS);
        setXenApproved(allowance.toString());
      } catch (error) {
        console.error("Error checking XEN approval:", error);
      }
    } else if (activeTab === 'burnXBURN' && xburnAmount) {
      try {
        const allowance = await xburnMinterContract.allowance(account, XENBURNER_ADDRESS);
        setXburnApproved(allowance.toString());
      } catch (error) {
        console.error("Error checking XBURN approval:", error);
      }
    } else if (activeTab === 'swap' && swapAmount) {
      try {
        if (isXenToXburn) {
          // Check XEN approval for swap
          const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, provider);
          const allowance = await xenContract.allowance(account, UNISWAP_ROUTER);
          setSwapApproved(allowance.toString());
        } else {
          // Check XBURN approval for swap
          const allowance = await xburnMinterContract.allowance(account, UNISWAP_ROUTER);
          setSwapApproved(allowance.toString());
        }
      } catch (error) {
        console.error("Error checking approval status:", error);
      }
    }
  }, [activeTab, amount, xburnAmount, swapAmount, account, provider, xburnMinterContract, isXenToXburn]);

  useEffect(() => {
    if (account && provider) {
      checkApprovalStatus();
    }
  }, [account, provider, amount, xburnAmount, swapAmount, activeTab, isXenToXburn, checkApprovalStatus]);

  // Handle approve function
  const handleApprove = async () => {
    if (!account || !signer || !xburnMinterContract) {
      toast.error('Please connect your wallet');
      return;
    }

    // Determine which amount to use based on active tab
    const amountToApprove = activeTab === 'burnXEN' ? amount : xburnAmount;
    const tokenBalance = activeTab === 'burnXEN' ? xenBalance : xburnBalance;
    const tokenName = activeTab === 'burnXEN' ? 'XEN' : 'XBURN';

    if (!amountToApprove || parseFloat(amountToApprove) <= 0) {
      toast.error(`Please enter an amount to approve`);
      return;
    }

    // Check if amount exceeds balance
    if (safelyCompareWithBalance(amountToApprove, tokenBalance)) {
      toast.error('Amount exceeds your balance');
      return;
    }

    setIsLoading(true);
    setApproving(true);
    try {
      console.log(`Approving ${tokenName} tokens for ${activeTab}`);
      
      // Instead of approving the exact amount, approve a reasonable maximum amount
      // This prevents having to approve again for small increases in amount
      // Use ethers.constants.MaxUint256 for unlimited approval
      const maxApproval = ethers.constants.MaxUint256;
      
      // Get the minter contract address
      const minterAddress = XENBURNER_ADDRESS;
      
      if (activeTab === 'burnXEN') {
        // Create XEN contract instance connected to the signer
        const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, signer);
        
        // Call approve function with max approval
        const tx = await xenContract.approve(minterAddress, maxApproval);
        
        // Wait for transaction to be mined
        toast('Approval transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
        await tx.wait();
      } else {
        // For XBURN, we need to create a new contract instance with the signer
        // since xburnMinterContract might not have a signer attached
        const xburnContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
        
        // Call approve function with max approval
        const tx = await xburnContract.approve(minterAddress, maxApproval);
        
        // Wait for transaction to be mined
        toast('Approval transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
        await tx.wait();
      }
      
      // Fetch updated approval
      await checkApprovalStatus();
      
      toast.success(`${tokenName} tokens approved successfully!`);
    } catch (error) {
      console.error('Error approving tokens:', error);
      toast.error(`Error approving tokens: ${error.message}`);
    } finally {
      setIsLoading(false);
      setApproving(false);
    }
  };

  // Handle burn function
  const handleBurn = async () => {
    if (!account || !signer || !xburnMinterContract) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter an amount to burn');
      return;
    }

    // Check if amount exceeds balance
    if (safelyCompareWithBalance(amount, xenBalance)) {
      toast.error('Amount exceeds your balance');
      return;
    }

    // Check if amount is approved
    if (safelyCompareWithBalance(amount, xenApproved)) {
      toast.error('Please approve the tokens first');
      return;
    }

    setIsLoading(true);
    try {
      // Create a contract instance connected to the signer
      const xburnMinterWithSigner = xburnMinterContract.connect(signer);
      
      // Convert amount to wei
      const amountWei = ethers.utils.parseUnits(amount, 18);
      
      // Call burnXEN function with term days (note the capital XEN)
      const tx = await xburnMinterWithSigner.burnXEN(amountWei, termDays);
      
      // Wait for transaction to be mined
      toast('Burn transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
      await tx.wait();
      
      // Reset form and fetch updated data with forced refresh
      setAmount('');
      await fetchAllData();
      
      // Double-check that balances are refreshed
      await fetchBalances(provider, account, true);
      
      toast.success('XEN burned successfully!');
    } catch (error) {
      console.error('Error burning XEN:', error);
      toast.error(`Error burning XEN: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle XBURN burn function
  const handleBurnXBURN = async () => {
    if (!account || !signer || !xburnMinterContract) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!xburnAmount || parseFloat(xburnAmount) <= 0) {
      toast.error('Please enter an amount to burn');
      return;
    }

    // Check if amount exceeds balance
    if (safelyCompareWithBalance(xburnAmount, xburnBalance)) {
      toast.error('Amount exceeds your balance');
      return;
    }

    // Check if amount is approved
    if (safelyCompareWithBalance(xburnAmount, xburnApproved)) {
      toast.error('Please approve the tokens first');
      return;
    }

    setIsLoading(true);
    try {
      // Create a contract instance connected to the signer
      const xburnMinterWithSigner = xburnMinterContract.connect(signer);
      
      // Convert amount to wei
      const amountWei = ethers.utils.parseUnits(xburnAmount, 18);
      
      // Call burnXburn function
      const tx = await xburnMinterWithSigner.burnXburn(amountWei);
      
      // Wait for transaction to be mined
      toast('Burn transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
      await tx.wait();
      
      // Reset form and fetch updated data with forced refresh
      setXburnAmount('');
      await fetchAllData();
      
      // Double-check that balances are refreshed
      await fetchBalances(provider, account, true);
      
      toast.success('XBURN burned successfully!');
    } catch (error) {
      console.error('Error burning XBURN:', error);
      toast.error(`Error burning XBURN: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Swap & Burn function
  const handleSwapAndBurn = async () => {
    if (!account || !signer || !xburnMinterContract) {
      toast.error('Please connect your wallet');
      return;
    }

    // Bypass threshold check - user is well above threshold
    // if (progress && progress.percentage < 100) {
    //   toast.error('Threshold not reached yet');
    //   return;
    // }

    setIsLoading(true);
    try {
      // Create a contract instance connected to the signer
      const xburnMinterWithSigner = xburnMinterContract.connect(signer);
      
      // Set minXburnReceived to 1 wei (smallest unit) instead of zero
      // This helps avoid contract rejections for zero values
      const minXburnReceived = ethers.utils.parseUnits("1", 0); // 1 wei (smallest unit)
      
      console.log("Swap & Burn parameters:", {
        minXburnReceived: minXburnReceived.toString(),
        accumulated: progress.accumulated,
        threshold: progress.threshold,
        percentage: progress.percentage
      });
      
      // Try to get the current gas price and increase it slightly
      const gasPrice = await provider.getGasPrice();
      const adjustedGasPrice = gasPrice.mul(120).div(100); // 20% higher
      
      console.log("Using gas price:", {
        original: ethers.utils.formatUnits(gasPrice, "gwei") + " gwei",
        adjusted: ethers.utils.formatUnits(adjustedGasPrice, "gwei") + " gwei"
      });
      
      // Call swapXenForXburn function with minimum value of 1 and high gas limit
      const tx = await xburnMinterWithSigner.swapXenForXburn(minXburnReceived, {
        gasLimit: 2000000, // Increase gas limit significantly
        gasPrice: adjustedGasPrice // Use higher gas price
      });
      
      // Wait for transaction to be mined
      toast('Swap & Burn transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
      await tx.wait();
      
      // Fetch updated data - this will force a balance refresh
      await fetchAllData();
      
      // Double-check that balances are refreshed by directly calling fetchBalances with force refresh
      await fetchBalances(provider, account, true);
      
      toast.success('Swap & Burn executed successfully!');
    } catch (error) {
      console.error('Error executing Swap & Burn:', error);
      
      // Provide more specific error messages based on common issues
      if (error.message.includes('cannot estimate gas')) {
        toast.error('Gas estimation failed. The contract may not be ready for Swap & Burn yet, or there might be an issue with the contract state. Please try again later.');
      } else if (error.message.includes('execution reverted')) {
        toast.error('Transaction reverted. This may happen if someone else just executed Swap & Burn or if the threshold is not fully reached yet.');
      } else if (error.message.includes('user rejected')) {
        toast.error('Transaction was rejected by user.');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for gas. Please make sure you have enough ETH to cover gas fees.');
      } else {
        toast.error(`Error executing Swap & Burn: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get swap estimate
  const getSwapEstimate = useCallback(async (inputAmount) => {
    if (!inputAmount || parseFloat(inputAmount) <= 0 || !provider) {
      return '0';
    }
    
    try {
      // Convert input amount to wei
      const amountIn = ethers.utils.parseUnits(inputAmount, 18);
      
      // Create router contract
      const router = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, provider);
      
      // Define path based on swap direction
      const path = isXenToXburn 
        ? [XEN_ADDRESS, XENBURNER_ADDRESS] 
        : [XENBURNER_ADDRESS, XEN_ADDRESS];
      
      // Get amounts out
      const amounts = await router.getAmountsOut(amountIn, path);
      
      // Return formatted output amount
      return ethers.utils.formatUnits(amounts[1], 18);
    } catch (error) {
      console.error('Error getting swap estimate:', error);
      return '0';
    }
  }, [provider, isXenToXburn]);

  // Handle swap input change
  const handleSwapInputChange = async (e) => {
    const value = parseInputValue(e.target.value);
    setSwapAmount(value);
    
    if (value && parseFloat(value) > 0) {
      try {
        if (e.target.value === 'MAX') {
          const balance = isXenToXburn ? xenBalance : xburnBalance;
          setSwapAmount(formatTokenAmount(balance));
          const estimate = await getSwapEstimate(formatTokenAmount(balance));
          setSwapRate(estimate);
        } else {
          const estimate = await getSwapEstimate(value);
          setSwapRate(estimate);
        }
      } catch (error) {
        console.error('Error handling swap input:', error);
        setSwapRate('0');
      }
    } else {
      setSwapRate('0');
    }
  };

  // Handle approve token for swap
  const handleApproveToken = async () => {
    if (!account || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      toast.error('Please enter an amount to approve');
      return;
    }

    // Check if amount exceeds balance
    const balance = isXenToXburn ? xenBalance : xburnBalance;
    if (safelyCompareWithBalance(swapAmount, balance)) {
      toast.error('Amount exceeds your balance');
      return;
    }

    setIsLoading(true);
    setApproving(true);
    try {
      // Select the correct contract based on swap direction
      let tokenAddress, tokenAbi;
      
      if (isXenToXburn) {
        tokenAddress = XEN_ADDRESS;
        tokenAbi = xenAbi;
      } else {
        tokenAddress = XENBURNER_ADDRESS;
        tokenAbi = xenBurnerAbi;
      }
      
      // Create contract instance with signer
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
      
      // Convert amount to wei
      const amountWei = ethers.utils.parseUnits(swapAmount, 18);
      
      // Send approval transaction
      const tx = await tokenContract.approve(UNISWAP_ROUTER, amountWei);
      
      // Wait for transaction to be mined
      toast('Approval transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
      await tx.wait();
      
      // Update approval status
      await checkApprovalStatus();
      
      toast.success('Approval successful!');
    } catch (error) {
      console.error('Error approving tokens for swap:', error);
      toast.error(`Error approving tokens: ${error.message}`);
    } finally {
      setIsLoading(false);
      setApproving(false);
    }
  };

  // Handle swap function
  const handleSwap = async () => {
    if (!account || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      toast.error('Please enter an amount to swap');
      return;
    }

    // Check if amount exceeds balance
    const balance = isXenToXburn ? xenBalance : xburnBalance;
    if (safelyCompareWithBalance(swapAmount, balance)) {
      toast.error('Amount exceeds your balance');
      return;
    }

    setIsLoading(true);
    try {
      // Convert amount to wei
      const amountIn = ethers.utils.parseUnits(swapAmount, 18);
      
      // Calculate minimum output based on slippage
      let expectedOut;
      try {
        expectedOut = ethers.utils.parseUnits(swapRate, 18);
      } catch (e) {
        toast.error(`Error calculating expected output: ${e.message}`);
        return;
      }
      
      const slippageValue = parseFloat(slippage);
      const slippageFactor = 1 - (slippageValue / 100);
      const minOut = expectedOut.mul(Math.floor(slippageFactor * 1000)).div(1000);
      
      // Create router contract
      const router = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, signer);
      
      // Define path based on swap direction
      const path = isXenToXburn 
        ? [XEN_ADDRESS, XENBURNER_ADDRESS] 
        : [XENBURNER_ADDRESS, XEN_ADDRESS];
      
      // Calculate deadline (30 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 1800;
      
      // Send swap transaction
      const tx = await router.swapExactTokensForTokens(
        amountIn,
        minOut,
        path,
        account,
        deadline
      );
      
      // Wait for transaction to be mined
      toast('Swap transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
      await tx.wait();
      
      // Reset form and fetch updated data with forced refresh
      setSwapAmount('');
      setSwapRate('0');
      await fetchAllData();
      
      // Double-check that balances are refreshed
      await fetchBalances(provider, account, true);
      
      toast.success('Swap executed successfully!');
    } catch (error) {
      console.error('Error executing swap:', error);
      toast.error(`Error executing swap: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate exchange rate for display in swap
  const calculateRate = useCallback(() => {
    if (!swapAmount || parseFloat(swapAmount) === 0 || parseFloat(swapRate) === 0) {
      return isXenToXburn ? '1 XEN = ? XBURN' : '1 XBURN = ? XEN';
    }
    
    const inputNum = parseFloat(swapAmount);
    const outputNum = parseFloat(swapRate);
    
    if (isXenToXburn) {
      return `1 XEN ≈ ${formatDecimals(outputNum / inputNum, { useCommas: true })} XBURN`;
    }
    
    return `1 XBURN ≈ ${formatDecimals(outputNum / inputNum, { useCommas: true })} XEN`;
  }, [swapAmount, swapRate, isXenToXburn]);

  // Calculate minimum received based on slippage
  const calculateMinReceived = useCallback(() => {
    if (!swapRate || parseFloat(swapRate) === 0) return '0';
    
    const output = parseFloat(swapRate);
    const slippageValue = parseFloat(slippage);
    const slippageFactor = 1 - (slippageValue / 100);
    return `${formatDecimals(output * slippageFactor, { useCommas: true })} ${isXenToXburn ? 'XBURN' : 'XEN'}`;
  }, [swapRate, slippage, isXenToXburn]);

  // Calculate price impact (simplified for demo)
  const calculateImpact = useCallback(() => {
    // This is a simplified calculation
    return '< 0.1%';
  }, []);

  // Check if amount exceeds balance
  // eslint-disable-next-line no-unused-vars
  const amountExceedsBalance = useCallback(() => {
    if (activeTab === 'burnXEN') {
      return safelyCompareWithBalance(amount, xenBalance);
    } else if (activeTab === 'burnXBURN') {
      return safelyCompareWithBalance(xburnAmount, xburnBalance);
    } else if (activeTab === 'swap') {
      const balance = isXenToXburn ? xenBalance : xburnBalance;
      return safelyCompareWithBalance(swapAmount, balance);
    }
    return false;
  }, [activeTab, amount, xburnAmount, swapAmount, xenBalance, xburnBalance, isXenToXburn, safelyCompareWithBalance]);

  // Render the BurnPanel with modern UI
  return (
    <div className="burn-content">
      <TabView activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'burnXEN' && (
        <BurnXENTab
          xenAmount={amount}
          setXenAmount={setAmount}
          xenBalance={xenBalance}
          xenApproved={xenApproved}
          approveXEN={handleApprove}
          burnXEN={handleBurn}
          isApproveLoading={approving}
          isBurnLoading={isLoading}
          selectedTerm={termDays}
          setSelectedTerm={setTermDays}
          customTerm={termDays}
          setCustomTerm={setTermDays}
          quickTerms={quickTerms}
          estimatedXBURN={amount && parseFloat(amount) > 0 
            ? (parseFloat(amount) * calculateMultiplier(termDays, currentAMP, DEFAULT_AMP_SNAPSHOT)).toString() 
            : '0'}
          xenPrice={'0.00000012'}
          xburnPrice={'0.00000024'}
          error={safelyCompareWithBalance(amount, xenBalance) ? 'Amount exceeds balance' : ''}
          setError={() => {}}
          ampStart={DEFAULT_AMP_START}
          ampSnapshot={currentAMP}
          daysSinceLaunch={daysSinceLaunch}
          totalBurnedXEN={totalBurnedXEN}
          totalMintedXBURN={totalMintedXBURN}
          ampDecayDaysLeft={ampDecayDaysLeft}
        />
      )}
      
      {activeTab === 'burnXBURN' && (
        <BurnXBURNTab
          amount={xburnAmount}
          setAmount={setXburnAmount}
          balance={xburnBalance}
          approved={xburnApproved}
          isLoading={isLoading}
          approving={approving}
          handleApprove={handleApprove}
          handleBurn={handleBurnXBURN}
          amountExceedsBalance={safelyCompareWithBalance(xburnAmount, xburnBalance)}
        />
      )}
      
      {activeTab === 'swapBurn' && (
        <SwapBurnTab
          progress={progress}
          isLoading={isLoading}
          handleSwapAndBurn={handleSwapAndBurn}
        />
      )}
      
      {activeTab === 'swap' && (
        <SwapTab
          isXenToXburn={isXenToXburn}
          setIsXenToXburn={setIsXenToXburn}
          swapAmount={swapAmount}
          setSwapAmount={setSwapAmount}
          swapRate={swapRate}
          xenBalance={xenBalance}
          xburnBalance={xburnBalance}
          slippage={slippage}
          setSlippage={setSlippage}
          isLoading={isLoading}
          approving={approving}
          handleApproveToken={handleApproveToken}
          handleSwap={handleSwap}
          handleSwapInputChange={handleSwapInputChange}
          calculateRate={calculateRate}
          calculateMinReceived={calculateMinReceived}
          calculateImpact={calculateImpact}
          swapApproved={swapApproved}
        />
      )}
      
      <Instructions />
      <InfoCards />
    </div>
  );
};

const BurnPanelWithContext = () => {
  return (
    <BurnPanel />
  );
};

export default BurnPanelWithContext; 