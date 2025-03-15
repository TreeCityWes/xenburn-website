import React from 'react';
import PropTypes from 'prop-types';

/**
 * TermSelect component for selecting term length for XEN burning
 */
const TermSelect = ({ 
  selectedTerm, 
  setSelectedTerm, 
  customTerm, 
  setCustomTerm, 
  quickTerms 
}) => {
  // Handle custom term input change
  const handleCustomTermChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setCustomTerm(0);
      return;
    }
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setCustomTerm(numValue);
      setSelectedTerm(numValue);
    }
  };
  
  // Handle term button click
  const handleTermClick = (days) => {
    setSelectedTerm(days);
    setCustomTerm(days);
  };
  
  return (
    <div className="term-quick-buttons">
      {/* First row */}
      <div className="term-row">
        <div className="term-button-wrapper">
          <button
            className={`term-quick-button ${selectedTerm === 0 ? 'active' : ''}`}
            onClick={() => handleTermClick(0)}
          >
            <span className="term-days">0 days</span>
          </button>
        </div>
        <div className="term-button-wrapper">
          <button
            className={`term-quick-button ${selectedTerm === 73 ? 'active' : ''}`}
            onClick={() => handleTermClick(73)}
          >
            <span className="term-days">73 days</span>
          </button>
        </div>
        <div className="term-button-wrapper">
          <button
            className={`term-quick-button ${selectedTerm === 183 ? 'active' : ''}`}
            onClick={() => handleTermClick(183)}
          >
            <span className="term-days">183 days</span>
          </button>
        </div>
      </div>
      
      {/* Second row */}
      <div className="term-row">
        <div className="term-button-wrapper">
          <button
            className={`term-quick-button ${selectedTerm === 365 ? 'active' : ''}`}
            onClick={() => handleTermClick(365)}
          >
            <span className="term-days">365 days</span>
          </button>
        </div>
        <div className="term-button-wrapper">
          <button
            className={`term-quick-button ${selectedTerm === 730 ? 'active' : ''}`}
            onClick={() => handleTermClick(730)}
          >
            <span className="term-days">730 days</span>
          </button>
        </div>
        <div className="term-button-wrapper">
          <button
            className={`term-quick-button ${selectedTerm === 1460 ? 'active' : ''}`}
            onClick={() => handleTermClick(1460)}
          >
            <span className="term-days">1460 days</span>
          </button>
        </div>
      </div>
      
      {/* Third row with custom option */}
      <div className="term-row">
        <div className="term-button-wrapper">
          <button
            className={`term-quick-button ${selectedTerm === 2193 ? 'active' : ''}`}
            onClick={() => handleTermClick(2193)}
          >
            <span className="term-days">2193 days</span>
          </button>
        </div>
        <div className="term-button-wrapper">
          <button
            className={`term-quick-button ${selectedTerm === 3285 ? 'active' : ''}`}
            onClick={() => handleTermClick(3285)}
          >
            <span className="term-days">3285 days</span>
          </button>
        </div>
        <div className="term-button-wrapper">
          <button
            className={`term-quick-button ${selectedTerm === customTerm && !quickTerms.some(t => t.days === customTerm) ? 'active' : ''}`}
            onClick={() => setSelectedTerm(customTerm)}
          >
            <span className="term-days">Custom</span>
            <div className="custom-days-input">
              <input
                type="number"
                value={customTerm || ''}
                onChange={handleCustomTermChange}
                placeholder="Enter days"
                min="0"
                max="1000"
              />
            </div>
            <span className="max-days">Max: 1000 days</span>
          </button>
        </div>
      </div>
    </div>
  );
};

TermSelect.propTypes = {
  selectedTerm: PropTypes.number.isRequired,
  setSelectedTerm: PropTypes.func.isRequired,
  customTerm: PropTypes.number.isRequired,
  setCustomTerm: PropTypes.func.isRequired,
  quickTerms: PropTypes.array.isRequired
};

export default TermSelect; 