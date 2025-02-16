import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import toast from 'react-hot-toast';
import './BurnPanel.css';
import { StatsPanel } from './StatsPanel';
import { InfoCards } from './InfoCards';
import FireParticles from './FireParticles';

// Import ABIs
import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/xen_burner.json';

const XEN_ADDRESS = '0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB';
const XENBURNER_ADDRESS = '0xd60483890f9aae31bc19cef2523072151f23c54c';

// Add utility functions at the top
const formatDecimals = (value) => {
  if (!value) return '0';
  
  let num = parseFloat(value);
  if (isNaN(num)) return '0';

  // Handle scientific notation
  if (num.toString().includes('e')) {
    num = Number(num.toFixed(20));
  }
  
  // Cap at 999T+
  if (num > 999e12) return '999T+';
  
  // Handle large numbers with proper suffixes
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  
  // For smaller numbers, show up to 6 decimals max
  if (num < 0.000001) return '<0.000001';
  if (num < 0.001) return num.toFixed(6);
  if (num < 1) return num.toFixed(4);
  return num.toFixed(2);
};

// Helper function to format raw BigNumber values
const formatTokenAmount = (rawAmount, decimals = 18) => {
  if (!rawAmount) return '0';
  try {
    const formatted = ethers.utils.formatUnits(rawAmount, decimals);
    return formatDecimals(formatted);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
};

const parseInputValue = (value) => {
  // Allow scientific notation and large numbers
  if (value.toLowerCase().includes('e')) {
    try {
      const num = parseFloat(value);
      if (isNaN(num)) return '';
      return num.toLocaleString('fullwide', { useGrouping: false });
    } catch {
      return '';
    }
  }

  // Remove all non-numeric characters except decimal point
  const cleaned = value.replace(/[^0-9.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) return parts[0] + '.' + parts[1];
  
  return cleaned;
};

// Add Uniswap constants
const UNISWAP_ROUTER = '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3'; // Sepolia Router
const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
];

// Add Pair ABI
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];

// Update the pair address
const PAIR_ADDRESS = '0x94cE0B0c518D6c269b5f896bB241B32696c01a9a';

