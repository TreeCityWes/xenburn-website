import React, { useState, useEffect, useCallback } from 'react';
import { useGlobalData } from '../context/GlobalDataContext';
import { useWallet } from '../context/WalletContext';
import './NFTPanel/NFTPanel.css';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';

export const NFTPanel = () => {
  const { 
    nfts, 
    loadingNFTs, 
    nftError, 
    loadNFTs, 
    claimNFT, 
    emergencyEndNFT,
    currentPage,
    totalPages,
    setCurrentPage,
    loadNFTById
  } = useGlobalData();
  
  const {
    account,
    nftContract
  } = useWallet();

  const [selectedNFT, setSelectedNFT] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [emergencyEnding, setEmergencyEnding] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [loadingSelectedNFT, setLoadingSelectedNFT] = useState(false);
  const [nftSvg, setNftSvg] = useState(null);

  // Fetch NFT SVG from tokenURI - define fetchNftSvg BEFORE using it in any effects
  const fetchNftSvg = useCallback(async (tokenId) => {
    try {
      if (!tokenId) {
        console.log("fetchNftSvg: No token ID provided");
        return;
      }
      
      if (!nftContract) {
        console.log("fetchNftSvg: NFT contract not available from WalletContext");
        return;
      }
      
      console.log(`Fetching SVG for token ID: ${tokenId} using contract address: ${nftContract.address}`);
      
      try {
        // Get the tokenURI from the contract
        const tokenURI = await nftContract.tokenURI(tokenId);
        console.log("Token URI:", tokenURI);
        
        // The tokenURI is a base64 encoded JSON string
        // Format: data:application/json;base64,<base64-encoded-json>
        if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.split(',')[1];
          const jsonString = atob(base64Data);
          const metadata = JSON.parse(jsonString);
          console.log("NFT Metadata:", metadata);
          
          // The image field contains the SVG data
          if (metadata.image && metadata.image.startsWith('data:image/svg+xml;base64,')) {
            const svgBase64 = metadata.image.split(',')[1];
            const svgString = atob(svgBase64);
            console.log("SVG data retrieved");
            setNftSvg(svgString);
          } else {
            console.error("Image data not found or not in expected format");
            setNftSvg(null);
          }
        } else {
          console.error("Token URI not in expected format");
          setNftSvg(null);
        }
      } catch (error) {
        console.error(`Error calling tokenURI for token ID ${tokenId}:`, error);
        setNftSvg(null);
      }
    } catch (error) {
      console.error(`Error in fetchNftSvg for token ID ${tokenId}:`, error);
      setNftSvg(null);
    }
  }, [nftContract]);

  // Load NFTs when component mounts or account/page changes
  useEffect(() => {
    console.log("NFTPanel: Loading NFTs for account", account, "page", currentPage);
    if (account) {
      loadNFTs();
    }
  }, [account, currentPage, loadNFTs]);

  // When nfts change, set the first one as selected if available
  useEffect(() => {
    if (nfts && nfts.length > 0 && nfts[0]) {
      console.log("NFTPanel: NFTs loaded successfully:", nfts.length, "NFTs");
      console.log("NFTPanel: First NFT data:", nfts[0]);
      setSelectedNFT(nfts[0]);
      setSelectedTokenId(nfts[0].tokenId);
      
      // Load SVG for the selected NFT
      if (nfts[0].tokenId) {
        fetchNftSvg(nfts[0].tokenId);
      }
    } else {
      console.log("NFTPanel: No NFTs available or data is incomplete");
      setSelectedNFT(null);
      setSelectedTokenId(null);
      setNftSvg(null);
    }
  }, [nfts, fetchNftSvg]);

  // Handle token selection from dropdown
  const handleTokenSelect = useCallback(async (tokenId) => {
    if (!tokenId || tokenId === selectedTokenId) return;
    
    console.log(`Selecting NFT with token ID: ${tokenId}`);
    setLoadingSelectedNFT(true);
    setSelectedTokenId(tokenId);
    setNftSvg(null);
    
    try {
      // Check if the token is already loaded
      const existingNFT = nfts && nfts.find && nfts.find(nft => nft.tokenId === tokenId);
      
      if (existingNFT) {
        console.log(`Found existing NFT data for token ID: ${tokenId}`, existingNFT);
        setSelectedNFT(existingNFT);
      } else {
        // Load the NFT details
        console.log(`Loading NFT details for token ID: ${tokenId}`);
        const nftDetails = await loadNFTById(tokenId);
        if (nftDetails) {
          console.log(`Successfully loaded NFT details for token ID: ${tokenId}`, nftDetails);
          setSelectedNFT(nftDetails);
        } else {
          console.error(`Failed to load NFT details for token ID: ${tokenId}`);
          toast.error(`Failed to load NFT #${tokenId}`);
        }
      }
      
      // Load SVG for the selected NFT
      fetchNftSvg(tokenId);
    } catch (error) {
      console.error(`Error selecting NFT with token ID: ${tokenId}:`, error);
      toast.error(`Error loading NFT #${tokenId}: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingSelectedNFT(false);
    }
  }, [nfts, selectedTokenId, loadNFTById, fetchNftSvg]);

  const handleClaimNFT = async (tokenId) => {
    if (claiming) return;
    
    setClaiming(true);
    try {
      console.log("Claiming NFT:", tokenId);
      await claimNFT(tokenId);
      // Refresh the NFT details after claiming
      const updatedNFT = await loadNFTById(tokenId);
      setSelectedNFT(updatedNFT);
    } catch (error) {
      console.error('Error claiming NFT:', error);
    } finally {
      setClaiming(false);
    }
  };

  const handleEmergencyEnd = async (tokenId) => {
    if (emergencyEnding) return;
    
    setEmergencyEnding(true);
    try {
      console.log("Emergency ending NFT:", tokenId);
      await emergencyEndNFT(tokenId);
      // Refresh the NFT details after emergency ending
      const updatedNFT = await loadNFTById(tokenId);
      setSelectedNFT(updatedNFT);
    } catch (error) {
      console.error('Error emergency ending NFT:', error);
    } finally {
      setEmergencyEnding(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleRetry = () => {
    console.log("Retrying NFT load");
    loadNFTs(true);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Helper function to determine NFT status
  const getNFTStatus = (nft) => {
    if (!nft || !nft.details) return { status: 'unknown', label: 'Unknown' };
    
    const { maturityTs, claimed } = nft.details;
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (claimed) {
      return { status: 'claimed', label: 'Claimed' };
    } else if (currentTime >= maturityTs) {
      return { status: 'ready-to-claim', label: 'Ready to Claim' };
    } else {
      return { status: 'locked', label: 'Locked' };
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatTimeRemaining = (maturityTs) => {
    if (!maturityTs) return null;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingSeconds = Math.max(0, maturityTs - currentTime);
    
    if (remainingSeconds <= 0) {
      return null;
    }
    
    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    return { days, hours, minutes, seconds };
  };

  // Helper function to format large numbers with decimals
  const formatTokenAmount = (amount, decimals = 18) => {
    if (!amount) return '0';
    
    // Convert from wei to ether (divide by 10^decimals)
    const value = ethers.utils.formatUnits(amount, decimals);
    
    // Format with commas for thousands separators
    return parseFloat(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  const renderNFTSelector = () => {
    if (!nfts || nfts.length === 0 || !nfts[0] || !nfts[0].allTokenIds) {
      return null;
    }
    
    const tokenIds = nfts[0].allTokenIds;
    
    return (
      <div className="nft-selector-container">
        <label htmlFor="nft-selector">Select NFT:</label>
        <select 
          id="nft-selector" 
          className="nft-selector"
          value={selectedTokenId || ''}
          onChange={(e) => handleTokenSelect(e.target.value)}
          disabled={loadingSelectedNFT}
        >
          {tokenIds.map(tokenId => (
            <option key={tokenId} value={tokenId}>
              NFT #{tokenId}
            </option>
          ))}
        </select>
        {loadingSelectedNFT && <div className="loading-spinner-small"></div>}
      </div>
    );
  };

  const renderNFTDetails = () => {
    if (!selectedNFT || !selectedNFT.details) return null;
    
    const { 
      xenAmount, 
      termDays, 
      maturityTs, 
      ampSnapshot, 
      claimed, 
      rewardAmount, 
      baseMint 
    } = selectedNFT.details;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const isMatured = currentTime >= maturityTs;
    const timeRemaining = formatTimeRemaining(maturityTs);
    const { status, label } = getNFTStatus(selectedNFT);
    
    return (
      <div className="nft-details-container">
        <h3>NFT #{selectedNFT.tokenId} Details</h3>
        
        {/* Render NFT SVG */}
        {renderNftImage()}
        
        {!claimed && !isMatured && timeRemaining && (
          <div className="time-remaining">
            <h3>Time Remaining Until Maturity</h3>
            <div className="countdown">
              <div className="countdown-item">
                <span className="countdown-value">{timeRemaining.days}</span>
                <span className="countdown-label">Days</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-value">{timeRemaining.hours}</span>
                <span className="countdown-label">Hours</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-value">{timeRemaining.minutes}</span>
                <span className="countdown-label">Minutes</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-value">{timeRemaining.seconds}</span>
                <span className="countdown-label">Seconds</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="nft-details">
          <div className="detail-row">
            <span className="detail-label">XEN Burned</span>
            <span className="detail-value">{formatTokenAmount(xenAmount)} XEN</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Term</span>
            <span className="detail-value">{termDays || '0'} days</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Maturity Date</span>
            <span className={`detail-value ${isMatured ? 'matured' : ''}`}>
              {formatTimestamp(maturityTs)}
              {isMatured && !claimed && ' (Matured)'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Amplification</span>
            <span className="detail-value">{ampSnapshot || '1'}x</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Base Mint</span>
            <span className="detail-value">{formatTokenAmount(baseMint)} XBURN</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Reward Amount</span>
            <span className="detail-value">{formatTokenAmount(rewardAmount)} XBURN</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className={`detail-value status-${status}`}>
              {label}
            </span>
          </div>
        </div>
        
        <div className="action-wrapper">
          {!claimed && isMatured && (
            <button 
              className="claim-button"
              onClick={() => handleClaimNFT(selectedNFT.tokenId)}
              disabled={claiming}
              style={{ background: "#ff5722", color: "white" }}
            >
              {claiming ? 'Claiming...' : 'Claim Rewards'}
            </button>
          )}
          
          {!claimed && !isMatured && (
            <button 
              className="emergency-end-button"
              onClick={() => handleEmergencyEnd(selectedNFT.tokenId)}
              disabled={emergencyEnding}
            >
              {emergencyEnding ? 'Processing...' : 'Emergency End (Forfeit Rewards)'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render NFT SVG or placeholder
  const renderNftImage = () => {
    if (!selectedNFT) return null;
    
    if (nftSvg) {
      return (
        <div className="nft-image-container">
          <div dangerouslySetInnerHTML={{ __html: nftSvg }} />
        </div>
      );
    } else {
      return (
        <div className="nft-image-container">
          <div className="nft-placeholder">NFT #{selectedNFT.tokenId}</div>
        </div>
      );
    }
  };

  const renderNoNFTsMessage = () => {
    if (!account) {
      return (
        <div className="no-nfts">
          <p>Connect your wallet to view your NFTs</p>
        </div>
      );
    }
    
    if (loadingNFTs) {
      return (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading NFTs...</p>
        </div>
      );
    }
    
    if (nftError) {
      return (
        <div className="error-message">
          <p>{nftError}</p>
          <p className="error-description">
            The NFTs may be inaccessible or the contract might not be properly initialized.
          </p>
          <button onClick={() => loadNFTs(true)} className="retry-button">
            Retry
          </button>
        </div>
      );
    }
    
    return (
      <div className="no-nfts">
        <p>No NFTs Found</p>
        <p>You don't have any XBURN NFTs on this network yet. Burn XEN tokens to mint XBURN NFTs!</p>
      </div>
    );
  };

  const renderContent = () => {
    // Show loading or error states first
    if (!account) {
      return renderNoNFTsMessage();
    }

    if (loadingNFTs) {
      return (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading NFTs...</p>
        </div>
      );
    }

    if (nftError) {
      return renderNoNFTsMessage();
    }
    
    // Check if we have NFT data and the contract is available
    if (!nfts || nfts.length === 0 || !nftContract) {
      return renderNoNFTsMessage();
    }

    // Display NFT content
    return (
      <div className="nft-container">
        {renderNFTSelector()}
        
        {selectedNFT && renderNFTDetails()}
        
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={handlePrevPage} 
              disabled={currentPage === 1 || loadingNFTs}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages || loadingNFTs}
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="nft-panel">
      <h2>Your XBURN NFTs</h2>
      <p className="subtitle">View and claim your XBURN NFTs</p>
      {renderContent()}
    </div>
  );
}; 