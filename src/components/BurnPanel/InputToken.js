import React from 'react';
import PropTypes from 'prop-types';
import { formatTokenAmount } from '../../utils/tokenUtils';

/**
 * InputToken - Component for token input with balance display
 * @param {Object} props - Component props
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Function to handle input change
 * @param {string} props.balance - User's token balance
 * @param {string} props.symbol - Token symbol
 * @param {string} props.logo - Path to token logo
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {boolean} props.error - Whether there's an error with the input
 */
const InputToken = ({ 
  value, 
  onChange, 
  balance, 
  symbol, 
  logo, 
  disabled = false,
  error = false
}) => {
  // Handle MAX button click
  const handleMaxClick = () => {
    if (disabled || !balance) return;
    
    // Set input to maximum balance
    onChange({ target: { value: formatTokenAmount(balance) } });
  };

  return (
    <div className={`input-token-container ${error ? 'error' : ''}`}>
      <div className="input-token-header">
        <div className="token-info">
          <img src={logo} alt={symbol} className="token-logo" />
          <span className="token-symbol">{symbol}</span>
        </div>
        <div className="balance-info">
          <span>Balance: {formatTokenAmount(balance)} {symbol}</span>
          <button 
            className="max-button" 
            onClick={handleMaxClick}
            disabled={disabled}
          >
            MAX
          </button>
        </div>
      </div>
      
      <div className="input-field">
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="0.0"
          disabled={disabled}
          className={error ? 'input-error' : ''}
        />
      </div>
      
      {error && (
        <div className="error-message">
          Amount exceeds balance
        </div>
      )}
    </div>
  );
};

InputToken.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  balance: PropTypes.string.isRequired,
  symbol: PropTypes.string.isRequired,
  logo: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.bool
};

export default InputToken; 