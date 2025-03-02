import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import toast from 'react-hot-toast';
import './BurnPanel.css';
import FireParticles from './FireParticles';
import { Instructions } from './Instructions';
import { StatsPanel } from './StatsPanel';
import { InfoCards } from './InfoCards';
import {
  XEN_ADDRESS,
  XENBURNER_ADDRESS,
  UNISWAP_ROUTER_ADDRESS,
  PAIR_ADDRESS
} from '../constants/contracts';

// Import ABIs
import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/XBurnMinter.json';

// Create a context for sharing amplifier values
export const BurnPanelContext = createContext({
  ampSnapshot: 10000,
  ampStart: 10000
});

// Update logo references to use public folder paths instead of imports
// import xenLogo from '../assets/xen.png';
// import xburnLogo from '../assets/logo192.png';
const xenLogo = '/xen.png';
const xburnLogo = '/logo192.png';

// Add utility functions at the top
const formatDecimals = (value, options = {}) => {
  if (!value) return '0';
  
  let num = parseFloat(value);
  if (isNaN(num)) return '0';

  // Handle scientific notation
  if (num.toString().includes('e')) {
    num = Number(num.toFixed(20));
  }
  
  // Default option for UI display with commas
  const useCommas = options.useCommas !== false;
  
  // Format with commas for input/output fields to improve readability
  const addCommas = (n) => {
    return useCommas ? n.toLocaleString('en-US') : n;
  };
  
  // Cap at 999T+
  if (num > 999e12) return '999T+';
  
  // Handle large numbers with proper suffixes
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) {
    // For numbers between 1,000 and 1,000,000, use commas for better readability in the UI
    if (useCommas && num < 1e6) {
      return addCommas(num.toFixed(0));
    }
    return `${(num / 1e3).toFixed(2)}K`;
  }
  
  // For smaller numbers, show up to 6 decimals max
  if (num < 0.000001) return '<0.000001';
  if (num < 0.001) return num.toFixed(6);
  if (num < 1) return num.toFixed(4);
  
  // For whole numbers, don't show decimals
  if (num % 1 === 0) return addCommas(num);
  
  // For numbers with decimals, use 2 decimal places
  return addCommas(num.toFixed(2));
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
  if (!value) return '';
  
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
const UNISWAP_ROUTER = UNISWAP_ROUTER_ADDRESS; // Use imported router address
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

