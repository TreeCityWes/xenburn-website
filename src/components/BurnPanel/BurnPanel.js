import React, { useState, useEffect, useCallback, useContext } from 'react';
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
  DEFAULT_AMP_SNAPSHOT
} from '../../utils/constants';

// Import contract addresses and ABIs
import {
  // Removed unused: XEN_ADDRESS, UNISWAP_ROUTER_ADDRESS 
  XENBURNER_ADDRESS
} from '../../constants/addresses';
// Removed unused: xenAbi, 
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
// const UNISWAP_ROUTER = UNISWAP_ROUTER_ADDRESS; // Keep if needed by Swap&Burn

/**
 * BurnPanel - Main component container for different burn/swap tabs
 */
const BurnPanel = () => {
  const { 
    account, 
    provider, 
    signer, 
    xenBalance, 
    xburnBalance, 
    fetchBalances, 
    xburnMinterContract, 
    xburnApprovalRaw 
  } = useWallet();
  
  // Removed unused: fetchAllData
  const { stats: globalStatsData } = useGlobalData(); 

  const { activeTab, setActiveTab } = useContext(BurnPanelContext);
  
  // Removed xburnApproved state - use xburnApprovalRaw from WalletContext
  // const [xburnApproved, setXburnApproved] = useState('0'); 
  const [isLoading, setIsLoading] = useState(false); 
  const [progress, setProgress] = useState({ percentage: 0, accumulated: '0', threshold: '0' });
  const [approving, setApproving] = useState(false);
  const [xburnAmount, setXburnAmount] = useState(''); // Keep BurnXBURNTab state
  
  // Removed local state for global stats - use globalStatsData from context
  // const [currentAMP, setCurrentAMP] = useState(DEFAULT_AMP_START);
  // const [daysSinceLaunch, setDaysSinceLaunch] = useState(0);
  // const [totalBurnedXEN, setTotalBurnedXEN] = useState('0'); 
  // const [totalMintedXBURN, setTotalMintedXBURN] = useState('0'); 
  
  /* REMOVED redundant fetchGlobalStats function 
  const fetchGlobalStats = useCallback(async () => {
    // ... 
  }, [xburnMinterContract]);
  */

  // Simplified fetchPanelData - fetch ONLY Swap&Burn progress
  const fetchSwapBurnProgress = useCallback(async () => { 
    try {
      // Check if contract is ready
      if (!account || !xburnMinterContract) {
          console.log("Fetch Swap Burn Progress: Skipped, dependencies not ready.");
          return; 
      }
      console.log("Fetching Swap Burn Progress...");
      
      // Fetch accumulation progress for SwapBurnTab
      const progressRaw = await xburnMinterContract.getAccumulationProgress();
      const accumulated = ethers.utils.formatUnits(progressRaw.accumulated || '0', 18);
      const threshold = ethers.utils.formatUnits(progressRaw.threshold || '0', 18);
      const accumulatedNum = parseFloat(accumulated);
      const thresholdNum = parseFloat(threshold);
      const percentage = thresholdNum > 0 
          ? Math.min(1, accumulatedNum / thresholdNum) * 100
          : 0;
      const progressData = { accumulated, threshold, percentage };
      setProgress(progressData);
            
      console.log("Swap Burn Progress fetched.");
    } catch (error) {
      console.error('Error fetching Swap Burn Progress:', error);
    }
    // Dependencies: account (to ensure user context) and the contract instance
  }, [account, xburnMinterContract]); 

  // Effect to fetch swap/burn progress when account or contract changes
  useEffect(() => {
    if (account && xburnMinterContract) {
      fetchSwapBurnProgress();
    }
  }, [account, xburnMinterContract, fetchSwapBurnProgress]);

  /* REMOVED effect that called fetchPanelData (now fetchSwapBurnProgress) */

  /* REMOVED periodic global stats fetch */

  /* REMOVED redundant approval check */

  // Format XBURN approval from context
  const formattedXburnApproval = xburnApprovalRaw 
     ? ethers.utils.formatUnits(xburnApprovalRaw, 18)
     : '0';

  // Handle approve function - Simplified for XBURN only
  const handleApprove = async () => {
    if (!account || !signer || !xburnMinterContract) { // Check against the memoized contract
      toast.error('Please connect your wallet');
      return;
    }
    const amountToApprove = xburnAmount; 
    const tokenBalance = xburnBalance; // Use balance from context
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
      const minterAddress = XENBURNER_ADDRESS;
      
      // Use the memoized contract instance from context
      const tx = await xburnMinterContract.connect(signer).approve(minterAddress, maxApproval);
        
      toast('Approval transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
      await tx.wait();
      
      // Refresh balances/allowances via WalletContext
      if (fetchBalances) await fetchBalances(provider, account, true); 
      
      toast.success(`${tokenName} tokens approved successfully!`);
    } catch (error) {
      console.error('Error approving tokens:', error);
      toast.error(`Error approving tokens: ${error.message || error.reason}`);
    } finally {
      setIsLoading(false);
      setApproving(false);
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
    if (safelyCompareWithBalance(xburnAmount, xburnBalance)) { // Use context balance
      toast.error('Amount exceeds your balance');
      return;
    }
    // Use formatted approval from context
    if (safelyCompareWithBalance(xburnAmount, formattedXburnApproval)) { 
      toast.error('Please approve the tokens first');
      return;
    }

    setIsLoading(true);
    try {
      const xburnMinterWithSigner = xburnMinterContract.connect(signer);
      const amountWei = ethers.utils.parseUnits(xburnAmount, 18);
      const tx = await xburnMinterWithSigner.burnXburn(amountWei);
      
      toast('Burn transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
      await tx.wait();
      
      setXburnAmount('');
      // Refresh balances/allowances via WalletContext
      if (fetchBalances) await fetchBalances(provider, account, true); 
      
      toast.success('XBURN burned successfully!');
    } catch (error) {
      console.error('Error burning XBURN:', error);
      toast.error(`Error burning XBURN: ${error.message || error.reason}`);
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
    if (!progress || progress.percentage < 100) {
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
      console.log("Using gas price:", {
        original: ethers.utils.formatUnits(gasPrice, "gwei") + " gwei",
        adjusted: ethers.utils.formatUnits(adjustedGasPrice, "gwei") + " gwei"
      });
      
      const tx = await xburnMinterWithSigner.swapXenForXburn(minXburnReceived, {
        gasLimit: 2000000, 
        gasPrice: adjustedGasPrice 
      });
      
      toast('Swap & Burn transaction submitted. Please wait for confirmation...', { icon: 'ℹ️' });
      await tx.wait();
      
      // Refresh balances/allowances via WalletContext
      if (fetchBalances) await fetchBalances(provider, account, true); 
      // Also refetch swap progress
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
  };

  // Render the BurnPanel with modern UI
  return (
    <div className="burn-content">
      <TabView activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'burnXEN' && (
        <BurnXENTab
          xenBalance={xenBalance} // From WalletContext
          ampStart={DEFAULT_AMP_START} 
          ampSnapshot={parseFloat(globalStatsData?.data?.currentAMP || DEFAULT_AMP_SNAPSHOT.toString())} // Use the imported constant
          daysSinceLaunch={parseInt(globalStatsData?.data?.daysSinceLaunch || '0')}
          totalBurnedXEN={globalStatsData?.data?.totalXenBurned || '0'}
          totalMintedXBURN={globalStatsData?.data?.totalXburnMinted || '0'}
        />
      )}
      
      {activeTab === 'burnXBURN' && (
        <BurnXBURNTab
          amount={xburnAmount} 
          setAmount={setXburnAmount} 
          balance={xburnBalance} // From WalletContext
          approved={formattedXburnApproval} // Use formatted approval from context
          isLoading={isLoading && activeTab === 'burnXBURN'} 
          approving={approving && activeTab === 'burnXBURN'} 
          handleApprove={handleApprove} 
          handleBurn={handleBurnXBURN} 
          amountExceedsBalance={safelyCompareWithBalance(xburnAmount, xburnBalance)} 
        />
      )}
      
      {activeTab === 'swapBurn' && (
        <SwapBurnTab
          progress={progress} // Fetched locally in this component now
          isLoading={isLoading && activeTab === 'swapBurn'} 
          handleSwapAndBurn={handleSwapAndBurn} 
        />
      )}
      
      {/* REMOVED: SwapTab rendering logic */}
      {/* {activeTab === 'swap' && <SwapTab ... />} */}
      
      <Instructions />
      <InfoCards />
    </div>
  );
};

export default BurnPanel; 