export const BurnPanel = () => {
  const { account, signer } = useWallet();
  const [activeTab, setActiveTab] = useState('burnXen');
  const [amount, setAmount] = useState('');
  const [xenBalance, setXenBalance] = useState('0');
  const [xburnBalance, setXburnBalance] = useState('0');
  const [xenApproved, setXenApproved] = useState('0');
  const [xburnApproved, setXburnApproved] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [accumulationProgress, setAccumulationProgress] = useState({
    accumulated: '0',
    threshold: '0',
    percentage: '0'
  });
  const [swapAmount, setSwapAmount] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('0');
  const [slippage, setSlippage] = useState(0.5); // 0.5% default slippage
  const [isXenToXburn, setIsXenToXburn] = useState(false);

  const fetchBalances = useCallback(async () => {
    try {
      const xenContract = new ethers.Contract(XEN_ADDRESS, xenAbi, signer);
      const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);

      // Get XEN balances with proper decimal handling
      const xenBal = await xenContract.balanceOf(account);
      const xenAllowance = await xenContract.allowance(account, XENBURNER_ADDRESS);
      
      // Get XBURN balances
      const xburnBal = await burnerContract.balanceOf(account);
      const xburnAllowance = await burnerContract.allowance(account, XENBURNER_ADDRESS);

      console.log('Fetched balances:', {
        xen: ethers.utils.formatUnits(xenBal, 18),
        xburn: ethers.utils.formatUnits(xburnBal, 18)
      });
      
      // Store raw values for accurate comparisons
      setXenBalance(xenBal.toString());
      setXburnBalance(xburnBal.toString());
      setXenApproved(xenAllowance.toString());
      setXburnApproved(xburnAllowance.toString());
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Failed to fetch balances');
    }
  }, [account, signer]);

  const fetchAccumulationProgress = useCallback(async () => {
    try {
      const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
      const progress = await burnerContract.getAccumulationProgress();
      
      // Convert BigNumber values to strings first
      const accumulated = ethers.utils.formatUnits(progress.accumulated, 18);
      const threshold = ethers.utils.formatUnits(progress.threshold, 18);
      
      // Calculate percentage directly from the formatted values
      const calculatedPercentage = (parseFloat(accumulated) / parseFloat(threshold)) * 100;

      setAccumulationProgress({
        accumulated: accumulated,
        threshold: threshold,
        percentage: calculatedPercentage.toString()
      });
    } catch (error) {
      console.error('Error fetching accumulation progress:', error);
    }
  }, [signer]);

  const getSwapEstimate = useCallback(async (inputAmount) => {
    if (!inputAmount || !signer || parseFloat(inputAmount) === 0) return '0';
    
    try {
      const pairContract = new ethers.Contract(PAIR_ADDRESS, PAIR_ABI, signer);
      
      // Get reserves and token order
      const [reserve0, reserve1] = await pairContract.getReserves();
      const token0 = await pairContract.token0();
      
      // Determine which reserve is which token
      const isXenToken0 = token0.toLowerCase() === XEN_ADDRESS.toLowerCase();
      const xenReserve = isXenToken0 ? reserve0 : reserve1;
      const xburnReserve = isXenToken0 ? reserve1 : reserve0;

      // For XEN -> XBURN: use xenReserve as input, xburnReserve as output
      // For XBURN -> XEN: use xburnReserve as input, xenReserve as output
      const [inputReserve, outputReserve] = isXenToXburn 
        ? [xenReserve, xburnReserve] 
        : [xburnReserve, xenReserve];

      // Calculate the swap amount
      const amountIn = ethers.utils.parseUnits(inputAmount, 18);
      const amountInWithFee = amountIn.mul(997); // 0.3% fee
      const numerator = amountInWithFee.mul(outputReserve);
      const denominator = inputReserve.mul(1000).add(amountInWithFee);
      const amountOut = numerator.div(denominator);

      return ethers.utils.formatUnits(amountOut, 18);
    } catch (error) {
      console.error('Error calculating swap estimate:', error);
      return '0';
    }
  }, [signer, isXenToXburn]);

  useEffect(() => {
    if (account && signer) {
      fetchBalances();
      fetchAccumulationProgress();
      const interval = setInterval(() => {
        fetchBalances();
        fetchAccumulationProgress();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [account, signer, fetchBalances, fetchAccumulationProgress]);

  useEffect(() => {
    if (swapAmount && parseFloat(swapAmount) > 0) {
      getSwapEstimate(swapAmount).then(setExpectedOutput);
    }
  }, [isXenToXburn, getSwapEstimate, swapAmount]);

  const handleApprove = async () => {
    if (!account || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      // Select the correct contract based on active tab
      const contract = activeTab === 'burnXen' 
        ? new ethers.Contract(XEN_ADDRESS, xenAbi, signer)
        : new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);

      // Convert amount to wei (with 18 decimals)
      const approveAmount = amount 
        ? ethers.utils.parseUnits(amount, 18)
        : ethers.constants.MaxUint256; // If no amount specified, use max

      // For XEN, we approve the burner contract
      // For XBURN, we approve the burner contract for burning XBURN
      const tx = await contract.approve(
        XENBURNER_ADDRESS,
        approveAmount
      );

      toast.success('Approval pending...');
      await tx.wait();
      toast.success('Approval successful!');
      await fetchBalances();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.reason || 'Approval failed');
    }
    setIsLoading(false);
  };

  const handleBurn = async () => {
    if (!account || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    if (Number(amount) <= 0) {
      toast.error('Please enter an amount to burn');
      return;
    }

    // Check if amount is greater than balance
    const currentBalance = getCurrentBalance();
    if (Number(amount) > Number(currentBalance)) {
      toast.error('Amount exceeds balance');
      return;
    }

    // Check if amount is greater than approved amount
    const currentApproved = getCurrentApproved();
    if (Number(amount) > Number(currentApproved)) {
      toast.error('Please approve tokens first');
      return;
    }

    setIsLoading(true);
    try {
      const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
      
      let tx;
      if (activeTab === 'burnXen') {
        tx = await burnerContract.burnXen(ethers.utils.parseUnits(amount, 18));
      } else if (activeTab === 'burnXBurn') {
        tx = await burnerContract.burnXburn(ethers.utils.parseUnits(amount, 18));
      } else {
        // Handle Swap & Burn
        tx = await burnerContract.swapXenForXburn(0); // Add minimum received calculation if needed
      }
      
      toast.success('Transaction pending...');
      await tx.wait();
      toast.success(`${getCurrentToken()} burned successfully!`);
      await fetchBalances();
      setAmount('');
    } catch (error) {
      console.error('Burn error:', error);
      toast.error(error.reason || 'Burn failed');
    }
    setIsLoading(false);
  };

  const handleSwapAndBurn = async () => {
    if (!account || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
      
      // Get accumulation progress and calculate percentage the same way
      const progress = await burnerContract.getAccumulationProgress();
      const accumulated = ethers.utils.formatUnits(progress.accumulated, 18);
      const threshold = ethers.utils.formatUnits(progress.threshold, 18);
      const calculatedPercentage = (parseFloat(accumulated) / parseFloat(threshold)) * 100;

      if (calculatedPercentage < 100) {
        toast.error('Accumulation threshold not reached yet');
        return;
      }

      const tx = await burnerContract.swapXenForXburn(0);
      toast.success('Swap & Burn pending...');
      await tx.wait();
      toast.success('Swap & Burn successful!');
      await fetchBalances();
    } catch (error) {
      console.error('Swap & Burn error:', error);
      toast.error(error.reason || 'Swap & Burn failed');
    }
    setIsLoading(false);
  };

  const handleMax = () => {
    const rawBalance = activeTab === 'burnXen' ? xenBalance : xburnBalance;
    setAmount(ethers.utils.formatUnits(rawBalance, 18));
  };

  const getCurrentBalance = () => activeTab === 'burnXen' ? xenBalance : xburnBalance;
  const getCurrentApproved = () => activeTab === 'burnXen' ? xenApproved : xburnApproved;
  const getCurrentToken = () => activeTab === 'burnXen' ? 'XEN' : 'XBURN';

  const handleInputChange = (e) => {
    const parsed = parseInputValue(e.target.value);
    setAmount(parsed);
  };

  const getCurrentBalanceFormatted = () => {
    const balance = getCurrentBalance();
    return formatTokenAmount(balance);
  };

  const getCurrentApprovedFormatted = () => {
    const approved = getCurrentApproved();
    return formatTokenAmount(approved);
  };

  const handleSwapInputChange = async (e) => {
    const value = parseInputValue(e.target.value);
    const balance = isXenToXburn ? xenBalance : xburnBalance;
    
    console.log('Swap input change:', {
      value,
      currentBalance: ethers.utils.formatUnits(balance, 18),
      rawBalance: balance
    });
    
    setSwapAmount(value);
    
    if (value && parseFloat(value) > 0) {
      try {
        // Validate input doesn't exceed balance
        const inputWei = ethers.utils.parseUnits(value, 18);
        const balanceWei = ethers.BigNumber.from(balance);
        
        if (inputWei.gt(balanceWei)) {
          // If input exceeds balance, set to max balance
          setSwapAmount(ethers.utils.formatUnits(balance, 18));
          const estimate = await getSwapEstimate(ethers.utils.formatUnits(balance, 18));
          setExpectedOutput(estimate);
        } else {
          const estimate = await getSwapEstimate(value);
          setExpectedOutput(estimate);
        }
      } catch (error) {
        console.error('Error handling swap input:', error);
        setExpectedOutput('0');
      }
    } else {
      setExpectedOutput('0');
    }
  };

  const handleSwap = async () => {
    if (!account || !signer || !swapAmount) {
      toast.error('Please enter an amount');
      return;
    }

    setIsLoading(true);
    try {
      const router = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, signer);
      const inputToken = isXenToXburn ? XEN_ADDRESS : XENBURNER_ADDRESS;
      const outputToken = isXenToXburn ? XENBURNER_ADDRESS : XEN_ADDRESS;
      const tokenContract = new ethers.Contract(
        inputToken,
        inputToken === XEN_ADDRESS ? xenAbi : xenBurnerAbi,
        signer
      );

      const amountIn = ethers.utils.parseUnits(swapAmount, 18);
      const expectedOut = ethers.utils.parseUnits(expectedOutput, 18);
      const minOut = expectedOut.mul(1000 - Math.floor(slippage * 10)).div(1000);

      const allowance = await tokenContract.allowance(account, UNISWAP_ROUTER);
      if (allowance.lt(amountIn)) {
        const approveTx = await tokenContract.approve(UNISWAP_ROUTER, ethers.constants.MaxUint256);
        await approveTx.wait();
        toast.success('Router approved');
      }

      const deadline = Math.floor(Date.now() / 1000) + 300;
      const tx = await router.swapExactTokensForTokens(
        amountIn,
        minOut,
        [inputToken, outputToken],
        account,
        deadline,
        { gasLimit: 500000 }
      );

      toast.success('Swap pending...');
      await tx.wait();
      toast.success('Swap successful!');
      
      setSwapAmount('');
      setExpectedOutput('0');
      await fetchBalances();
    } catch (error) {
      console.error('Swap error:', error);
      toast.error(error.reason || 'Swap failed');
    }
    setIsLoading(false);
  };

  const renderSwapAndBurnContent = () => {
    const accumulated = parseFloat(accumulationProgress.accumulated);
    const threshold = parseFloat(accumulationProgress.threshold);
    const calculatedPercentage = (accumulated / threshold) * 100;

    console.log('Debug values:', {
      accumulated,
      threshold,
      calculatedPercentage,
      rawProgress: accumulationProgress
    });

    const canSwap = calculatedPercentage >= 100;

    return (
      <>
        <div className="progress-container">
          <div className="progress-info">
            <span>Accumulation Progress</span>
            <span>{formatDecimals(calculatedPercentage)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(calculatedPercentage, 100)}%` }}
            />
          </div>
          <div className="progress-details">
            <span>{formatDecimals(accumulated)} XEN</span>
            <span>of</span>
            <span>{formatDecimals(threshold)} XEN</span>
          </div>
        </div>

        <button 
          className="action-button"
          onClick={handleSwapAndBurn}
          disabled={isLoading || !canSwap}
        >
          {isLoading 
            ? 'Processing...' 
            : canSwap 
            ? 'Swap & Burn' 
            : 'Accumulation in Progress'}
        </button>
      </>
    );
  };

  const renderSwapContent = () => {
    const inputToken = isXenToXburn ? 'XEN' : 'XBURN';
    const outputToken = isXenToXburn ? 'XBURN' : 'XEN';
    const inputBalance = isXenToXburn ? xenBalance : xburnBalance;
    const inputLogo = isXenToXburn ? '/xen.png' : '/logo192.png';
    const outputLogo = isXenToXburn ? '/logo192.png' : '/xen.png';

    // Use the same formatting function as other tabs
    const formattedBalance = formatTokenAmount(inputBalance);

    return (
      <>
        <div className="balance-info">
          <span>{inputToken} Balance: {formattedBalance} {inputToken}</span>
          <button className="max-button" onClick={() => setSwapAmount(ethers.utils.formatUnits(inputBalance, 18))}>MAX</button>
        </div>

        <div className="input-container">
          <input 
            type="text"
            value={swapAmount}
            onChange={handleSwapInputChange}
            placeholder="0.0"
            className="token-input"
          />
          <div className="token-label">
            <img src={inputLogo} alt={inputToken} className="token-icon" />
            <span>{inputToken}</span>
          </div>
        </div>

        <div className="swap-controls">
          <button 
            className="flip-button" 
            onClick={() => {
              setIsXenToXburn(!isXenToXburn);
              setSwapAmount('');
              setExpectedOutput('0');
            }}
          >
            ↑↓
          </button>
        </div>

        <div className="input-container">
          <input 
            type="text"
            value={expectedOutput}
            readOnly
            className="token-input"
          />
          <div className="token-label">
            <img src={outputLogo} alt={outputToken} className="token-icon" />
            <span>{outputToken}</span>
          </div>
        </div>

        <div className="swap-info">
          <div className="exchange-rate">
            <span>Rate:</span>
            <span>1 {inputToken} = {expectedOutput && swapAmount ? 
              formatDecimals((parseFloat(expectedOutput) / parseFloat(swapAmount)).toString()) 
              : '0'} {outputToken}</span>
          </div>
          <div className="minimum-received">
            <span>Minimum received:</span>
            <span>
              {formatTokenAmount(
                ethers.utils.parseUnits(
                  (parseFloat(expectedOutput || '0') * (1 - slippage/100)).toFixed(18),
                  18
                )
              )} {outputToken}
            </span>
          </div>
        </div>

        <div className="slippage-control">
          <span>Slippage: {slippage}%</span>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
          />
        </div>

        <button 
          className="action-button"
          onClick={handleSwap}
          disabled={isLoading || !canSwap()}
        >
          {isLoading ? 'Processing...' : 
           !swapAmount ? 'Enter Amount' :
           !expectedOutput ? 'Calculating...' :
           !canSwap() ? `Insufficient ${isXenToXburn ? 'XEN' : 'XBURN'} Balance` : 
           'Swap'}
        </button>
      </>
    );
  };

  // Add this function to check if swap is possible
  const canSwap = useCallback(() => {
    try {
      if (!swapAmount || !expectedOutput) return false;
      
      const balance = isXenToXburn ? xenBalance : xburnBalance;
      const inputAmountWei = ethers.utils.parseUnits(swapAmount, 18);
      const balanceWei = ethers.BigNumber.from(balance);

      console.log('Swap validation:', {
        inputAmount: swapAmount,
        inputAmountWei: inputAmountWei.toString(),
        balance: ethers.utils.formatUnits(balance, 18),
        balanceWei: balanceWei.toString(),
        isValid: inputAmountWei.lte(balanceWei)
      });

      // Compare BigNumbers directly to handle 18 decimals properly
      return inputAmountWei.gt(0) && inputAmountWei.lte(balanceWei);
    } catch (error) {
      console.error('Error in canSwap:', error);
      return false;
    }
  }, [swapAmount, expectedOutput, isXenToXburn, xenBalance, xburnBalance]);

  return (
    <div className="burn-container">
      <FireParticles width={520} height={400} intensity={0.2} isBackground={true} type="xburn" />
      <div className="burn-tabs">
        <button 
          className={`tab ${activeTab === 'burnXen' ? 'active' : ''}`}
          onClick={() => setActiveTab('burnXen')}
        >
          Burn XEN
        </button>
        <button 
          className={`tab ${activeTab === 'burnXBurn' ? 'active' : ''}`}
          onClick={() => setActiveTab('burnXBurn')}
        >
          Burn XBURN
        </button>
        <button 
          className={`tab ${activeTab === 'swapBurn' ? 'active' : ''}`}
          onClick={() => setActiveTab('swapBurn')}
        >
          Swap & Burn
        </button>
        <button 
          className={`tab ${activeTab === 'swap' ? 'active' : ''}`}
          onClick={() => setActiveTab('swap')}
        >
          Swap XBURN
        </button>
      </div>

      <div className="burn-content">
        <h2 className={`burn-title ${activeTab}`}>
          {activeTab === 'burnXen' && (
            <>
              <img src="/xen.png" alt="" className="burn-title-icon" />
              Burn XEN
            </>
          )}
          {activeTab === 'burnXBurn' && (
            <>
              <img src="/logo192.png" alt="" className="burn-title-icon" />
              Burn XBURN
            </>
          )}
          {activeTab === 'swapBurn' && (
            <>
              <img src="/logo192.png" alt="" className="burn-title-icon" />
              Swap & Burn
            </>
          )}
          {activeTab === 'swap' && (
            <>
              <img src="/logo192.png" alt="" className="burn-title-icon" />
              Swap XBURN
            </>
          )}
        </h2>
        <p className="burn-subtitle">
          {activeTab === 'swap' ? (
            <>Swap XBURN for XEN tokens and back!</>
          ) : activeTab === 'burnXen' ? (
            <>Burn your XEN tokens to earn XBURN rewards!</>
          ) : activeTab === 'burnXBurn' ? (
            <>Burn your XBURN tokens!</>
          ) : (
            <>Swap accumulated XEN for XBURN tokens!</>
          )}
        </p>

        {activeTab === 'swapBurn' ? (
          renderSwapAndBurnContent()
        ) : activeTab === 'swap' ? (
          renderSwapContent()
        ) : (
          <>
            <div className="balance-info">
              <span>Available Balance: {getCurrentBalanceFormatted()} {getCurrentToken()}</span>
              <button className="max-button" onClick={handleMax}>MAX</button>
            </div>

            <div className="input-container">
              <input 
                type="text"
                value={amount}
                onChange={handleInputChange}
                placeholder="0.0"
                className="token-input"
              />
              <div className="token-label">
                <img 
                  src={activeTab === 'burnXen' ? '/xen.png' : '/logo192.png'} 
                  alt={getCurrentToken()} 
                  className="token-icon" 
                />
                <span>{getCurrentToken()}</span>
              </div>
            </div>

            <div className="approval-info">
              Currently Approved: {getCurrentApprovedFormatted()} {getCurrentToken()}
            </div>

            <div className="button-container">
              <button 
                className="action-button"
                onClick={handleApprove}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : `Approve ${getCurrentToken()}`}
              </button>

              <button 
                className="action-button"
                onClick={handleBurn}
                disabled={isLoading || Number(getCurrentApproved()) === 0}
              >
                {isLoading ? 'Processing...' : `Burn ${getCurrentToken()}`}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="instructions">
        <h3>How to Burn XEN</h3>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <p>
                Visit a Sepolia faucet like <a href="https://refer.quicknode.com/?via=TreeCityWes" target="_blank" rel="noopener noreferrer">QuickNode</a>
              </p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <p>
                Visit <a href="https://testnet.xen.network" target="_blank" rel="noopener noreferrer">testnet.xen.network</a> and mint XEN (mints within 1 hr)
              </p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <p>Burn XEN and test the dApp features!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <StatsPanel />
      </div>

      <div className="info-section">
        <InfoCards />
      </div>
    </div>
  );
}; 