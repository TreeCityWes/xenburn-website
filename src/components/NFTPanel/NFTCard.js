import LoadingIndicator from '../common/LoadingIndicator';
import useTransactionState, { TX_STATE } from '../../hooks/useTransactionState';

const NFTCard = ({ nft, onBurnSuccess }) => {
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
  
  return (
    <div className="nft-card">
      {/* ... existing NFT display ... */}
      
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

export default NFTCard; 