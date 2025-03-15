export const XENFT_BURN_ABI = [
  "function getNFTDetails(uint256 tokenId) external view returns (tuple(uint256 term, uint256 maturityTs, uint256 xenBurned, uint256 multiplier, bool isEnded))",
  "function claimRewards(uint256 tokenId) external",
  "function emergencyEnd(uint256 tokenId) external",
  "function endRewards(uint256 tokenId) external",
  "function getAccumulationProgress() external view returns (tuple(uint256 accumulated, uint256 threshold, uint256 percentage))",
  "function getGlobalStats() external view returns (tuple(uint256 currentAMP, uint256 daysSinceLaunch, uint256 totalBurnedXEN, uint256 totalMintedXBURN, uint256 ampDecayDaysLeft))"
]; 