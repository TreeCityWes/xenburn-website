import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import toast from 'react-hot-toast';
import './NFTPanel.css';

// Define PER_PAGE as a constant
const PER_PAGE = 10;

export const NFTPanel = () => {
  // Add safeRequest to the destructured values
  const { account, signer, nftContract, xburnMinterContract, safeRequest } = useWallet();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false); // Separate loading state for details
  const [selectedNft, setSelectedNft] = useState(null);
  const [nftDetails, setNftDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [endingStake, setEndingStake] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  // Add ref to track if we're in the middle of an operation
  const operationInProgress = useRef(false);
  // Add state to show initial loading only on first load
  const [initialLoad, setInitialLoad] = useState(true);
  // Add ref to prevent auto-refresh when user is interacting
  const userInteracting = useRef(false);
  // Add ref to track if we've already loaded NFTs
  const hasLoadedNFTs = useRef(false);

  // Load user's NFTs - simplified to only load once
  const loadUserNFTs = useCallback(async (force = false) => {
    // If we've already loaded NFTs and this isn't a forced refresh, don't load again
    if (hasLoadedNFTs.current && !force) {
      return;
    }
    
    if (!account || !nftContract) return;
    
    // Don't refresh if we're in the middle of claiming or ending a stake
    if (operationInProgress.current && !force) {
      return;
    }

    try {
      setLoading(true);
      
      // Use safeRequest to fetch NFTs without timeout
      const userLocks = await safeRequest(
        () => nftContract.getAllUserLocks(account, currentPage, PER_PAGE),
        'Error fetching NFT list'
      );
      
      const { tokenIds, totalPages: pages } = userLocks;
      setTotalPages(pages.toNumber());
      
      // If no NFTs left, clear everything
      if (tokenIds.length === 0) {
        setNfts([]);
        setSelectedNft(null);
        setNftDetails(null);
        setLoading(false);
        setInitialLoad(false);
        hasLoadedNFTs.current = true;
        return;
      }
      
      // Format the NFTs data with parallel processing to speed up loading
      const formattedNfts = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const tokenIdNumber = tokenId.toNumber();
          try {
            // Use safeRequest for token URI without timeout
            const uri = await safeRequest(
              () => nftContract.tokenURI(tokenIdNumber),
              `Error fetching token URI for NFT #${tokenIdNumber}`
            );
            
            // The URI is a base64 encoded JSON string
            try {
              const jsonString = atob(uri.substring(29)); // Remove 'data:application/json;base64,'
              const metadata = JSON.parse(jsonString);
              return {
                id: tokenIdNumber,
                image: metadata.image,
                name: metadata.name || `XBURN Lock Position #${tokenIdNumber}`,
                attributes: metadata.attributes
              };
            } catch (parseError) {
              console.error(`Error parsing metadata for NFT ${tokenIdNumber}:`, parseError);
              return {
                id: tokenIdNumber,
                image: null,
                name: `XBURN Lock Position #${tokenIdNumber}`,
                attributes: [],
                loadFailed: true
              };
            }
          } catch (error) {
            console.error(`Error loading NFT ${tokenIdNumber}:`, error);
            return {
              id: tokenIdNumber,
              image: null,
              name: `XBURN Lock Position #${tokenIdNumber}`,
              attributes: [],
              loadFailed: true
            };
          }
        })
      );
      
      setNfts(formattedNfts);
      
      // Select the first NFT if none is selected and this is initial load
      if (formattedNfts.length > 0 && (!selectedNft || initialLoad)) {
        // Find the currently selected NFT in the new list if it exists
        const currentNft = selectedNft ? formattedNfts.find(nft => nft.id === selectedNft.id) : null;
        
        // If the current NFT is still in the list, keep it selected
        // Otherwise select the first NFT
        const nftToSelect = currentNft || formattedNfts[0];
        
        // Only update if we're changing the selection
        if (!selectedNft || selectedNft.id !== nftToSelect.id) {
          setSelectedNft(nftToSelect);
          
          // Load details for the selected NFT
          setDetailsLoading(true);
          try {
            // Use safeRequest for lock details without timeout
            const details = await safeRequest(
              () => nftContract.getLockDetails(nftToSelect.id),
              `Error fetching details for NFT #${nftToSelect.id}`
            );
            
            // Format the details
            const formattedDetails = {
              xenAmount: ethers.utils.formatUnits(details.xenAmount, 18),
              maturityTs: new Date(details.maturityTs.toNumber() * 1000).toLocaleString(),
              maturityTimestamp: details.maturityTs.toNumber(),
              ampSnapshot: details.ampSnapshot.toNumber(),
              termDays: details.termDays.toNumber(),
              claimed: details.claimed,
              rewardAmount: ethers.utils.formatUnits(details.rewardAmount, 18),
              baseMint: ethers.utils.formatUnits(details.baseMint, 18),
              owner: details.owner
            };
            
            setNftDetails(formattedDetails);
          } catch (error) {
            console.error('Error loading initial NFT details:', error);
          } finally {
            setDetailsLoading(false);
          }
        }
      }
      
      // Mark that we've loaded NFTs
      hasLoadedNFTs.current = true;
    } catch (error) {
      console.error('Error loading NFTs:', error);
      if (initialLoad || force) {
        toast.error('Failed to load your NFTs. Please try again.');
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [account, nftContract, currentPage, safeRequest, selectedNft, initialLoad]);

  // Initial load - only once when component mounts
  useEffect(() => {
    if (account && signer && nftContract && !hasLoadedNFTs.current) {
      // Load immediately without delay
      loadUserNFTs(true);
    } else if (!account) {
      setNfts([]);
      setSelectedNft(null);
      setNftDetails(null);
      hasLoadedNFTs.current = false;
    }
  }, [account, signer, nftContract, loadUserNFTs]);

  // Format large numbers with commas
  const formatNumber = (num) => {
    if (!num) return "0";
    return parseFloat(num).toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  };

  // Handle claiming rewards with improved error handling
  const handleClaim = async () => {
    if (!xburnMinterContract || !selectedNft || !signer) return;
    
    // Check if NFT is mature
    if (nftDetails && nftDetails.maturityTimestamp > Math.floor(Date.now() / 1000)) {
      toast.error('This NFT is not yet mature and cannot be claimed');
      return;
    }

    try {
      // Set operation in progress to prevent auto-refresh
      operationInProgress.current = true;
      userInteracting.current = true;
      setClaiming(true);
      
      const tx = await safeRequest(
        () => xburnMinterContract.connect(signer).claimLockedXBURN(selectedNft.id),
        'Error claiming rewards'
      );
      
      // Display a message explaining that the NFT will be burned
      toast.success('Transaction submitted! Your NFT will be burned when claimed.', { duration: 5000 });
      
      await tx.wait();
      
      // Show success message
      toast.success('Successfully claimed rewards! Your NFT has been burned.', { duration: 5000 });
      
      // Remove this NFT from the list without full refresh
      setNfts(prevNfts => prevNfts.filter(nft => nft.id !== selectedNft.id));
      
      // Select another NFT if available
      const remainingNfts = nfts.filter(nft => nft.id !== selectedNft.id);
      if (remainingNfts.length > 0) {
        await handleSelectNft(remainingNfts[0]);
      } else {
        setSelectedNft(null);
        setNftDetails(null);
        // Only refresh the list if we have no NFTs left
        setTimeout(() => {
          loadUserNFTs(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast.error(error.reason || 'Failed to claim rewards');
    } finally {
      setClaiming(false);
      // Reset operation in progress
      operationInProgress.current = false;
      // Reset user interacting after a delay
      setTimeout(() => {
        userInteracting.current = false;
      }, 1000);
    }
  };

  // Handle pagination with simpler implementation
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      // Set user interacting to true when changing pages
      userInteracting.current = true;
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      // Set user interacting to true when changing pages
      userInteracting.current = true;
      setCurrentPage(prevPage => prevPage - 1);
    }
  };

  // Handle NFT selection with improved error handling - no timeouts
  const handleSelectNft = async (nft) => {
    if (!nft) return;
    
    userInteracting.current = true;
    setSelectedNft(nft);
    setDetailsLoading(true);
    
    try {
      // Check if the NFT still exists
      await safeRequest(
        () => nftContract.ownerOf(nft.id),
        `Error checking ownership of NFT #${nft.id}`
      ).catch(async () => {
        // If ownerOf throws an error, the NFT doesn't exist anymore
        console.log(`NFT ${nft.id} no longer exists, removing from list`);
        setNfts(prevNfts => prevNfts.filter(n => n.id !== nft.id));
        
        // Select another NFT if available
        const remainingNfts = nfts.filter(n => n.id !== nft.id);
        if (remainingNfts.length > 0) {
          setSelectedNft(remainingNfts[0]);
          return handleSelectNft(remainingNfts[0]);
        } else {
          setSelectedNft(null);
          setNftDetails(null);
          setDetailsLoading(false);
          userInteracting.current = false;
          return;
        }
      });
      
      // Fetch the NFT details
      const details = await safeRequest(
        () => nftContract.getLockDetails(nft.id),
        `Error fetching details for NFT #${nft.id}`
      );
      
      // Format the details
      const formattedDetails = {
        xenAmount: ethers.utils.formatUnits(details.xenAmount, 18),
        maturityTs: new Date(details.maturityTs.toNumber() * 1000).toLocaleString(),
        maturityTimestamp: details.maturityTs.toNumber(),
        ampSnapshot: details.ampSnapshot.toNumber(),
        termDays: details.termDays.toNumber(),
        claimed: details.claimed,
        rewardAmount: ethers.utils.formatUnits(details.rewardAmount, 18),
        baseMint: ethers.utils.formatUnits(details.baseMint, 18),
        owner: details.owner
      };
      
      setNftDetails(formattedDetails);
    } catch (error) {
      console.error('Error loading NFT details:', error);
      // Only show toast if it's not a "non-existent token" error
      if (!error.message?.includes("nonexistent token")) {
        toast.error('Failed to load NFT details. Please try again.');
      }
    } finally {
      setDetailsLoading(false);
      userInteracting.current = false;
    }
  };

  // Calculate if an NFT is claimable
  const isNftClaimable = () => {
    if (!nftDetails) return false;
    
    return (
      !nftDetails.claimed &&
      nftDetails.maturityTimestamp <= Math.floor(Date.now() / 1000)
    );
  };

  // Calculate NFT status
  const getNftStatus = () => {
    if (!nftDetails) return 'Unknown';
    
    if (nftDetails.claimed) return 'Claimed';
    if (nftDetails.maturityTimestamp > Math.floor(Date.now() / 1000)) {
      return 'Locked';
    }
    return 'Ready to Claim';
  };

  // Render the time remaining until maturity
  const renderTimeRemaining = () => {
    if (!nftDetails || nftDetails.claimed) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const maturityTs = nftDetails.maturityTimestamp;
    
    if (maturityTs <= now) {
      return null;
    }
    
    const secondsRemaining = maturityTs - now;
    const days = Math.floor(secondsRemaining / (24 * 60 * 60));
    const hours = Math.floor((secondsRemaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((secondsRemaining % (60 * 60)) / 60);
    
    return (
      <span className="time-remaining">
        Time remaining: {days}d {hours}h {minutes}m
      </span>
    );
  };

  // Handle emergency stake end with improved error handling
  const handleEmergencyEnd = async () => {
    if (!xburnMinterContract || !selectedNft || !signer) return;
    
    try {
      // Set operation in progress to prevent auto-refresh
      operationInProgress.current = true;
      userInteracting.current = true;
      setEndingStake(true);
      
      const tx = await safeRequest(
        () => xburnMinterContract.connect(signer).emergencyEnd(selectedNft.id),
        'Error ending stake'
      );
      
      // Display a message explaining that the NFT will be burned
      toast.success('Transaction submitted! Your NFT will be burned when ended.', { duration: 5000 });
      
      await tx.wait();
      
      // Show success message
      toast.success('Successfully ended stake! You received base XBURN without amplifier bonus. Your NFT has been burned.', { duration: 5000 });
      
      // Remove this NFT from the list without full refresh
      setNfts(prevNfts => prevNfts.filter(nft => nft.id !== selectedNft.id));
      
      // Select another NFT if available
      const remainingNfts = nfts.filter(nft => nft.id !== selectedNft.id);
      if (remainingNfts.length > 0) {
        await handleSelectNft(remainingNfts[0]);
      } else {
        setSelectedNft(null);
        setNftDetails(null);
        // Only refresh the list if we have no NFTs left
        setTimeout(() => {
          loadUserNFTs(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error ending stake:', error);
      toast.error(error.reason || 'Failed to end stake');
    } finally {
      setEndingStake(false);
      setShowEndConfirmation(false);
      // Reset operation in progress
      operationInProgress.current = false;
      // Reset user interacting after a delay
      setTimeout(() => {
        userInteracting.current = false;
      }, 1000);
    }
  };

  // Update the paginationInfo string to use PER_PAGE
  const paginationInfo = `Showing ${currentPage > 0 ? currentPage * PER_PAGE + 1 : nfts.length > 0 ? 1 : 0} - ${Math.min((currentPage + 1) * PER_PAGE, nfts.length)} of ${nfts.length} NFTs`;

  return (
    <div className="nft-panel">
      {!account ? (
        <div className="connect-prompt">
          <p>Please connect your wallet to view your NFTs</p>
        </div>
      ) : loading && initialLoad ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading your NFTs...</p>
          <button 
            className="retry-button"
            onClick={() => {
              setInitialLoad(true);
              loadUserNFTs(true);
            }}
          >
            Retry Loading NFTs
          </button>
        </div>
      ) : nfts.length === 0 ? (
        <div className="no-nfts">
          <p>No XBURN NFTs in Your Collection</p>
          <p>Stake XEN tokens to earn unique XBURN NFTs representing your positions</p>
        </div>
      ) : (
        <>
          {/* NFT Picker moved to top */}
          <div className="nft-picker-top">
            <select
              className="nft-selector"
              value={selectedNft ? selectedNft.id : ''}
              onChange={(e) => {
                const selectedId = parseInt(e.target.value);
                const nft = nfts.find(n => n.id === selectedId);
                if (nft) {
                  userInteracting.current = true;
                  handleSelectNft(nft);
                }
              }}
            >
              <option value="" disabled={selectedNft !== null}>Select NFT</option>
              {nfts.map(nft => (
                <option key={nft.id} value={nft.id}>
                  XBURN NFT #{nft.id}
                </option>
              ))}
            </select>
          </div>

          <div className="nft-content">
            {/* NFT display */}
            <div className="nft-image-section">
              <div className="nft-image-container">
                {selectedNft && selectedNft.image ? (
                  <img
                    src={selectedNft.image} 
                    alt={selectedNft.name} 
                    className="nft-image"
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.src = '/xenburn.png';
                      e.target.style.display = 'block';
                    }}
                  />
                ) : selectedNft && selectedNft.loadFailed ? (
                  <div className="nft-error-placeholder">
                    <span className="error-icon">⚠️</span>
                    <p>Failed to load NFT image</p>
                    <p>Please reload the page to try again</p>
                  </div>
                ) : (
                  <div className="nft-error-placeholder">
                    <span className="error-icon">⚠️</span>
                    <p>NFT may have been burned or claimed</p>
                    <p>This happens when rewards are claimed</p>
                  </div>
                )}
              </div>
            </div>

            {/* NFT Stats */}
            {selectedNft && (detailsLoading ? (
              <div className="nft-stats-section loading-details">
                <div className="details-loading-indicator">Loading NFT details...</div>
              </div>
            ) : nftDetails ? (
              <div className="nft-stats-section">
                {renderTimeRemaining()}
                
                <div className="nft-attributes">
                  <div className="attribute">
                    <span className="attribute-label">Status:</span>
                    <span className="attribute-value">
                      <span className={`status-${getNftStatus().toLowerCase().replace(/\s+/g, '-')}`}>
                        {getNftStatus()}
                      </span>
                    </span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-label">XEN Burned:</span>
                    <span className="attribute-value">{formatNumber(nftDetails.xenAmount)} XEN</span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-label">Base Mint:</span>
                    <span className="attribute-value">{formatNumber(nftDetails.baseMint)} XBURN</span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-label">Amplifier:</span>
                    <span className="attribute-value">{(nftDetails.ampSnapshot / 30).toFixed(2)}%</span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-label">Term:</span>
                    <span className="attribute-value">{nftDetails.termDays} days</span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-label">Maturity:</span>
                    <span className="attribute-value">{nftDetails.maturityTs}</span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-label">Total Reward:</span>
                    <span className="attribute-value">{formatNumber(nftDetails.rewardAmount)} XBURN</span>
                  </div>
                </div>
                
                {/* Claim button */}
                {isNftClaimable() && (
                  <button 
                    className="claim-button" 
                    onClick={() => {
                      userInteracting.current = true;
                      handleClaim();
                    }}
                    disabled={claiming || endingStake}
                  >
                    {claiming ? 'Claiming...' : 'Claim Rewards'}
                  </button>
                )}
                
                {/* Emergency End Stake Button - Only show if NFT is not claimed */}
                {nftDetails && !nftDetails.claimed && (
                  <button 
                    className="emergency-end-button" 
                    onClick={() => {
                      userInteracting.current = true;
                      setShowEndConfirmation(true);
                    }}
                    disabled={claiming || endingStake}
                  >
                    {endingStake ? 'Processing...' : 'End Stake Early'}
                  </button>
                )}
              </div>
            ) : (
              <div className="nft-stats-section">
                <p>No details available for this NFT</p>
              </div>
            ))}
          </div>

          {/* Confirmation Modal for Emergency End */}
          {showEndConfirmation && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>⚠️ Warning: Emergency End Stake ⚠️</h3>
                <p>You are about to END your stake early!</p>
                <div className="warning-details">
                  <p>By ending your stake early:</p>
                  <ul>
                    <li>You will ONLY receive the BASE XBURN amount: <strong>{formatNumber(nftDetails?.baseMint || 0)} XBURN</strong></li>
                    <li>You will NOT receive ANY amplifier bonus</li>
                    <li>Your NFT will be burned and this action CANNOT be undone</li>
                  </ul>
                </div>
                <div className="modal-actions">
                  <button 
                    className="modal-cancel-button" 
                    onClick={() => {
                      setShowEndConfirmation(false);
                      userInteracting.current = false;
                    }}
                    disabled={endingStake}
                  >
                    Cancel
                  </button>
                  <button 
                    className="modal-confirm-button" 
                    onClick={handleEmergencyEnd}
                    disabled={endingStake}
                  >
                    {endingStake ? 'Processing...' : 'Confirm End Stake'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={handlePrevPage}
                disabled={currentPage === 0 || loading}
                className="pagination-btn"
              >
                Previous
              </button>
              <span className="page-info">
                {paginationInfo}
              </span>
              <button 
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1 || loading}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}; 