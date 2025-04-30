import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { useWallet } from '../../context/WalletContext';
import { useGlobalData } from '../../context/GlobalDataContext';
import { formatDecimals } from '../../utils/tokenUtils';
import './NFTPanel.css';

export const NFTPanel = () => {
  const { account, isConnected, nftContract: walletNftContract, getCurrentAddresses, selectedChainId } = useWallet();
  const { nfts, loadingNFTs, nftError, totalNFTs, emergencyEndNFT, claimNFT, loadNFTById } = useGlobalData();
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState({ type: null, nft: null });
  const [nftSvg, setNftSvg] = useState(null);
  const [loadingSvg, setLoadingSvg] = useState(false);
  const [loadingSelectedDetails, setLoadingSelectedDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNftSvg = useCallback(async (tokenId) => {
    if (!tokenId || !walletNftContract || !getCurrentAddresses) return;
    
    setLoadingSvg(true);
    setNftSvg(null);
    
    const currentAddresses = getCurrentAddresses();
    if (!currentAddresses || !currentAddresses.XBURN_NFT_ADDRESS) {
        console.warn("fetchNftSvg: Missing NFT contract address for this network.");
        setLoadingSvg(false);
        return;
    }

    // Check if contract address matches the expected network address
    if (!walletNftContract.address || 
        walletNftContract.address.toLowerCase() !== currentAddresses.XBURN_NFT_ADDRESS.toLowerCase()) {
        console.warn(`fetchNftSvg: Contract address mismatch. Expected ${currentAddresses.XBURN_NFT_ADDRESS}, got ${walletNftContract.address}`);
        setLoadingSvg(false);
        return;
    }

    try {
      console.log(`Fetching SVG for token ID: ${tokenId} via contract ${walletNftContract.address}`);
      const tokenURI = await walletNftContract.tokenURI(tokenId);
      
      if (tokenURI.startsWith('data:application/json;base64,')) {
        const base64Data = tokenURI.split(',')[1];
        const jsonString = atob(base64Data);
        const metadata = JSON.parse(jsonString);
        if (metadata.image && metadata.image.startsWith('data:image/svg+xml;base64,')) {
          const svgBase64 = metadata.image.split(',')[1];
          setNftSvg(atob(svgBase64));
        } else { console.warn('SVG not found in metadata image field'); setNftSvg(null); }
      } else { console.warn('Token URI not in expected format'); setNftSvg(null); }
    } catch (error) {
      console.error("Error fetching NFT SVG:", error);
      setNftSvg(null);
    } finally {
       setLoadingSvg(false);
    }
  }, [walletNftContract, getCurrentAddresses]);

  // Verify contract addresses when chain changes
  useEffect(() => {
    if (walletNftContract && getCurrentAddresses) {
      const currentAddresses = getCurrentAddresses();
      if (currentAddresses && currentAddresses.XBURN_NFT_ADDRESS && 
          walletNftContract.address.toLowerCase() !== currentAddresses.XBURN_NFT_ADDRESS.toLowerCase()) {
        console.warn("NFT contract address doesn't match selected chain's address");
        // Reset states when chain changes
        setSelectedNFT(null);
        setSelectedTokenId(null);
        setNftSvg(null);
      }
    }
  }, [selectedChainId, walletNftContract, getCurrentAddresses]);

  useEffect(() => {
    if (isConnected && nfts && nfts.length > 0 && !selectedTokenId) {
      console.log("NFTPanel: Setting first NFT as selected", nfts[0].tokenId);
      const firstNft = nfts[0];
      setSelectedNFT(firstNft);
      setSelectedTokenId(firstNft.tokenId);
      fetchNftSvg(firstNft.tokenId);
    } else if (!isConnected || (nfts && nfts.length === 0)) {
       setSelectedNFT(null);
       setSelectedTokenId(null);
       setNftSvg(null);
     }
  }, [nfts, isConnected, selectedTokenId, fetchNftSvg]);

  const handleTokenSelect = useCallback(async (tokenId) => {
    if (!tokenId || tokenId === selectedTokenId) return;
    
    setLoadingSelectedDetails(true);
    setSelectedTokenId(tokenId);
    setNftSvg(null); 
    setSelectedNFT(null); 
    
    try {
      const nftDetails = await loadNFTById(tokenId); 
      if (nftDetails) {
        setSelectedNFT(nftDetails);
        fetchNftSvg(tokenId); 
      } else {
        toast.error(`Failed to load details for NFT #${tokenId}`);
        setSelectedTokenId(selectedNFT?.tokenId || null); 
      }
    } catch (error) {
      console.error("Error selecting NFT:", error);
      toast.error(`Error loading NFT #${tokenId}`);
      setSelectedTokenId(selectedNFT?.tokenId || null); 
    } finally {
      setLoadingSelectedDetails(false);
    }
  }, [selectedTokenId, loadNFTById, fetchNftSvg, selectedNFT?.tokenId]);

  const handleNFTClick = (nft) => {
    const explorerUrl = nft.blockscoutUrl || `https://etherscan.io/nft/${nft.contractAddress}/${nft.id}`;
    if (explorerUrl) {
       window.open(explorerUrl, '_blank');
    } else {
       console.warn("Explorer URL not found on NFT object");
    }
  };

  const initiateEmergencyEnd = (nft) => {
    setConfirmingAction({ type: 'emergency', nft });
  };

  const initiateClaim = (nft) => {
    setConfirmingAction({ type: 'claim', nft });
  };

  const handleConfirmAction = async () => {
    if (!confirmingAction.nft || !confirmingAction.type) return;
    const { type, nft } = confirmingAction;
    const tokenIdToActOn = nft.tokenId; 
    if (!tokenIdToActOn) {
        toast.error("Missing Token ID for action.");
        setConfirmingAction({ type: null, nft: null });
        return;
    }
    setConfirmingAction({ type: 'loading', nft: nft });
    try {
      if (type === 'emergency') {
        await emergencyEndNFT(tokenIdToActOn);
        toast.success(`Emergency end initiated for NFT #${tokenIdToActOn}`);
      } else if (type === 'claim') {
        await claimNFT(tokenIdToActOn);
        toast.success(`Claim initiated for NFT #${tokenIdToActOn}`);
      }
      const updatedDetails = await loadNFTById(tokenIdToActOn);
      if (updatedDetails) setSelectedNFT(updatedDetails);
      setConfirmingAction({ type: null, nft: null }); 
    } catch (error) {
      toast.error(`Failed to ${type} NFT: ${error.message || 'Unknown error'}`);
      console.error(`Error during ${type} NFT:`, error);
      setConfirmingAction({ type: type, nft: nft }); 
    } 
  };

  const handleCancelAction = () => {
    setConfirmingAction({ type: null, nft: null });
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

  if (!isConnected || !account) {
    return (
      <div className="nft-panel">
        <div className="nft-message">Please connect your wallet to view your NFTs.</div>
      </div>
    );
  }

  if (loadingNFTs && (!nfts || nfts.length === 0)) {
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
        <div className="error-message">Error loading NFTs: {nftError}</div>
      </div>
    );
  }

  if (!loadingNFTs && totalNFTs === 0) {
    return (
      <div className="nft-panel">
        <div className="nft-message">No XBURN NFTs found in your wallet on this network.</div>
      </div>
    );
  }

  if (!loadingNFTs && totalNFTs > 0 && (!nfts || nfts.length === 0)) {
    return (
      <div className="nft-panel">
        <div className="error-message">Could not load NFT list details. Please try refreshing.</div>
      </div>
    );
  }

  return (
    <div className="nft-container">
      <h2>Your XBURN NFTs ({totalNFTs > 0 ? totalNFTs : '...'})</h2>
      
      {nfts && nfts.length > 0 && nfts[0]?.allTokenIds && (
          <div className="nft-selector-container">
            <label htmlFor="nft-selector">Select NFT:</label>
            <select 
              id="nft-selector" 
              className="nft-selector"
              value={selectedTokenId || ''}
              onChange={(e) => handleTokenSelect(e.target.value)}
              disabled={loadingSelectedDetails}
            >
              {nfts[0].allTokenIds.map(tokenId => (
                <option key={tokenId} value={tokenId}>
                  NFT #{tokenId}
                </option>
              ))}
            </select>
            {loadingSelectedDetails && <div className="loading-spinner-small"></div>}
          </div>
      )}

      {loadingSelectedDetails ? (
           <div className="loading-container"><div className="loading-spinner" /><div className="loading-text">Loading NFT Details...</div></div>
      ) : selectedNFT && selectedNFT.details ? (
         <div className="nft-details-container"> 
           <h3>NFT #{selectedNFT.tokenId} Details</h3>
           <div className="nft-presentation">
              <div className="nft-image-container" title={`View NFT #${selectedNFT.tokenId} on explorer`}>
                {loadingSvg ? (
                   <div className="loading-spinner"></div>
                ) : nftSvg ? (
                    <div dangerouslySetInnerHTML={{ __html: nftSvg }} />
                 ) : (
                    <div className="nft-placeholder-image">?</div> 
                 )}
             </div>
             <div className="nft-details">
                   <div className="detail-row">
                    <span className="detail-label">XEN Burned:</span>
                    <span className="detail-value">{formatDecimals(ethers.utils.formatUnits(selectedNFT.details?.xenAmount || '0', 18), { precision: 2 })}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Term:</span>
                    <span className="detail-value">{selectedNFT.details?.termDays} Days</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Matures:</span>
                    <span className="detail-value">{new Date(parseInt(selectedNFT.details?.maturityTs || '0') * 1000).toLocaleDateString()}</span>
                  </div>
                   <div className="detail-row">
                    <span className="detail-label">Claimable:</span>
                    <span className="detail-value">{selectedNFT.details?.isClaimable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Claimed:</span>
                    <span className="detail-value">{selectedNFT.details?.claimed ? 'Yes' : 'No'}</span>
                  </div>
             </div>
           </div>
            <div className="nft-actions">
                <button
                    className="claim-button"
                    disabled={!selectedNFT.details?.isClaimable || selectedNFT.details?.claimed || confirmingAction.type === 'loading'}
                    onClick={(e) => { e.stopPropagation(); initiateClaim(selectedNFT); }}
                    title={selectedNFT.details?.claimed ? "Already Claimed" : !selectedNFT.details?.isClaimable ? "Not mature yet" : "Claim XBURN"}
                >
                    {selectedNFT.details?.claimed ? 'Claimed' : 'Claim'}
                </button>
                <button
                    className="emergency-end-button"
                    disabled={selectedNFT.details?.claimed || confirmingAction.type === 'loading'}
                    onClick={(e) => { e.stopPropagation(); initiateEmergencyEnd(selectedNFT); }}
                    title={selectedNFT.details?.claimed ? "Cannot emergency end claimed NFT" : "Emergency End Lock (Forfeit Rewards)"}
                >
                    Emergency End
                </button>
            </div>
         </div>
      ) : !loadingNFTs && nfts && nfts.length > 0 && (
          <div className="nft-message">Select an NFT from the list above to view details.</div>
      )}
     
      {confirmingAction.type && confirmingAction.nft && (
        <div className="confirmation-modal-backdrop" onClick={handleCancelAction}>
           <div className="confirmation-modal-content" onClick={e => e.stopPropagation()}> 
                 <h3>Confirm Action</h3>
                {confirmingAction.type === 'loading' ? (
                    <div className="loading-container">
                        <div className="loading-spinner" />
                        <p>Processing transaction...</p>
                    </div>
                ) : (
                    <>
                        <p>Are you sure you want to 
                           {confirmingAction.type === 'emergency' ? 
                           <strong> emergency end (forfeit rewards for)</strong> : 
                           <strong> claim rewards for</strong>} NFT #{confirmingAction.nft.tokenId}?
                        </p>
                        {confirmingAction.type === 'emergency' && (
                          <p className='warning-text'>Warning: Emergency ending will forfeit any accrued XBURN rewards.</p>
                        )}
                         <div className="confirmation-buttons">
                            <button onClick={handleConfirmAction} className="confirm-yes">
                                Yes, Proceed
                            </button>
                            <button onClick={handleCancelAction} className="confirm-no">
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={handlePrevPage} 
            disabled={currentPage === 1 || loadingNFTs || loadingSelectedDetails}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={handleNextPage} 
            disabled={currentPage === totalPages || loadingNFTs || loadingSelectedDetails}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}; 