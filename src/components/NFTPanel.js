import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import toast from 'react-hot-toast';
import './NFTPanel.css';

// Define PER_PAGE as a constant
const PER_PAGE = 10;

export const NFTPanel = () => {
  // Properly destructure nftContract and xburnMinterContract from useWallet
  const { account, signer, nftContract, xburnMinterContract } = useWallet();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNft, setSelectedNft] = useState(null);
  const [nftDetails, setNftDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [endingStake, setEndingStake] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);

  // Load user's NFTs
  useEffect(() => {
    const loadUserNFTs = async () => {
      if (!account || !nftContract) return;

      try {
        setLoading(true);
        // Fetch the updated list of NFTs
        const { tokenIds, totalPages: pages } = await nftContract.getAllUserLocks(account, currentPage, PER_PAGE);
        setTotalPages(pages.toNumber());
        
        // If no NFTs left, clear everything
        if (tokenIds.length === 0) {
          setNfts([]);
          setSelectedNft(null);
          setNftDetails(null);
          setLoading(false);
          return;
        }
        
        // Format the NFTs data
        const formattedNfts = await Promise.all(
          tokenIds.map(async (tokenId) => {
            const tokenIdNumber = tokenId.toNumber();
            try {
              const uri = await nftContract.tokenURI(tokenIdNumber);
              // The URI is a base64 encoded JSON string
              const jsonString = atob(uri.substring(29)); // Remove 'data:application/json;base64,'
              const metadata = JSON.parse(jsonString);
              return {
                id: tokenIdNumber,
                image: metadata.image,
                name: metadata.name || `XBURN Lock Position #${tokenIdNumber}`,
                attributes: metadata.attributes
              };
            } catch (error) {
              console.error(`Error loading NFT ${tokenIdNumber}:`, error);
              return {
                id: tokenIdNumber,
                image: null,
                name: `XBURN Lock Position #${tokenIdNumber}`,
                attributes: []
              };
            }
          })
        );
        
        setNfts(formattedNfts);
        
        // Select the first NFT if none is selected
        if (formattedNfts.length > 0) {
          const firstNft = formattedNfts[0];
          setSelectedNft(firstNft);
          
          try {
            const details = await nftContract.getLockDetails(firstNft.id);
            
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
          }
        }
      } catch (error) {
        console.error('Error loading NFTs:', error);
        toast.error('Failed to load your NFTs');
      } finally {
        setLoading(false);
      }
    };

    if (account && signer) {
      loadUserNFTs();
    } else {
      setNfts([]);
      setSelectedNft(null);
    }
  }, [account, signer, nftContract, currentPage]);

  // Simplify the refreshNFTList function to avoid potential infinite loops
  const refreshNFTList = useCallback(async () => {
    if (!account || !nftContract) return;
    
    try {
      setLoading(true);
      
      // Fetch the updated list of NFTs
      const { tokenIds, totalPages: pages } = await nftContract.getAllUserLocks(account, currentPage, PER_PAGE);
      setTotalPages(pages.toNumber());
      
      // If no NFTs left, clear everything
      if (tokenIds.length === 0) {
        setNfts([]);
        setSelectedNft(null);
        setNftDetails(null);
        setLoading(false);
        return;
      }
      
      // Format the NFTs data
      const formattedNfts = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const tokenIdNumber = tokenId.toNumber();
          try {
            const uri = await nftContract.tokenURI(tokenIdNumber);
            // The URI is a base64 encoded JSON string
            const jsonString = atob(uri.substring(29)); // Remove 'data:application/json;base64,'
            const metadata = JSON.parse(jsonString);
            return {
              id: tokenIdNumber,
              image: metadata.image,
              name: metadata.name || `XBURN Lock Position #${tokenIdNumber}`,
              attributes: metadata.attributes
            };
          } catch (error) {
            console.error(`Error loading NFT ${tokenIdNumber}:`, error);
            return {
              id: tokenIdNumber,
              image: null,
              name: `XBURN Lock Position #${tokenIdNumber}`,
              attributes: []
            };
          }
        })
      );
      
      setNfts(formattedNfts);
      
      // Select the first NFT in the updated list
      if (formattedNfts.length > 0) {
        const firstNft = formattedNfts[0];
        setSelectedNft(firstNft);
        
        try {
          const details = await nftContract.getLockDetails(firstNft.id);
          
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
        }
      }
    } catch (error) {
      console.error('Error refreshing NFTs:', error);
      toast.error('Failed to update your NFTs list');
    } finally {
      setLoading(false);
    }
  }, [account, nftContract, currentPage]);

  // Format large numbers with commas
  const formatNumber = (num) => {
    if (!num) return "0";
    return parseFloat(num).toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  };

  // Handle claiming rewards
  const handleClaim = async () => {
    if (!xburnMinterContract || !selectedNft || !signer) return;
    
    // Check if NFT is mature
    if (nftDetails && nftDetails.maturityTimestamp > Math.floor(Date.now() / 1000)) {
      toast.error('This NFT is not yet mature and cannot be claimed');
      return;
    }

    try {
      setClaiming(true);
      const tx = await xburnMinterContract.connect(signer).claimLockedXBURN(selectedNft.id);
      
      // Display a message explaining that the NFT will be burned
      toast.success('Transaction submitted! Your NFT will be burned when claimed.', { duration: 5000 });
      
      await tx.wait();
      
      // Clear selectedNft before refreshing to prevent flickering
      setSelectedNft(null);
      setNftDetails(null);
      
      // Show success message and add a delay before refresh
      toast.success('Successfully claimed rewards! Your NFT has been burned.', { duration: 5000 });
      
      // Delay refresh to allow user to see the message
      setTimeout(() => {
        refreshNFTList();
      }, 1000);
    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast.error(error.reason || 'Failed to claim rewards');
    } finally {
      setClaiming(false);
    }
  };

  // Handle pagination with simpler implementation
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  };

  // When the page changes, refresh the NFT list
  useEffect(() => {
    if (account && nftContract) {
      refreshNFTList();
    }
  }, [currentPage, refreshNFTList, account, nftContract]);

  // Handle NFT selection
  const handleSelectNft = async (nft) => {
    setSelectedNft(nft);
    setLoading(true);
    
    try {
      // First, check if the NFT still exists by checking if it has an owner
      try {
        await nftContract.ownerOf(nft.id);
      } catch (error) {
        // If ownerOf throws an error, the NFT doesn't exist anymore
        console.log(`NFT ${nft.id} no longer exists, refreshing list`);
        await refreshNFTList();
        return;
      }
      
      const details = await nftContract.getLockDetails(nft.id);
      
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
      if (!error.message.includes("nonexistent token")) {
        toast.error('Failed to load NFT details');
      } else {
        // If it's a nonexistent token error, refresh the NFT list
        await refreshNFTList();
      }
    } finally {
      setLoading(false);
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

  // Handle emergency stake end
  const handleEmergencyEnd = async () => {
    if (!xburnMinterContract || !selectedNft || !signer) return;
    
    try {
      setEndingStake(true);
      const tx = await xburnMinterContract.connect(signer).emergencyEnd(selectedNft.id);
      
      // Display a message explaining that the NFT will be burned
      toast.success('Transaction submitted! Your NFT will be burned when ended.', { duration: 5000 });
      
      await tx.wait();
      
      // Clear selectedNft before refreshing to prevent flickering
      setSelectedNft(null);
      setNftDetails(null);
      
      // Show success message and add a delay before refresh
      toast.success('Successfully ended stake! You received base XBURN without amplifier bonus. Your NFT has been burned.', { duration: 5000 });
      
      // Delay refresh to allow user to see the message
      setTimeout(() => {
        refreshNFTList();
      }, 1000);
    } catch (error) {
      console.error('Error ending stake:', error);
      toast.error(error.reason || 'Failed to end stake');
    } finally {
      setEndingStake(false);
      setShowEndConfirmation(false);
    }
  };

  // Update the paginationInfo string to use PER_PAGE
  const paginationInfo = `Showing ${currentPage > 0 ? currentPage * PER_PAGE + 1 : 0} - ${Math.min((currentPage + 1) * PER_PAGE, nfts.length)} of ${nfts.length} NFTs`;

  return (
    <div className="nft-panel">
      {!account ? (
        <div className="connect-prompt">
          <p>Please connect your wallet to view your NFTs</p>
        </div>
      ) : loading ? (
        <div className="loading">Loading your NFTs...</div>
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
                if (nft) handleSelectNft(nft);
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
                      // Hide the image on error
                      e.target.style.display = 'none';
                      
                      // If we get an error loading the image, check if the NFT still exists
                      if (nftContract && selectedNft) {
                        nftContract.ownerOf(selectedNft.id)
                          .then(owner => {
                            // NFT still exists but image is broken, show fallback
                            console.log('NFT exists but image is broken, showing fallback');
                            e.target.src = '/xenburn.png';
                            e.target.style.display = 'block';
                          })
                          .catch(error => {
                            // NFT no longer exists, trigger a refresh
                            console.log(`NFT ${selectedNft.id} no longer exists, refreshing list`);
                            setTimeout(() => refreshNFTList(), 500);
                          });
                      }
                    }}
                  />
                ) : (
                  <div className="nft-error-placeholder">
                    <span className="error-icon">⚠️</span>
                    <p>NFT may have been burned or claimed</p>
                    <p>This happens when rewards are claimed</p>
                    <button 
                      className="action-button" 
                      onClick={() => {
                        setLoading(true);
                        setTimeout(() => refreshNFTList(), 100);
                      }}
                      disabled={loading}
                    >
                      {loading ? 'Refreshing...' : 'Refresh NFT List'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* NFT Stats */}
            {selectedNft && nftDetails && (
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
                    onClick={handleClaim}
                    disabled={claiming || endingStake}
                  >
                    {claiming ? 'Claiming...' : 'Claim Rewards'}
                  </button>
                )}
                
                {/* Emergency End Stake Button - Only show if NFT is not claimed */}
                {nftDetails && !nftDetails.claimed && (
                  <button 
                    className="emergency-end-button" 
                    onClick={() => setShowEndConfirmation(true)}
                    disabled={claiming || endingStake}
                  >
                    {endingStake ? 'Processing...' : 'End Stake Early'}
                  </button>
                )}
              </div>
            )}
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
                    onClick={() => setShowEndConfirmation(false)}
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
                disabled={currentPage === 0}
                className="pagination-btn"
              >
                Previous
              </button>
              <span className="page-info">
                {paginationInfo}
              </span>
              <button 
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
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