import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { ethers } from 'ethers';
import { XENFT_ABI } from '../../contracts/xenft';
import './NFTPanel.css';

const NFT_CONTRACT = '0x1EbC3157Cc44FE1cb0d7F4764D271BAD3deB9a03';

export const NFTPanel = () => {
  const { provider, account } = useWallet();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNFT, setSelectedNFT] = useState(null);

  useEffect(() => {
    const loadNFTs = async () => {
      if (!account || !provider) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const contract = new ethers.Contract(NFT_CONTRACT, XENFT_ABI, provider);
        const balance = await contract.balanceOf(account);
        const totalNFTs = balance.toNumber();
        
        const nftPromises = [];
        for (let i = 0; i < totalNFTs; i++) {
          nftPromises.push(
            contract.tokenOfOwnerByIndex(account, i)
              .then(async (tokenId) => {
                const uri = await contract.tokenURI(tokenId);
                const metadata = JSON.parse(atob(uri.split(',')[1]));
                return {
                  id: tokenId.toString(),
                  ...metadata,
                  blockscoutUrl: `https://eth-sepolia.blockscout.com/token/${NFT_CONTRACT}/instance/${tokenId}`
                };
              })
          );
        }
        
        const loadedNFTs = await Promise.all(nftPromises);
        setNfts(loadedNFTs);
      } catch (err) {
        console.error('Error loading NFTs:', err);
        setError('Failed to load NFTs. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadNFTs();
  }, [account, provider]);

  const handleNFTClick = (nft) => {
    window.open(nft.blockscoutUrl, '_blank');
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

  if (loading) {
    return (
      <div className="nft-panel">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading NFTs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nft-panel">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (nfts.length === 0) {
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