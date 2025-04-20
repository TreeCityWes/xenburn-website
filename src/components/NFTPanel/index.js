import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { useGlobalData } from '../../context/GlobalDataContext';
import './NFTPanel.css';

export const NFTPanel = () => {
  const { account } = useWallet();
  const { nfts, loadingNFTs, nftError, loadNFTs, totalNFTs, loadNFTById } = useGlobalData();
  const [selectedNFT, setSelectedNFT] = useState(null);

  useEffect(() => {
    if (account) {
      loadNFTs();
    }
  }, [account, loadNFTs]);

  const handleNFTClick = (nft) => {
    if (nft.blockscoutUrl) {
       window.open(nft.blockscoutUrl, '_blank');
    } else {
       console.warn("Blockscout URL not found on NFT object");
    }
  };

  const handleEmergencyEnd = async (nft) => {
    // Implement emergency end functionality
    console.log('Emergency ending NFT:', nft.id);
  };

  if (!account) {
    return (
      <div className="nft-panel">
        <div className="nft-message">Please connect your wallet to view NFTs</div>
      </div>
    );
  }

  if (loadingNFTs) {
    return (
      <div className="nft-panel">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading NFTs...</div>
        </div>
      </div>
    );
  }

  if (nftError) {
    return (
      <div className="nft-panel">
        <div className="error-message">{nftError}</div>
      </div>
    );
  }

  if (totalNFTs === 0) {
    return (
      <div className="nft-panel">
        <div className="nft-message">No NFTs found in your wallet</div>
      </div>
    );
  }

  return (
    <div className="nft-panel">
      <div className="nft-grid">
        {nfts.map((nft) => (
          <div 
            key={nft.id} 
            className={`nft-card ${selectedNFT?.id === nft.id ? 'selected' : ''}`}
            onClick={() => setSelectedNFT(nft)}
          >
            <div 
              className="nft-image-container"
              onClick={(e) => {
                e.stopPropagation();
                handleNFTClick(nft);
              }}
            >
              <img src={nft.image} alt={`NFT #${nft.id}`} className="nft-image" />
            </div>

            <div className="nft-data">
              <div className="nft-data-item">
                <span className="data-label">Token ID</span>
                <span className="data-value">#{nft.id}</span>
              </div>
              {nft.attributes?.map((attr, index) => (
                <div key={index} className="nft-data-item">
                  <span className="data-label">{attr.trait_type}</span>
                  <span className="data-value">{attr.value}</span>
                </div>
              ))}
            </div>

            <button
              className="emergency-end-button"
              onClick={(e) => {
                e.stopPropagation();
                handleEmergencyEnd(nft);
              }}
            >
              Emergency End
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 