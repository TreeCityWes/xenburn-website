import React, { useState, useContext } from 'react';
import { formatDecimals, formatTokenAmount, safeFormatMaxBalance, calculateDaysForMultiplier } from './tokenUtils';
import { MAX_TERM_DAYS } from './constants';

/**
 * Tab navigation component
 */
export const TabView = ({activeTab, setActiveTab}) => (
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

/**
 * Input token component with token logo and balance display
 */
export const InputToken = ({ 
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
  
  // Format for display - full numbers on hover, abbreviated by default
  const displayBalance = balance ? formatDecimals(formattedBalance, { useCommas: true, abbreviated: true }) : '0';
  const displayApproved = approvedAmount ? formatDecimals(formattedApproved, { useCommas: true, abbreviated: true, isApproved: true }) : '0';
  
  // Full format for tooltip/hover
  const fullDisplayBalance = balance ? formatDecimals(formattedBalance, { useCommas: true, showFull: true }) : '0';
  const fullDisplayApproved = approvedAmount ? formatDecimals(formattedApproved, { useCommas: true, showFull: true, isApproved: true }) : '0';
  
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
              placeholder={placeholder || "Enter amount..."}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {/* Move MAX button to the input field */}
            <button 
              className="max-button" 
              onClick={(e) => {
                e.preventDefault();
                if (onChange && balance) {
                  const formattedValue = safeFormatMaxBalance(balance);
                  onChange({ target: { value: formattedValue } });
                }
              }}
            >
              MAX
            </button>
          </div>
        </div>
      </div>
      
      {/* New balance info panel below input */}
      <div className="balance-info-panel">
        <div className="balance-info-content">
          <span 
            className="balance-display"
            title={fullDisplayBalance}
          >
            Balance: {displayBalance}
          </span>
          
          {approvedAmount && (
            <span 
              className="approved-display"
              title={fullDisplayApproved}
            >
              Approved: {displayApproved}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Output token component for displaying token output
 */
export const OutputToken = ({ token, amount, balance }) => (
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

/**
 * Swap details component for displaying exchange information
 */
export const SwapDetails = ({ rate, impact, minReceived }) => (
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

/**
 * Custom Tooltip component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Element that triggers the tooltip
 * @param {string} props.text - Tooltip text content
 * @param {string} props.position - Tooltip position (top, bottom, left, right)
 */
export const Tooltip = ({ children, text, position = 'top' }) => {
  return (
    <div className="tooltip-container">
      {children}
      <div className={`tooltip-text tooltip-${position}`}>
        {text}
      </div>
    </div>
  );
};

/**
 * Term selection component for choosing lock duration
 */
export const TermSelect = ({ value, onChange, BurnPanelContext }) => {
  // Use the multipliers requested by the user (1x, 1.2x, 1.5x, 2x, 5x, 7.5x, 10x, custom)
  const multiplierOptions = [1, 1.2, 1.5, 2, 5, 7.5, 10];
  const { ampSnapshot, ampStart } = useContext(BurnPanelContext);
  const [customDays, setCustomDays] = useState('');
  const [isCustomActive, setIsCustomActive] = useState(false);

  // Calculate days needed for each multiplier option
  const quickTerms = multiplierOptions.map(multiplier => {
    const days = calculateDaysForMultiplier(multiplier, ampStart, ampSnapshot);
    return { 
      days, 
      multiplier,
      label: multiplier === 1 ? "1x (0 days)" : `${multiplier}x (${days} days)`
    };
  });

  const handleCustomChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(value || '0', 10);
    
    // Enforce max of MAX_TERM_DAYS days
    if (numValue > MAX_TERM_DAYS) {
      setCustomDays(MAX_TERM_DAYS.toString());
      onChange(MAX_TERM_DAYS);
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
      // Otherwise set a default value to max (MAX_TERM_DAYS)
      setCustomDays(MAX_TERM_DAYS.toString());
      onChange(MAX_TERM_DAYS);
    }
  };

  return (
    <div className="term-selector">
      <div className="term-label">Lock Term</div>
      <div className="term-quick-buttons">
        <div className="term-row">
          {quickTerms.slice(0, 4).map(term => (
            <div key={term.multiplier} className="term-button-wrapper">
              <button
                className={`term-quick-button ${value === term.days ? 'active' : ''}`}
                onClick={() => handleTermClick(term.days)}
              >
                <div className="term-multiplier">{term.multiplier}x</div>
                <div className="term-days">{term.days} days</div>
              </button>
            </div>
          ))}
        </div>
        <div className="term-row">
          {quickTerms.slice(4).map(term => (
            <div key={term.multiplier} className="term-button-wrapper">
              <button
                className={`term-quick-button ${value === term.days ? 'active' : ''}`}
                onClick={() => handleTermClick(term.days)}
              >
                <div className="term-multiplier">{term.multiplier}x</div>
                <div className="term-days">{term.days} days</div>
              </button>
            </div>
          ))}
          
          <div className="term-button-wrapper">
            <button
              className={`term-quick-button custom ${isCustomActive ? 'active' : ''}`}
              onClick={handleCustomClick}
            >
              <div className="custom-days-input">
                <input
                  type="text"
                  value={customDays}
                  onChange={handleCustomChange}
                  placeholder="Custom"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="max-days">Max: {MAX_TERM_DAYS}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 