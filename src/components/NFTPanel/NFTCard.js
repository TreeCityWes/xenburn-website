import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
// import LoadingIndicator from '../common/LoadingIndicator'; // Assuming this is not used or defined elsewhere
import useTransactionState, { TX_STATE } from '../../hooks/useTransactionState';
// Removed direct address import
// import { XBURN_NFT_ADDRESS } from '../../constants/addresses';
// Import hooks to get context data
import { useWallet } from '../../context/WalletContext'; 
import { useGlobalData } from '../../context/GlobalDataContext'; 
import { getChainById } from '../../constants/chains'; // Import chain helper

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
  // Removed action props if handled by parent (NFTPanel)
  // onClaim, 
  // onEndRewards,
  // onEmergencyEnd,
  // Removed state props if derived in parent
  // isMatured, 
  // isEnded 
}) => {
  // Get context data
  const { selectedChainId, getCurrentAddresses, signer, nftContract } = useWallet();
  const { claimNFT, emergencyEndNFT } = useGlobalData(); // Get actions from GlobalData context
  
  // State for SVG content
  const [nftSvg, setNftSvg] = useState(null);
  const [loadingSvg, setLoadingSvg] = useState(false);
  
  // Use local transaction state hook if needed for card-specific actions (like a hypothetical burn)
  // const { txState, setTxState, getStatusMessage, isLoading } = useTransactionState('nftAction');
  
  // Derive needed info from context and props
  const currentAddresses = getCurrentAddresses();
  const currentChain = getChainById(selectedChainId);
  const explorerUrl = currentChain?.blockExplorers?.default?.url;
  const nftAddress = currentAddresses?.XBURN_NFT_ADDRESS;

  // Verify if the NFT contract address matches the current chain's address
  const isContractValid = useMemo(() => {
    if (!nftContract || !currentAddresses?.XBURN_NFT_ADDRESS) return false;
    return nftContract.address.toLowerCase() === currentAddresses.XBURN_NFT_ADDRESS.toLowerCase();
  }, [nftContract, currentAddresses]);

  // Load SVG for NFT
  useEffect(() => {
    const fetchNftSvg = async () => {
      if (!nft?.tokenId || !nftContract || !isContractValid) return;
      
      setLoadingSvg(true);
      try {
        const tokenURI = await nftContract.tokenURI(nft.tokenId);
        
        if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.split(',')[1];
          const jsonString = atob(base64Data);
          const metadata = JSON.parse(jsonString);
          
          if (metadata.image && metadata.image.startsWith('data:image/svg+xml;base64,')) {
            const svgBase64 = metadata.image.split(',')[1];
            setNftSvg(atob(svgBase64));
          } else {
            console.warn('SVG not found in metadata image field');
          }
        }
      } catch (error) {
        console.error("Error fetching NFT SVG:", error);
      } finally {
        setLoadingSvg(false);
      }
    };
    
    fetchNftSvg();
  }, [nft?.tokenId, nftContract, isContractValid]);

  // Determine status and maturity locally from nft.details if passed down
  const details = nft?.details;
  const isMatured = useMemo(() => {
      if (!details?.maturityTs) return false;
      return Math.floor(Date.now() / 1000) >= details.maturityTs;
  }, [details?.maturityTs]);
  const isClaimed = details?.claimed || false;

  // Removed handleBurnNFT as burning logic is likely handled elsewhere or needs full context

  return (
    <div className={`nft-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(nft)}>
      {/* Image container - REMOVE onClick and data-explorer-url */}
      <div 
        className="nft-image-container"
        title={`NFT #${nft.tokenId}`} /* Simplified title */
      >
         {nft.image ? (
            <img src={nft.image} alt={`NFT #${nft.tokenId}`} className="nft-image" />
         ) : loadingSvg ? (
            <div className="nft-loading">Loading...</div>
         ) : nftSvg ? (
             <div className="nft-svg-container" dangerouslySetInnerHTML={{ __html: nftSvg }} />
         ) : (
             <div className="nft-placeholder">?</div>
         )}
      </div>
      
      <div className="nft-data">
         {/* Display data from nft.details */}
          <div className="nft-data-item">
            <span className="data-label">Token ID</span>
            <span className="data-value">#{nft.tokenId}</span>
          </div>
           <div className="nft-data-item">
            <span className="data-label">Term</span>
            <span className="data-value">{details?.termDays || '?'} days</span>
          </div>
          <div className="nft-data-item">
            <span className="data-label">Maturity</span>
             <span className="data-value">{isMatured ? 'Matured' : 'Locked'}</span>
          </div>
           <div className="nft-data-item">
            <span className="data-label">Claimed</span>
             <span className="data-value">{isClaimed ? 'Yes' : 'No'}</span>
          </div>
          {!isContractValid && (
            <div className="nft-data-item error">
              <span className="data-value">Wrong Network</span>
            </div>
          )}
      </div>
      
      {/* Actions moved to parent (NFTPanel) */}
      {/* 
      <div className="nft-actions"> ... buttons ... </div>
      <button className="emergency-end-button"> ... </button>
      <button className="burn-nft-button"> ... </button> 
      */}
    </div>
  );
};

// Update PropTypes based on what's actually needed
NFTCard.propTypes = {
  nft: PropTypes.shape({
    tokenId: PropTypes.string.isRequired,
    image: PropTypes.string, // Image might not always be present initially
    details: PropTypes.object // Pass details down
    // Removed multiplier/term if they are inside details
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  // Removed action prop types
};

export default NFTCard; 