// Add animated transition between tabs
const TabView = ({activeTab, setActiveTab}) => (
  <div className="burn-tabs">
    {[
      {id: "burnXEN", label: "Burn XEN"}, 
      {id: "burnXBURN", label: "Burn XBURN"}, 
      {id: "swapBurn", label: "Swap & Burn"}, 
      {id: "swap", label: "Swap"}
    ].map(tab => (
      <button
        key={tab.id}
        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
        onClick={() => setActiveTab(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// Modern input token component with token logo to the left of input field
const InputToken = ({ 
  label, 
  tokenName, 
  tokenLogo, 
  value, 
  onChange, 
  balance, 
  placeholder,
  approvedAmount
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  // Format balance with proper decimal handling
  const formattedBalance = balance ? formatTokenAmount(balance) : '0';
  const formattedApproved = approvedAmount ? formatTokenAmount(approvedAmount) : '0';
  
  return (
    <div className="token-input-container">
      <div className={`token-input-field ${isFocused ? 'focused' : ''}`}>
        <div className="token-field-content">
          <div className="token-icon-wrapper">
            <img src={tokenLogo} alt={tokenName} className="token-icon" />
            <span className="token-name">{tokenName}</span>
          </div>
          <div className="token-amount-wrapper">
            <input
              type="text"
              className="token-amount-input"
              value={value}
              onChange={onChange}
              placeholder={placeholder || "0.0"}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </div>
        </div>
        <div className="balance-info">
          <div>
            <span>Balance: {formattedBalance}</span>
            {approvedAmount && <span>Approved: {formattedApproved}</span>}
          </div>
          <button 
            className="max-button" 
            onClick={(e) => {
              e.preventDefault();
              if (onChange && balance) {
                // Use max balance with proper formatting
                onChange({ target: { value: ethers.utils.formatUnits(balance, 18) } });
              }
            }}
          >
            MAX
          </button>
        </div>
      </div>
    </div>
  );
};

// Output token component for swaps
const OutputToken = ({ token, amount, balance }) => (
  <div className="token-input-field">
    <div className="token-selector">
      <img 
        src={token.toLowerCase() === "xburn" ? "/logo192.png" : `/${token.toLowerCase()}.png`} 
        alt={token} 
        className="token-icon" 
      />
      <span className="token-name">{token}</span>
    </div>
    <input
      type="text"
      value={amount}
      readOnly
      placeholder="0.0"
      className="token-amount-input"
    />
    <div className="balance-display">
      <span>Balance: {formatDecimals(balance, { useCommas: true })}</span>
    </div>
  </div>
);

// Swap details component
const SwapDetails = ({ rate, impact, minReceived }) => (
  <div className="swap-info">
    <div className="exchange-rate">
      <span>Exchange Rate</span>
      <span>{rate}</span>
    </div>
    {impact && (
      <div className="exchange-rate">
        <span>Price Impact</span>
        <span>{impact}</span>
      </div>
    )}
    <div className="exchange-rate">
      <span>Minimum Received</span>
      <span>{minReceived}</span>
    </div>
  </div>
);

// Tooltip component for better UX
const Tooltip = ({text, children}) => (
  <div className="tooltip-container">
    {children}
    <div className="tooltip">{text}</div>
  </div>
);

// Function to calculate days needed for a specific multiplier
const calculateDaysForMultiplier = (multiplier, ampStart = 10000, ampSnapshot = 10000) => {
  // Early return for no lock (1x multiplier)
  if (multiplier <= 1) return 0;
  
  // Use the provided values or defaults
  return Math.ceil(((multiplier - 1) * 365 * ampStart) / ampSnapshot);
};

const TermSelect = ({ value, onChange }) => {
  const multiplierOptions = [1, 2, 5, 7.5, 10];
  const { ampSnapshot, ampStart } = useContext(BurnPanelContext);
  const [customDays, setCustomDays] = useState('');
  const [isCustomActive, setIsCustomActive] = useState(false);

  // Calculate days needed for each multiplier option
  const quickTerms = multiplierOptions.map(multiplier => {
    const days = calculateDaysForMultiplier(multiplier, ampStart, ampSnapshot);
    return { 
      days, 
      multiplier,
      label: multiplier === 1 ? "0 days" : `${days} days`
    };
  });

  const handleCustomChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(value || '0', 10);
    
    // Enforce max of 3650 days
    if (numValue > 3650) {
      setCustomDays('3650');
      onChange(3650);
    } else {
      setCustomDays(value);
      if (value) {
        onChange(numValue);
      }
    }
    // Always set custom as active when typing in it
    setIsCustomActive(true);
  };

  const handleTermClick = (days) => {
    // If clicking on a predefined term
    setIsCustomActive(false);
    onChange(days);
    // Clear custom days when selecting a predefined term
    setCustomDays('');
  };

  const handleCustomClick = () => {
    // Set custom as active when clicking on it
    setIsCustomActive(true);
    // If there's a value in the custom input, use it
    if (customDays) {
      onChange(parseInt(customDays, 10));
    } else {
      // Otherwise set a default value to max (3650)
      setCustomDays('3650');
      onChange(3650);
    }
  };

  // Initialize and track if the current value is custom
  useEffect(() => {
    // Check if current value matches any quick term
    const matchingQuickTerm = quickTerms.find(term => term.days === value);
    
    if (!matchingQuickTerm && value > 0) {
      // If value doesn't match any quick term, it must be custom
      setIsCustomActive(true);
      setCustomDays(value.toString());
    } else if (matchingQuickTerm) {
      // If value matches a quick term, make sure custom is not active
      setIsCustomActive(false);
    }
  }, [value, quickTerms]);

  return (
    <div className="term-selector">
      <div className="term-label">Lock Duration</div>
      <div className="term-quick-buttons-container">
        <div className="term-quick-buttons">
          {quickTerms.map((term, index) => (
            <div
              key={index}
              className={`term-quick-button ${!isCustomActive && term.days === value ? 'active' : ''}`}
              onClick={() => handleTermClick(term.days)}
            >
              <div>{term.label}</div>
              <span className="term-multiplier">{term.multiplier}x</span>
            </div>
          ))}
          <div
            className={`term-quick-button custom ${isCustomActive ? 'active' : ''}`}
            onClick={handleCustomClick}
          >
            <div className="custom-days-input">
              <input 
                type="text" 
                value={customDays}
                onChange={handleCustomChange}
                placeholder="Enter days"
                onClick={(e) => {
                  // Stop propagation to prevent the container click handler from firing
                  e.stopPropagation();
                  setIsCustomActive(true);
                }}
              />
              <span className="max-days">Max: 3650</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate multiplier based on days
const calculateMultiplier = (days) => {
  if (days <= 0) return 1;
  
  // Compound rate of 0.015% per day
  const multiplier = Math.pow(1.00015, days);
  
  // Round to 2 decimal places for display
  return parseFloat(multiplier.toFixed(2));
};

// Create a rewards graph component to visualize rewards over time
const RewardsGraph = ({ amount, termDays, ampStart, ampSnapshot }) => {
  const [showGraph, setShowGraph] = useState(false);
  
  // Set default amount to 100,000 if not provided
  const defaultAmount = "100000";
  const displayAmount = amount && parseFloat(amount) > 0 ? amount : defaultAmount;
  
  // Convert amount to BigNumber for calculations
  const amountBN = ethers.utils.parseUnits(displayAmount.toString(), 18);
  
  const calculateRewardMultiplier = (days) => {
    return 1 + ((days * ampSnapshot) / (365 * ampStart));
  };

  const generateDataPoints = () => {
    // Time intervals in days (0, 30, 90, 180, 365, 730, 1095, 1460, 1825, 2190, 2555, 2920, 3285, 3650)
    const intervals = [0, 30, 90, 180, 365, 730, 1095, 1460, 1825, 2190, 2555, 2920, 3285, 3650];
    
    return intervals.map(days => {
      const multiplier = calculateRewardMultiplier(days);
      return {
        days,
        multiplier,
        rewards: ethers.utils.formatUnits(amountBN.mul(Math.floor(multiplier * 100)).div(100), 18)
      };
    });
  };

  const dataPoints = generateDataPoints();
  const maxMultiplier = Math.max(...dataPoints.map(d => d.multiplier));
  
  // Calculate SVG points for the line chart
  const getLinePoints = () => {
    const width = 100; // percentage width
    const height = 160; // pixels height
    const padding = 30; // pixels padding
    const availableWidth = width - (padding * 2 / width * 100);
    const availableHeight = height - (padding * 2);
    
    return dataPoints.map((point, index) => {
      const x = padding + (index / (dataPoints.length - 1)) * availableWidth;
      const normalizedY = (point.multiplier - 1) / (maxMultiplier - 1); // normalize to 0-1
      const y = height - padding - (normalizedY * availableHeight);
      return `${x}% ${y}px`;
    }).join(' ');
  };

  return (
    <div className="rewards-graph-container">
      <div 
        className="graph-toggle" 
        onClick={() => setShowGraph(!showGraph)}
      >
        {showGraph ? 'Hide Reward Projection ▲' : 'Show Reward Projection ▼'}
      </div>
      
      {showGraph && dataPoints.length > 0 && (
        <div className="rewards-graph">
          <div className="graph-title">Estimated Rewards Over Time</div>
          <div className="graph-subtitle">Based on current amplifier values</div>
          
          <div className="line-chart-container">
            <svg viewBox="0 0 1000 400" className="line-chart">
              {/* X and Y axis */}
              <line x1="50" y1="350" x2="950" y2="350" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="50" y1="50" x2="50" y2="350" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              
              {/* Y-axis labels (multipliers) */}
              {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
                <text 
                  key={i} 
                  x="40" 
                  y={350 - (300 * percent)} 
                  fill="rgba(255,255,255,0.6)" 
                  fontSize="12" 
                  textAnchor="end" 
                  alignmentBaseline="middle"
                >
                  {(maxMultiplier * percent).toFixed(1)}x
                </text>
              ))}
              
              {/* X-axis labels (days) */}
              {dataPoints.filter((_, i) => i % 2 === 0).map((point, i, filteredData) => (
                <text 
                  key={i} 
                  x={50 + ((900 / (filteredData.length - 1)) * i)} 
                  y="370" 
                  fill="rgba(255,255,255,0.6)" 
                  fontSize="12" 
                  textAnchor="middle"
                >
                  {point.days}d
                </text>
              ))}
              
              {/* Multiplier line */}
              <polyline
                points={getLinePoints()}
                fill="none"
                stroke="#ff6600"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {dataPoints.map((point, i) => {
                const x = 50 + ((900 / (dataPoints.length - 1)) * i);
                const y = 350 - ((point.multiplier / maxMultiplier) * 300);
                return (
                  <g key={i}>
                    <circle
                      cx={x}
                      cy={y}
                      r="5"
                      fill="#ff6600"
                    />
                    <title>{point.multiplier.toFixed(2)}x ({point.rewards.toLocaleString()} tokens)</title>
                  </g>
                );
              })}
            </svg>
          </div>
          
          <div className="graph-legend">
            <div className="graph-legend-item">
              <span className="graph-legend-color line"></span>
              <span>Multiplier Growth Over Time</span>
            </div>
            <div className="graph-info">
              Staking longer increases your reward multiplier based on the XEN Crypto amplification factor.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const BurnPanel = () => {
  const { account, signer } = useWallet();
  const [activeTab, setActiveTab] = useState('burnXEN');
  const [amount, setAmount] = useState('');
  const [termDays, setTermDays] = useState(0);
  const [xenBalance, setXenBalance] = useState('0');
  const [xburnBalance, setXburnBalance] = useState('0');
  const [xenApproved, setXenApproved] = useState('0');
  const [xburnApproved, setXburnApproved] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ percentage: 0, accumulated: '0', threshold: '0' });
  const [isXenToXburn, setIsXenToXburn] = useState(false);
  const [swapAmount, setSwapAmount] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('0');
  const [slippage, setSlippage] = useState('1'); // Default 1%
  const [needsApproval, setNeedsApproval] = useState(true);
  const [approving, setApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');
  // Add state for amplifier values
  const [ampSnapshot, setAmpSnapshot] = useState(10000); // Default value
  const [ampStart, setAmpStart] = useState(10000); // Default value
  
  // Add state for xburnAmount and stakingTerm
  const [xburnAmount, setXburnAmount] = useState('');
  const [stakingTerm, setStakingTerm] = useState(0);

  // Create context value
  const contextValue = {
    ampSnapshot,
    ampStart
  };

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
      
      // The percentage is returned in basis points (10000 = 100%)
      // Divide by 100 to get the actual percentage
      const basisPoints = progress.percentage.toNumber();
      const calculatedPercentage = basisPoints / 100;

      setProgress({
        accumulated: accumulated,
        threshold: threshold,
        percentage: calculatedPercentage.toString()
      });
      
      console.log('Accumulation progress:', {
        accumulated,
        threshold,
        basisPoints,
        calculatedPercentage: calculatedPercentage.toString() + '%'
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

      // Calculate the swap amount using UniswapV2 formula
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

  // Move checkApprovalStatus function here, before it's used in useEffect
  const checkApprovalStatus = useCallback(async () => {
    if (!account || !signer || !swapAmount) {
      setNeedsApproval(true);
      return;
    }

    try {
      const inputToken = isXenToXburn ? XEN_ADDRESS : XENBURNER_ADDRESS;
      const tokenContract = new ethers.Contract(
        inputToken,
        inputToken === XEN_ADDRESS ? xenAbi : xenBurnerAbi,
        signer
      );

      const amountIn = ethers.utils.parseUnits(swapAmount, 18);
      const allowance = await tokenContract.allowance(account, UNISWAP_ROUTER);
      
      const needs = allowance.lt(amountIn);
      setNeedsApproval(needs);
      
      console.log('Approval status check:', {
        token: isXenToXburn ? 'XEN' : 'XBURN',
        allowance: ethers.utils.formatUnits(allowance, 18),
        amountIn: swapAmount,
        needsApproval: needs
      });
    } catch (error) {
      console.error('Error checking approval:', error);
      setNeedsApproval(true);
    }
  }, [account, signer, swapAmount, isXenToXburn]);

  // Function to fetch amplifier values from contract
  const fetchAmplifierValues = useCallback(async () => {
    if (!signer) return;
    
    try {
      const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
      
      // Get current amplifier value - adjust function name based on your contract
      const currentAmp = await burnerContract.getCurrentAmplifier();
      setAmpSnapshot(currentAmp.toNumber());
      
      // Get AMP_START constant - adjust function name based on your contract
      const ampStartValue = await burnerContract.AMP_START();
      setAmpStart(ampStartValue.toNumber());
      
      console.log('Amplifier values:', {
        currentAmp: currentAmp.toNumber(),
        ampStart: ampStartValue.toNumber()
      });
    } catch (error) {
      console.error('Error fetching amplifier values:', error);
      // Fallback to default values if fetch fails
    }
  }, [signer]);

  // Add the fetch call to the initial load effects
  useEffect(() => {
    if (account && signer) {
      fetchBalances();
      fetchAccumulationProgress();
      fetchAmplifierValues(); // Add this line
      const interval = setInterval(() => {
        fetchBalances();
        fetchAccumulationProgress();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [account, signer, fetchBalances, fetchAccumulationProgress, fetchAmplifierValues]);

  useEffect(() => {
    if (swapAmount && parseFloat(swapAmount) > 0) {
      getSwapEstimate(swapAmount).then(setExpectedOutput);
    }
  }, [isXenToXburn, getSwapEstimate, swapAmount]);

  useEffect(() => {
    // Check if tokens are approved based on activeTab
    if (activeTab === 'burnXEN') {
      const xenAmountBN = amount ? ethers.utils.parseUnits(amount, 18) : ethers.constants.Zero;
      const xenApprovedBN = ethers.BigNumber.from(xenApproved);
      setIsApproved(xenApprovedBN.gte(xenAmountBN) && xenAmountBN.gt(0));
    } else if (activeTab === 'burnXBURN') {
      const xburnAmountBN = amount ? ethers.utils.parseUnits(amount, 18) : ethers.constants.Zero;
      const xburnApprovedBN = ethers.BigNumber.from(xburnApproved);
      setIsApproved(xburnApprovedBN.gte(xburnAmountBN) && xburnAmountBN.gt(0));
    }
  }, [activeTab, amount, xenApproved, xburnApproved]);

  useEffect(() => {
    if (swapAmount) {
      checkApprovalStatus();
    }
  }, [swapAmount, checkApprovalStatus]);

  const handleApprove = async () => {
    if (!account || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter an amount to approve');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Approving tokens for ${activeTab}`);
      
      // Select the correct contract based on active tab
      let contract, spenderAddress;
      
      if (activeTab === 'burnXEN') {
        contract = new ethers.Contract(XEN_ADDRESS, xenAbi, signer);
        spenderAddress = XENBURNER_ADDRESS;
      } else {
        contract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
        spenderAddress = XENBURNER_ADDRESS;
      }

      // For approval, we should use MaxUint256 to avoid having to approve again
      const approveAmount = ethers.constants.MaxUint256;

      // Log approval details
      console.log('Approving tokens:', {
        token: activeTab === 'burnXEN' ? 'XEN' : 'XBURN',
        spender: spenderAddress,
        amount: 'MAX'
      });

      const tx = await contract.approve(
        spenderAddress,
        approveAmount,
        {
          gasLimit: 300000 // Set explicit gas limit to avoid estimation issues
        }
      );

      toast.success('Approval transaction submitted...');
      await tx.wait();
      toast.success('Approval successful!');
      await fetchBalances();
    } catch (error) {
      console.error('Approval error:', error);
      
      if (error.message?.includes('user rejected transaction')) {
        toast.error('Transaction rejected by user');
      } else if (error.error?.message?.includes('insufficient funds')) {
        toast.error('Insufficient ETH for gas fees');
      } else {
        toast.error(error.reason || 'Approval failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMax = useCallback(() => {
    if (activeTab === 'burnXEN' && xenBalance) {
      setAmount(ethers.utils.formatUnits(xenBalance, 18));
    } else if (activeTab === 'burnXBURN' && xburnBalance) {
      setAmount(ethers.utils.formatUnits(xburnBalance, 18));
    } else if (activeTab === 'swapBurn' || activeTab === 'swap') {
      if (isXenToXburn && xenBalance) {
        setSwapAmount(ethers.utils.formatUnits(xenBalance, 18));
      } else if (!isXenToXburn && xburnBalance) {
        setSwapAmount(ethers.utils.formatUnits(xburnBalance, 18));
      }
    }
  }, [activeTab, xenBalance, xburnBalance, isXenToXburn]);

  const getCurrentBalance = useCallback(() => {
    return activeTab === 'burnXEN' ? xenBalance : xburnBalance;
  }, [activeTab, xenBalance, xburnBalance]);

  const getCurrentApproved = useCallback(() => {
    return activeTab === 'burnXEN' ? xenApproved : xburnApproved;
  }, [activeTab, xenApproved, xburnApproved]);

  const getCurrentToken = () => {
    return activeTab === 'burnXEN' ? 'XEN' : 'XBURN';
  };

  const handleInputChange = (e) => {
    const parsed = parseInputValue(e.target.value);
    setAmount(parsed);
  };

  const handleBurn = async () => {
    if (!account || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter an amount to burn');
      return;
    }

    // Check if amount is greater than balance
    try {
      const currentBalance = getCurrentBalance();
      const amountBN = ethers.utils.parseUnits(amount, 18);
      const balanceBN = ethers.BigNumber.from(currentBalance);

      if (amountBN.gt(balanceBN)) {
        toast.error('Amount exceeds balance');
        return;
      }

      // Check if amount is greater than approved amount
      const currentApproved = getCurrentApproved();
      const approvedBN = ethers.BigNumber.from(currentApproved);
      
      if (amountBN.gt(approvedBN)) {
        toast.error('Please approve tokens first');
        return;
      }

      setIsLoading(true);
      const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
      
      try {
        // Use the selected term days value
        console.log(`Burning ${amount} XEN with ${termDays} days lock term`);
        const tx = await burnerContract.burnXEN(
          amountBN, 
          termDays,
          { gasLimit: 500000 }
        );
        
        toast.success('Transaction submitted...');
        await tx.wait();
        toast.success(`XEN burned successfully!`);
        await fetchBalances();
        setAmount('');
      } catch (error) {
        console.error('Burn error:', error);
        
        if (error.message?.includes('user rejected transaction')) {
          toast.error('Transaction rejected by user');
        } else if (error.error?.message?.includes('insufficient funds')) {
          toast.error('Insufficient ETH for gas fees');
        } else {
          toast.error(error.reason || `Failed to burn XEN`);
        }
      }
    } catch (error) {
      console.error('Error preparing burn transaction:', error);
      toast.error(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapAndBurn = async () => {
    if (!account || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      const burnerContract = new ethers.Contract(XENBURNER_ADDRESS, xenBurnerAbi, signer);
      
      // Get accumulation progress and check if threshold is reached
      const progress = await burnerContract.getAccumulationProgress();
      
      // The percentage is returned in basis points (10000 = 100%)
      // Divide by 100 to get the actual percentage
      const basisPoints = progress.percentage.toNumber();
      const calculatedPercentage = basisPoints / 100;
      
      console.log('Swap & Burn - Accumulation Progress:', {
        accumulated: ethers.utils.formatUnits(progress.accumulated, 18),
        threshold: ethers.utils.formatUnits(progress.threshold, 18),
        basisPoints,
        percentage: calculatedPercentage
      });
      
      if (calculatedPercentage < 100) {
        toast.error('Accumulation threshold not reached yet');
        setIsLoading(false);
        return;
      }

      // Set minimum output to ZERO for testing to prevent failures
      const minOutputPerUnit = ethers.utils.parseUnits("0", 18);
      
      console.log('Swap & Burn - Calling contract with params:', {
        minOutputPerUnit: ethers.utils.formatUnits(minOutputPerUnit, 18)
      });
      
      // Call the contract function with gas limit to avoid estimateGas failures
      const tx = await burnerContract.swapXenForXburn(minOutputPerUnit, {
        gasLimit: 500000
      });
      
      toast.success('Swap & Burn pending...');
      await tx.wait();
      toast.success('Swap & Burn successful!');
      await fetchBalances();
      await fetchAccumulationProgress();
    } catch (error) {
      console.error('Swap & Burn error:', error);
      // Provide more detailed error message if available
      if (error.reason) {
        toast.error(`Swap & Burn failed: ${error.reason}`);
      } else if (error.message) {
        // Trim the error message to make it more user-friendly
        const errorMsg = error.message.split('(')[0].trim();
        toast.error(`Swap & Burn failed: ${errorMsg}`);
      } else {
        toast.error('Swap & Burn failed. Please try again.');
      }
    }
    setIsLoading(false);
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

  const handleApproveToken = async () => {
    if (!account || !signer || !swapAmount) {
      toast.error('Please enter an amount');
      return;
    }

    setApproving(true);
    try {
      const inputToken = isXenToXburn ? XEN_ADDRESS : XENBURNER_ADDRESS;
      const tokenContract = new ethers.Contract(
        inputToken,
        inputToken === XEN_ADDRESS ? xenAbi : xenBurnerAbi,
        signer
      );

      console.log('Approving token for swap:', {
        token: isXenToXburn ? 'XEN' : 'XBURN',
        spender: UNISWAP_ROUTER,
        amount: 'MAX'
      });

      const approveTx = await tokenContract.approve(UNISWAP_ROUTER, ethers.constants.MaxUint256);
      toast.success('Approval transaction submitted');
      await approveTx.wait();
      toast.success('Token approval successful');
      
      // Refresh approval status after successful approval
      setNeedsApproval(false);
      
      // Refresh balances
      await fetchBalances();
    } catch (error) {
      console.error('Approval error:', error);
      if (error.message?.includes('user rejected transaction')) {
        toast.error('Transaction rejected by user');
      } else {
        toast.error(error.reason || 'Token approval failed');
      }
    } finally {
      setApproving(false);
    }
  };

  const handleSwap = async () => {
    if (!account || !signer || !swapAmount) {
      toast.error('Please enter an amount');
      return;
    }

    try {
      // Check approval one more time
      const inputToken = isXenToXburn ? XEN_ADDRESS : XENBURNER_ADDRESS;
      const tokenContract = new ethers.Contract(
        inputToken,
        inputToken === XEN_ADDRESS ? xenAbi : xenBurnerAbi,
        signer
      );

      // Make sure we can parse the amount correctly
      let amountIn;
      try {
        amountIn = ethers.utils.parseUnits(swapAmount, 18);
      } catch (e) {
        toast.error(`Invalid amount format: ${e.message}`);
        return;
      }
      
      const allowance = await tokenContract.allowance(account, UNISWAP_ROUTER);
      
      if (allowance.lt(amountIn)) {
        toast.error('Please approve tokens before swapping');
        return;
      }

      setIsLoading(true);
      const router = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, signer);
      const outputToken = isXenToXburn ? XENBURNER_ADDRESS : XEN_ADDRESS;
      
      // Calculate minimum output with slippage
      let expectedOut;
      try {
        expectedOut = ethers.utils.parseUnits(expectedOutput, 18);
      } catch (e) {
        toast.error(`Error calculating expected output: ${e.message}`);
        setIsLoading(false);
        return;
      }
      
      // Update slippage calculation to handle higher values
      const slippageValue = parseFloat(slippage);
      const slippageFactor = 1000 - Math.floor(slippageValue * 10);
      const minOut = expectedOut.mul(slippageFactor).div(1000);

      console.log('Swap params:', {
        amountIn: ethers.utils.formatUnits(amountIn, 18),
        expectedOut: ethers.utils.formatUnits(expectedOut, 18),
        minOut: ethers.utils.formatUnits(minOut, 18),
        slippage: slippage,
        slippageFactor: slippageFactor,
        path: [inputToken, outputToken],
        pool: PAIR_ADDRESS
      });

      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      
      try {
        const tx = await router.swapExactTokensForTokens(
          amountIn,
          minOut,
          [inputToken, outputToken],
          account,
          deadline,
          { 
            gasLimit: 600000,  // Increased gas limit
          }
        );

        toast.success('Swap transaction submitted...');
        await tx.wait();
        toast.success('Swap successful!');
        
        setSwapAmount('');
        setExpectedOutput('0');
        await fetchBalances();
      } catch (txError) {
        console.error('Transaction error:', txError);
        
        // More detailed error handling
        if (txError.reason?.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
          toast.error('Price impact too high. Try increasing slippage or using a smaller amount.');
        } else if (txError.error?.message?.includes('insufficient funds')) {
          toast.error('Insufficient ETH for gas fees');
        } else if (txError.message?.includes('user rejected transaction')) {
          toast.error('Transaction rejected');
        } else {
          toast.error(`Swap failed: ${txError.reason || txError.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Swap preparation error:', error);
      toast.error(`Error preparing swap: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate exchange rate for display in swap
  const calculateRate = useCallback(() => {
    if (!swapAmount || parseFloat(swapAmount) === 0 || parseFloat(expectedOutput) === 0) {
      return isXenToXburn ? '1 XEN = ? XBURN' : '1 XBURN = ? XEN';
    }
    
    const inputNum = parseFloat(swapAmount);
    const outputNum = parseFloat(expectedOutput);
    
    if (isXenToXburn) {
      return `1 XEN ≈ ${formatDecimals(outputNum / inputNum, { useCommas: true })} XBURN`;
    } else {
      return `1 XBURN ≈ ${formatDecimals(outputNum / inputNum, { useCommas: true })} XEN`;
    }
  }, [swapAmount, expectedOutput, isXenToXburn]);

  // Calculate minimum received based on slippage
  const calculateMinReceived = useCallback(() => {
    if (!expectedOutput || parseFloat(expectedOutput) === 0) return '0';
    
    const output = parseFloat(expectedOutput);
    const slippageValue = parseFloat(slippage);
    const slippageFactor = 1 - (slippageValue / 100);
    return `${formatDecimals(output * slippageFactor, { useCommas: true })} ${isXenToXburn ? 'XBURN' : 'XEN'}`;
  }, [expectedOutput, slippage, isXenToXburn]);

  // Calculate price impact (simplified for demo)
  const calculateImpact = useCallback(() => {
    // This would normally calculate based on pool reserves and swap amount
    // Simplified placeholder implementation
    if (!swapAmount || parseFloat(swapAmount) === 0) return '<0.01%';
    
    const impact = Math.min(parseFloat(swapAmount) / 10000, 5); // Just a demo calculation
    return `${impact.toFixed(2)}%`;
  }, [swapAmount]);

  // Toggle swap direction with animation
  const toggleDirection = () => {
    setSwapAmount('');
    setExpectedOutput('0');
    setIsXenToXburn(!isXenToXburn);
  };

  // Modern swap interface component
  const SwapInterface = () => (
    <div className="swap-container">
      <div className="token-input-container">
        <div className="token-selector">
          <img 
            src={isXenToXburn ? "/xen.png" : "/logo192.png"} 
            alt={isXenToXburn ? "XEN" : "XBURN"} 
            className="token-icon" 
          />
          <span className="token-name">{isXenToXburn ? "XEN" : "XBURN"}</span>
        </div>
        <input
          type="text"
          value={swapAmount}
          onChange={handleSwapInputChange}
          placeholder="0.0"
          className="token-amount-input"
        />
        <div className="balance-info">
          <span>Balance: {formatDecimals(isXenToXburn ? ethers.utils.formatUnits(xenBalance, 18) : ethers.utils.formatUnits(xburnBalance, 18), { useCommas: true })}</span>
          <button 
            className="max-button" 
            onClick={() => {
              const maxAmount = isXenToXburn 
                ? ethers.utils.formatUnits(xenBalance, 18)
                : ethers.utils.formatUnits(xburnBalance, 18);
              setSwapAmount(maxAmount);
            }}
          >
            MAX
          </button>
        </div>
      </div>
      
      <div className="swap-arrow-container">
        <button className="swap-arrow-button" onClick={toggleDirection}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z" />
          </svg>
        </button>
      </div>
      
      <div className="token-input-container">
        <div className="token-selector">
          <img 
            src={isXenToXburn ? "/logo192.png" : "/xen.png"} 
            alt={isXenToXburn ? "XBURN" : "XEN"} 
            className="token-icon" 
          />
          <span className="token-name">{isXenToXburn ? "XBURN" : "XEN"}</span>
        </div>
        <input
          type="text"
          value={expectedOutput}
          readOnly
          placeholder="0.0"
          className="token-amount-input"
        />
        <div className="balance-display">
          <span>Balance: {formatDecimals(isXenToXburn ? ethers.utils.formatUnits(xburnBalance, 18) : ethers.utils.formatUnits(xenBalance, 18), { useCommas: true })}</span>
        </div>
      </div>
      
      <div className="swap-info-table">
        <div className="swap-info-row">
          <span>Exchange Rate</span>
          <span>{calculateRate()}</span>
        </div>
        {swapAmount && parseFloat(swapAmount) > 0 && (
          <div className="swap-info-row">
            <span>Price Impact</span>
            <span>{calculateImpact()}</span>
          </div>
        )}
        <div className="swap-info-row">
          <span>Minimum Received</span>
          <span>{calculateMinReceived()}</span>
        </div>
      </div>
      
      <div className="slippage-control">
        <span>Slippage Tolerance</span>
        <Tooltip text="Your transaction will revert if the price changes unfavorably by more than this percentage">
          <span>{slippage}%</span>
        </Tooltip>
      </div>
      <div className="slippage-slider-container">
        <input
          type="range"
          min="0.1"
          max="49"
          step="0.1"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
          className="slippage-slider"
          aria-label="Slippage Tolerance"
          onTouchStart={() => {}} 
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
        />
      </div>
      
      <div className="button-container">
        {needsApproval && (
          <button
            className="approve-button"
            onClick={handleApproveToken}
            disabled={isLoading || approving || !swapAmount || parseFloat(swapAmount) <= 0}
          >
            {approving ? 'Approving...' : `Approve ${isXenToXburn ? 'XEN' : 'XBURN'}`}
          </button>
        )}
        
        <button
          className={needsApproval ? "swap-button" : "swap-button"}
          onClick={handleSwap}
          disabled={isLoading || !swapAmount || parseFloat(swapAmount) <= 0 || needsApproval}
        >
          {isLoading ? 'Processing...' : needsApproval ? 'Approve First' : 'Swap'}
        </button>
      </div>
    </div>
  );

  // Helper function to calculate XBURN amount from XEN
  const calculateXburnAmount = (amount) => {
    if (!amount || isNaN(parseFloat(amount))) return 0;
    // Assuming 1 XEN = 0.00001 XBURN (1:100,000 ratio)
    const xburnAmount = parseFloat(amount) / 100000;
    return xburnAmount.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  // Render the BurnPanel with modern UI
  return (
    <BurnPanelContext.Provider value={contextValue}>
      <div className="burn-container">
        <TabView activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="burn-content">
          {/* Conditional rendering based on active tab */}
          {activeTab === 'burnXEN' && (
            <div className="tab-content">
              <h2 className="burn-title">Burn XEN for XBURN</h2>
              
              <div className="burn-form">
                <InputToken
                  label="Amount to Burn"
                  tokenName="XEN"
                  tokenLogo={xenLogo}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  balance={xenBalance}
                  placeholder="Enter XEN amount to burn"
                  approvedAmount={xenApproved}
                />
                
                <TermSelect 
                  value={termDays} 
                  onChange={days => setTermDays(days)} 
                />
                
                {/* Define amountBN from amount */}
                {(() => {
                  // Parse amount to BigNumber for comparisons
                  const amountBN = amount && amount !== '0' 
                    ? ethers.utils.parseUnits(amount.toString(), 18) 
                    : ethers.constants.Zero;
                  
                  return (
                    <div className="button-container">
                      {needsApproval && (
                        <button
                          className="approve-button"
                          onClick={handleApprove}
                          disabled={isLoading || !amount || amount === '0' || approving || amountBN.gt(xenBalance || '0')}
                        >
                          {approving ? (
                            <>
                              <div className="loader"></div>
                              Approving...
                            </>
                          ) : (
                            'Approve XEN for Burning'
                          )}
                        </button>
                      )}
                      <button
                        className="burn-button"
                        onClick={handleBurn}
                        disabled={
                          isLoading || 
                          !amount || 
                          amount === '0' || 
                          (needsApproval && (amountBN.gt(xenApproved || '0'))) || 
                          amountBN.gt(xenBalance || '0')
                        }
                      >
                        {isLoading ? (
                          <>
                            <div className="loader"></div>
                            Processing...
                          </>
                        ) : (
                          'Burn XEN & Receive XBURN'
                        )}
                      </button>
                    </div>
                  );
                })()}
                
                <div className="conversion-info">
                  You will receive
                  <div className="conversion-rate">
                    {calculateXburnAmount(amount)} XBURN
                  </div>
                </div>
                
                {/* Rewards Graph after conversion info */}
                <RewardsGraph 
                  amount={amount} 
                  termDays={termDays} 
                  ampStart={ampStart}
                  ampSnapshot={ampSnapshot}
                />
              </div>
            </div>
          )}
          
          {activeTab === 'burnXBURN' && (
            <div className="tab-content">
              <h2 className="burn-title">Stake XBURN for ETH Rewards</h2>
              
              <div className="burn-form">
                <InputToken
                  label="XBURN Token Amount to Stake"
                  tokenName="XBURN"
                  tokenLogo={xburnLogo}
                  value={xburnAmount}
                  onChange={setXburnAmount}
                  balance={xburnBalance}
                  placeholder="Enter XBURN amount to stake"
                  approvedAmount={xburnApproved}
                />
                
                <div className="section-divider"></div>
                
                <TermSelect value={stakingTerm} onChange={setStakingTerm} />
                
                <div className="conversion-info">
                  <div>Reward Multiplier:</div>
                  <div className="conversion-rate">
                    {calculateMultiplier(stakingTerm)}x
                  </div>
                </div>

                {/* Rest of the content */}
                {/* ... existing code ... */}
              </div>
            </div>
          )}
          
          {activeTab === 'swapBurn' && (
            <>
              <h2 className="burn-title swapBurn">Swap & Burn</h2>
              <p className="burn-subtitle">
                Swap accumulated XEN for XBURN in one operation
              </p>
              
              <div className="simple-instructions">
                This operation swaps accumulated XEN tokens to XBURN once threshold is reached
              </div>
              
              <div className="progress-container">
                <div className="progress-section-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 12c0 1.93-1.57 3.5-3.5 3.5S8.5 13.93 8.5 12s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5zm-4.25 3.29c.83.28 1.72.28 2.54 0l.53-.53-.53.52c.39-.39.39-1.02 0-1.41a.9959.9959 0 0 0-1.41 0c-.39.39-.39 1.02 0 1.41l-.53.53.53-.52c-.83-.28-1.72-.28-2.55 0l.53.52-.53-.53c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l.53-.53-.52.53c-.39-.39-.39-1.02 0-1.41.39-.39.39-.39 1.02 0 .39-.39.39-1.02 0-1.41l.53-.53-.52.53zM12 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm7.5-4c0 4.14-3.36 7.5-7.5 7.5S4.5 16.14 4.5 12 7.86 4.5 12 4.5s7.5 3.36 7.5 7.5zm-1 0c0-3.58-2.92-6.5-6.5-6.5S5.5 8.42 5.5 12s2.92 6.5 6.5 6.5 6.5-2.92 6.5-6.5z"/>
                  </svg>
                  <span>Accumulation Progress</span>
                </div>

                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{
                      width: `${Math.min(parseFloat(progress.percentage || 0), 100)}%`,
                      display: 'block'
                    }}
                  ></div>
                </div>
                
                <div className="progress-statistics">
                  <span className="progress-percent">{formatDecimals(progress.percentage || 0)}%</span>
                  <div className="progress-values">
                    <div>Accumulated: {formatDecimals(progress.accumulated || 0, { useCommas: true })} XEN</div>
                    <div>Threshold: {formatDecimals(progress.threshold || 0, { useCommas: true })} XEN</div>
                  </div>
                </div>
              </div>

              <div className="section-divider"></div>

              {parseFloat(progress.percentage || 0) < 100 ? (
                <div className="swap-disabled-reason">
                  Swap & Burn will be enabled once accumulation reaches 100%
                </div>
              ) : (
                <button 
                  className="burn-button"
                  onClick={handleSwapAndBurn}
                  disabled={isLoading}
                  style={{width: '100%', margin: '20px 0'}}
                >
                  {isLoading ? 'Processing...' : 'Swap & Burn Now'}
                </button>
              )}
            </>
          )}
          
          {activeTab === 'swap' && (
            <>
              <h2 className="burn-title swap">Swap Tokens</h2>
              <p className="burn-subtitle">
                Swap between XEN and XBURN tokens with optimal rates
              </p>
              
              {/* Use the new SwapInterface component */}
              <SwapInterface />
            </>
          )}
          
          {/* Fix FireParticles by providing proper parameters */}
          <FireParticles 
            width={480} 
            height={400} 
            intensity={0.2} 
            isBackground={true} 
            type="xburn" 
          />
          
          {/* Include Instructions, StatsPanel, and InfoCards inside the burn-container */}
          <Instructions />
          <StatsPanel />
          <InfoCards />
        </div>
      </div>
    </BurnPanelContext.Provider>
  );
};