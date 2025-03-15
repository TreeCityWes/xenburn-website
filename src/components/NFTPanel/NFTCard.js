import React from 'react';
import PropTypes from 'prop-types';
import LoadingIndicator from '../common/LoadingIndicator';
import useTransactionState, { TX_STATE } from '../../hooks/useTransactionState';

const ExternalLinkIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 20 20" 
    fill="currentColor" 
    className="external-link-icon"
  >
    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
  </svg>
);

const NFTCard = ({ 
  nft, 
  selected, 
  onSelect, 
  onClaim, 
  onEndRewards,
  onEmergencyEnd,
  isMatured,
  isEnded 
}) => {
  const { txState, setTxState, getStatusMessage, isLoading } = useTransactionState('burning');
  
  const handleBurnNFT = async () => {
    try {
      // Check and handle approval first
      const isApproved = await xenftContract.isApprovedForAll(address, nftBurnContractAddress);
      
      if (!isApproved) {
        // Set state to approving
        setTxState(TX_STATE.APPROVING);
        
        const approveTx = await xenftContract.setApprovalForAll(
          nftBurnContractAddress,
          true
        );
        
        await approveTx.wait();
      }
      
      // Now set state to burning
      setTxState(TX_STATE.EXECUTING);
      
      // Execute the burn transaction
      const burnTx = await nftBurnContract.burnXENFT(nft.id);
      await burnTx.wait();
      
      // Set success state
      setTxState(TX_STATE.SUCCESS);
      
      // ... existing success handling ...
      
      // Call the callback
      if (onBurnSuccess) onBurnSuccess();
      
      // Reset state after delay
      setTimeout(() => {
        setTxState(TX_STATE.IDLE);
      }, 3000);
      
    } catch (error) {
      // Set error state
      setTxState(TX_STATE.ERROR);
      
      // ... existing error handling ...
    }
  };
  
  const blockscoutUrl = `https://eth-sepolia.blockscout.com/token/0x1EbC3157Cc44FE1cb0d7F4764D271BAD3deB9a03/instance/${nft.tokenId}`;

  return (
    <div className={`nft-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(nft)}>
      <a 
        href={blockscoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="blockscout-link"
        onClick={(e) => e.stopPropagation()}
      >
        View on Blockscout
        <ExternalLinkIcon />
      </a>
      
      <a 
        href={blockscoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="nft-image-container"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={nft.image} alt={`NFT #${nft.tokenId}`} className="nft-image" />
      </a>
      
      <div className="nft-data">
        <div className="nft-data-item">
          <span className="data-label">Token ID</span>
          <span className="data-value">#{nft.tokenId}</span>
        </div>
        <div className="nft-data-item">
          <span className="data-label">Multiplier</span>
          <span className="data-value">{nft.multiplier}x</span>
        </div>
        <div className="nft-data-item">
          <span className="data-label">Term</span>
          <span className="data-value">{nft.term} days</span>
        </div>
        <div className="nft-data-item">
          <span className="data-label">Maturity</span>
          <span className="data-value">{isMatured ? 'Matured' : 'Locked'}</span>
        </div>
      </div>
      
      <div className="nft-actions">
        {!isEnded && (
          <button
            className="action-button claim-button"
            onClick={(e) => {
              e.stopPropagation();
              onClaim(nft);
            }}
            disabled={!isMatured}
          >
            Claim
          </button>
        )}
        {isMatured && !isEnded && (
          <button
            className="action-button end-rewards-button"
            onClick={(e) => {
              e.stopPropagation();
              onEndRewards(nft);
            }}
          >
            End
          </button>
        )}
      </div>

      <button
        className="emergency-end-button"
        onClick={(e) => {
          e.stopPropagation();
          onEmergencyEnd(nft);
        }}
      >
        Emergency End
      </button>
      
      <button 
        onClick={handleBurnNFT}
        disabled={isLoading}
        className="burn-nft-button"
      >
        {isLoading ? (
          <div className="button-with-loader">
            <span>{getStatusMessage()}</span>
            <LoadingIndicator message="" size="small" color="white" inline />
          </div>
        ) : (
          "Burn NFT"
        )}
      </button>
    </div>
  );
};

NFTCard.propTypes = {
  nft: PropTypes.shape({
    tokenId: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    multiplier: PropTypes.number.isRequired,
    term: PropTypes.number.isRequired
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClaim: PropTypes.func.isRequired,
  onEndRewards: PropTypes.func.isRequired,
  onEmergencyEnd: PropTypes.func.isRequired,
  isMatured: PropTypes.bool.isRequired,
  isEnded: PropTypes.bool.isRequired
};

export default NFTCard; 