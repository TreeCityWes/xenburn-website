import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';
// Removed unused ABIs
import { XEN_ABI } from '../constants/addresses'; 
// Import getChainById and the specific sepolia chain object
import { getChainById, sepolia as sepoliaChain, base } from '../constants/chains'; 

const GlobalDataContext = createContext();

// Constants for pagination
const PER_PAGE = 10;

// Removed ERC20_ABI as it's defined and used in WalletContext
// const ERC20_ABI = [ ... ];

export const GlobalDataProvider = ({ children }) => {
  // Get multi-chain aware wallet context values
  const { 
    account, 
    provider, 
    selectedChainId, 
    getCurrentAddresses, // Function to get addresses for the selected chain
    isConnected,
    // Get direct balance values from WalletContext (already network-aware)
    ethBalance, 
    xenBalance, 
    xburnBalance, 
    xenBalanceRaw, 
    xburnBalanceRaw, 
    xenApprovalRaw, 
    xburnApprovalRaw, 
    // Get network-aware contract instances directly from WalletContext
    nftContract, 
    xburnMinterContract,
    isLoadingContracts,
    fetchBalances // Add this to explicitly trigger balance updates
  } = useWallet();
  
  // NFT data state (remains the same)
  const [nfts, setNfts] = useState([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [nftError, setNftError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNFTs, setTotalNFTs] = useState(0);

  // Stats state (remains the same)
  const [stats, setStats] = useState({
    loading: false,
    error: null,
    data: {
      totalXenBurned: '0',
      totalXburnMinted: '0',
      totalXburnBurned: '0',
      globalBurnRank: '0',
      userXenBurned: '0',
      userXburnMinted: '0',
      userXburnBurned: '0'
    },
    lastFetched: 0
  });

  // DexScreener data state (remains the same)
  const [xenPrice, setXenPrice] = useState('0');
  const [xburnPrice, setXburnPrice] = useState('0');
  const [poolTvl, setPoolTvl] = useState('0');
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState(null);

  // External Stats state (removed unused setter)
  const [externalStats, setExternalStats] = useState({
    loading: false,
    error: null,
    data: null,
    lastFetched: 0
  });

  // --- Debounce Timestamps (removed unused external stats time) ---
  const lastNftFetchTime = useRef(0);
  const MIN_NFT_FETCH_INTERVAL = 1000;
  const lastStatsFetchTime = useRef(0);
  const MIN_STATS_FETCH_INTERVAL = 3000;
  const lastPriceFetchTime = useRef(0);
  const MIN_PRICE_FETCH_INTERVAL = 10000;
  const MIN_EXTERNAL_STATS_FETCH_INTERVAL = 30000;

  // --- Remove Contract Instance Getters --- 
  // We now get network-aware instances directly from useWallet()
  // const xenftContract = useCallback(...);
  // const xenftBurnContract = useCallback(...);
  // const xenContract = useCallback(...);
  // const xburnContract = useCallback(...);

  // --- Data Loading Functions (Updated for Multi-Chain) ---

  const loadNFTById = useCallback(async (tokenId) => {
    // Use contract instances directly from WalletContext
    const minterContract = xburnMinterContract;
    const nftContractInstance = nftContract;
    const currentAddresses = getCurrentAddresses();

    if (!account || !minterContract || !nftContractInstance || !tokenId || !currentAddresses) {
      console.log("Load NFT By ID: Skipped, dependencies not ready or addresses missing.");
      return null;
    }

    // Ensure the contracts being used are for the correct network
    // (WalletContext already ensures this, but good for clarity)
    if (minterContract.address !== currentAddresses.XBURN_MINTER_ADDRESS || 
        nftContractInstance.address !== currentAddresses.XBURN_NFT_ADDRESS) {
        console.warn("Load NFT By ID: Contract address mismatch detected. Waiting for context update?");
        return null; // Prevent using wrong contract
    }

    try {
      console.log(`Loading NFT ${tokenId} details on chain ${selectedChainId}`);
      
      // Check ownership
      try {
        const owner = await nftContractInstance.ownerOf(tokenId);
        if (owner.toLowerCase() !== account.toLowerCase()) {
          console.error("User does not own this NFT");
          return null;
        }
      } catch (error) {
        console.error("Error checking NFT ownership:", error);
        return null;
      }
      
      // Get details (assuming ABIs are consistent across networks)
      const details = await nftContractInstance.getLockDetails(tokenId);
      const tokenStats = await minterContract.getTokenStats(tokenId);
      
      return {
        tokenId: tokenId.toString(),
        details: {
          xenAmount: details.xenAmount.toString(),
          maturityTs: details.maturityTs.toString(),
          ampSnapshot: details.ampSnapshot.toString(),
          termDays: details.termDays.toString(),
          claimed: details.claimed,
          rewardAmount: details.rewardAmount.toString(),
          baseMint: details.baseMint.toString(),
          owner: details.owner,
          isClaimable: tokenStats.isClaimable
        }
      };
    } catch (error) {
      console.error(`Error loading NFT ${tokenId} on chain ${selectedChainId}:`, error);
      return null;
    }
    // Updated dependencies: contract instances, account, selectedChainId, getCurrentAddresses
  }, [account, selectedChainId, getCurrentAddresses, nftContract, xburnMinterContract]);

  const loadNFTs = useCallback(async (forceRefresh = false) => {
    if (!isConnected || !account || !provider || !xburnMinterContract || !nftContract || !selectedChainId) {
      console.log("Load NFTs: Skipped, not connected or dependencies not ready.");
      return;
    }

    const now = Date.now();
    if (!forceRefresh && now - lastNftFetchTime.current < MIN_NFT_FETCH_INTERVAL) return;
    lastNftFetchTime.current = now;

    // Use instances from WalletContext
    const minterContract = xburnMinterContract;
    const nftContractInstance = nftContract;
    const currentAddresses = getCurrentAddresses();

    if (!isConnected || !account || !minterContract || !nftContractInstance || !currentAddresses) {
      console.log("Load NFTs: Skipped, not connected or dependencies not ready.");
      setNfts([]); // Clear NFTs if not connected
      setTotalNFTs(0);
      setTotalPages(1);
      return;
    }

     // Address check
    if (minterContract.address !== currentAddresses.XBURN_MINTER_ADDRESS || 
        nftContractInstance.address !== currentAddresses.XBURN_NFT_ADDRESS) {
        console.warn("Load NFTs: Contract address mismatch detected. Waiting for context update?");
        setLoadingNFTs(false); // Don't proceed with wrong contracts
        return; 
    }

    setLoadingNFTs(true);
    setNftError(null);

    try {
      console.log(`Loading NFTs for account ${account} on chain ${selectedChainId}, page ${currentPage}`);
      
      // Get total NFTs for user
      let totalNFTsCount = 0;
      try {
        const balance = await nftContractInstance.balanceOf(account);
        totalNFTsCount = parseInt(balance.toString(), 10);
        setTotalNFTs(totalNFTsCount);
        setTotalPages(Math.ceil(totalNFTsCount / PER_PAGE) || 1);
      } catch (error) {
        console.error('Error getting NFT balance:', error);
        setNftError('Error getting NFT balance');
        setLoadingNFTs(false);
        return;
      }

      if (totalNFTsCount === 0) {
        setNfts([]);
        setLoadingNFTs(false);
        return;
      }

      // Fetch token IDs (adjust logic as needed, e.g., for pagination)
      const tokenIds = [];
      const promises = [];
      const limit = Math.min(totalNFTsCount, 20); // Example: limit fetch
      for (let i = 0; i < limit; i++) {
        promises.push(
          (async (index) => {
            try {
              // Assuming tokenOfOwnerByIndex exists and works consistently
              const tokenId = await nftContractInstance.tokenOfOwnerByIndex(account, index);
              return tokenId.toString();
            } catch (error) {
              console.error(`Error fetching token at index ${index}:`, error);
              return null;
            }
          })(i)
        );
      }
      
      const results = await Promise.all(promises);
      results.forEach(tokenId => { if (tokenId !== null) tokenIds.push(tokenId); });
      
      if (tokenIds.length === 0) {
        setNftError("Could not retrieve your NFT IDs.");
        setNfts([]);
        setLoadingNFTs(false);
        return;
      }
      
      // Load details for the first NFT (or handle pagination)
      const firstTokenId = tokenIds[0];
      const details = await loadNFTById(firstTokenId);
      
      if (details) {
        setNfts([{ ...details, allTokenIds: tokenIds }]);
      } else {
        setNftError("Error loading details for your first NFT.");
      }

    } catch (error) {
      console.error(`Error loading NFTs on chain ${selectedChainId}:`, error);
      setNftError(error.message);
    } finally {
      setLoadingNFTs(false);
    }
    // Updated dependencies
  }, [isConnected, account, provider, selectedChainId, getCurrentAddresses, nftContract, xburnMinterContract, currentPage, loadNFTById]);

  // Helper function to safely check contract method availability
  const contractHasMethod = useCallback((contract, methodName) => {
    return contract && typeof contract[methodName] === 'function';
  }, []);

  const loadStats = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (now - lastStatsFetchTime.current < MIN_STATS_FETCH_INTERVAL) return;
    lastStatsFetchTime.current = now;
    const minterContract = xburnMinterContract;
    const currentAddresses = getCurrentAddresses();
    
    console.log("Load Stats: Starting with contract", minterContract?.address, "for chain", selectedChainId);
    
    if (isLoadingContracts || !isConnected || !account || !provider || !minterContract || !currentAddresses || !currentAddresses.XBURN_MINTER_ADDRESS || !currentAddresses.XEN_ADDRESS || !currentAddresses.XBURN_TOKEN_ADDRESS) {
      console.warn("Load Stats: Skipped, dependencies not ready or contracts loading.", {isLoadingContracts, isConnected: isConnected});
      setStats(prev => ({ ...prev, loading: false, error: "Dependencies not ready or contracts loading" }));
      return;
    }
    
    // Ensure contract methods exist before proceeding
    if (!contractHasMethod(minterContract, 'getStats') || 
        !contractHasMethod(minterContract, 'getGlobalStats') || 
        !contractHasMethod(minterContract, 'globalBurnRank')) {
      console.error("Contract is missing required methods");
      setStats(prev => ({ ...prev, loading: false, error: "Contract interface mismatch" }));
      return;
    }
    
    // Address check to prevent using stale contract
    if (minterContract.address.toLowerCase() !== currentAddresses.XBURN_MINTER_ADDRESS.toLowerCase()) {
        console.warn(`Load Stats: Stale minter contract instance detected. Expected ${currentAddresses.XBURN_MINTER_ADDRESS}, got ${minterContract.address}`);
        setStats(prev => ({ ...prev, loading: false, error: "Contract mismatch" }));
        return; 
    }
    
    setStats(prev => ({ ...prev, loading: true, error: null }));
    
    // Initialize variables to hold results or defaults
    let statsData = null;
    let globalBurnRank = '0'; // Default to string '0'
    let globalStatsResult = ['0', '0', '0', '0', '0']; // Default array of string zeros
    let fetchError = null;

    try {
      console.log(`Loading stats for account ${account} on chain ${selectedChainId}`);
      const xenContract = new ethers.Contract(currentAddresses.XEN_ADDRESS, XEN_ABI, provider);
      
      // Fetch stats individually with separate try/catch
      try {
        statsData = await minterContract.getStats(account);
        console.log("Successfully fetched user stats:", statsData);
      } catch (error) {
        console.error("ERROR fetching user getStats:", error);
        fetchError = fetchError ? `${fetchError}, getStats` : 'getStats';
        // Don't fail if user stats fails, just set statsData to null
      }
      
      try {
        globalBurnRank = (await minterContract.globalBurnRank()).toString();
        console.log("Successfully fetched globalBurnRank:", globalBurnRank);
      } catch (error) {
        console.error("ERROR fetching globalBurnRank:", error);
        fetchError = fetchError ? `${fetchError}, globalBurnRank` : 'globalBurnRank';
        // Continue with default '0'
      }
      
      try {
        // Fetch global stats
        const result = await minterContract.getGlobalStats(); 
        if (selectedChainId === 1) { // Specifically log for Ethereum, using selectedChainId
            console.log("ETHEREUM DEBUG: Raw getGlobalStats() result:", result);
        }
        if (result && result.length >= 5) {
          globalStatsResult = result;
          console.log("Successfully fetched global stats:", result);
        } else {
          console.warn("getGlobalStats returned invalid result:", result);
        }
      } catch (error) {
        console.error("ERROR fetching getGlobalStats:", error);
        fetchError = fetchError ? `${fetchError}, getGlobalStats` : 'getGlobalStats';
        // Continue with defaults
      }
      
      // Extract global stats with safe access
      const currentAMP = globalStatsResult[0]?.toString() || '0';
      const daysSinceLaunch = globalStatsResult[1]?.toString() || '0';
      const totalBurnedXENGlobal = globalStatsResult[2]?.toString() || '0';
      const totalMintedXBURNGlobal = globalStatsResult[3]?.toString() || '0';
      const ampDecayDaysLeft = globalStatsResult[4]?.toString() || '0';
      
      // Log the extracted values for debugging
      console.log("Extracted global stats:", {
        currentAMP,
        daysSinceLaunch,
        totalBurnedXENGlobal,
        totalMintedXBURNGlobal,
        ampDecayDaysLeft
      });
      
      let xenSupply = '0';
      try {
         if (xenContract && typeof xenContract.totalSupply === 'function') {
           xenSupply = await xenContract.totalSupply(); 
           console.log("Successfully fetched XEN supply:", xenSupply.toString());
         }
      } catch (error) { 
        console.error("Error fetching XEN supply:", error); 
      }
      
      let xenInPool = '0'; let xburnInPool = '0';
      const lpAddress = currentAddresses.XBURN_XEN_LP_ADDRESS;
      if (lpAddress && lpAddress !== ethers.constants.AddressZero && !lpAddress.includes('PLACEHOLDER')) {
          try {
              const lpPairAbi = ["function getReserves() external view returns (uint112,uint112,uint32)", "function token0() external view returns (address)"];
              const lpPairContract = new ethers.Contract(lpAddress, lpPairAbi, provider);
              const token0 = await lpPairContract.token0();
              const reserves = await lpPairContract.getReserves();
              console.log("LP Reserves:", reserves.toString(), "token0:", token0);
              
              if (token0.toLowerCase() === currentAddresses.XEN_ADDRESS.toLowerCase()) {
                xenInPool = reserves[0]; xburnInPool = reserves[1];
              } else {
                xenInPool = reserves[1]; xburnInPool = reserves[0];
              }
              console.log("Pool data:", { xenInPool: xenInPool.toString(), xburnInPool: xburnInPool.toString() });
          } catch (error) {
              console.error(`Error fetching LP data for ${lpAddress} on chain ${selectedChainId}:`, error);
          }
      } else {
          console.log(`LP Address (${lpAddress}) invalid for chain ${selectedChainId}. Skipping pool data.`);
      }
      
      // Safely extract user-specific stats from statsData
      const userXenBurnedAmount = statsData?.userXenBurnedAmount || '0';
      const userXburnBurnedAmount = statsData?.userXburnBurnedAmount || '0';
      const globalXburnBurned = statsData?.globalXburnBurned || '0';
      const globalBurnPercentage = statsData?.globalBurnPercentage || '0';

      // Construct final stats using fetched data OR defaults
      const finalStatsData = {
        totalXenBurned: ethers.utils.formatUnits(totalBurnedXENGlobal || '0', 18),
        totalXburnMinted: ethers.utils.formatUnits(totalMintedXBURNGlobal || '0', 18),
        totalXburnBurned: ethers.utils.formatUnits(globalXburnBurned || '0', 18),
        globalBurnPercentage: ethers.utils.formatUnits(globalBurnPercentage || '0', 18),
        currentAMP: currentAMP?.toString() ?? '0', // Use nullish coalescing
        globalBurnRank: globalBurnRank, // Already a string or default '0'
        userXenBurned: ethers.utils.formatUnits(userXenBurnedAmount || '0', 18),
        userXburnMinted: '0', // No direct method to get this
        userXburnBurned: ethers.utils.formatUnits(userXburnBurnedAmount || '0', 18),
        xenSupply: ethers.utils.formatUnits(xenSupply || '0', 18),
        xenInPool: ethers.utils.formatUnits(xenInPool || '0', 18),
        xburnInPool: ethers.utils.formatUnits(xburnInPool || '0', 18),
        daysSinceLaunch: daysSinceLaunch?.toString() ?? '0',
        ampDecayDaysLeft: ampDecayDaysLeft?.toString() ?? '0',
      };
      
      console.log("Final formatted stats data:", finalStatsData);

      setStats({
        loading: false,
        // Set error message if any fetch failed, otherwise null
        error: fetchError ? `Partial stats failure (${fetchError})` : null, 
        data: finalStatsData,
        lastFetched: Date.now()
      });

    } catch (overallError) {
      // Catch any unexpected error during the process
      console.error(`Overall error loading stats on chain ${selectedChainId}:`, overallError);
      setStats(prev => ({ ...prev, loading: false, error: overallError.message || 'Unknown error loading stats' }));
    }
  // Dependencies: Only trigger when account, provider, chain, contract, or addresses change.
  }, [isConnected, account, provider, selectedChainId, getCurrentAddresses, xburnMinterContract, contractHasMethod, isLoadingContracts]);

  // DexScreener Data Loading - Fetches both XEN/Base and XBURN/XEN pairs
  const fetchDexScreenerData = useCallback(async (chainId = selectedChainId, forceRefresh = false) => {
    const now = Date.now();
    
    // Allow forced refresh to bypass the time check completely
    if (!forceRefresh && now - lastPriceFetchTime.current < MIN_PRICE_FETCH_INTERVAL) {
      console.log(`DexScreener: Skipping fetch - last fetch was ${(now - lastPriceFetchTime.current)/1000}s ago`);
      return;
    }
    
    // Always update timestamp for both forced and regular fetches
    lastPriceFetchTime.current = now;

    if (chainId === sepoliaChain.id) {
      console.log(`DexScreener: Skipping fetch for Sepolia`);
      setXenPrice('0'); setXburnPrice('0'); setPoolTvl('0');
      setPriceError(null); setLoadingPrices(false);
      return;
    }

    console.log(`DexScreener: Beginning fetch for chain ${chainId} - forced: ${forceRefresh}`);
    
    const addresses = getCurrentAddresses(chainId);
    const xenAddr = addresses?.XEN_ADDRESS;
    const xburnAddr = addresses?.XBURN_TOKEN_ADDRESS;
    const xburnXenLpAddr = addresses?.XBURN_XEN_LP_ADDRESS;
    const xenBasePairAddr = addresses?.XEN_BASE_PAIR_ADDRESS; // Address for XEN/WETH or XEN/USDC

    // Check if all necessary addresses are present and valid for the selected chain
    if (!addresses || !xenAddr || !xburnAddr || !xburnXenLpAddr || xburnXenLpAddr.includes('PLACEHOLDER') || !xenBasePairAddr || xenBasePairAddr.includes('PLACEHOLDER')) {
        console.warn(`DexScreener: Skipping fetch for chain ${chainId}, required addresses missing or placeholder. Addresses:`, {
          chainInfo: !!addresses,
          xenAddr,
          xburnAddr,
          xburnXenLpAddr,
          xenBasePairAddr
        });
        setXenPrice('0'); setXburnPrice('0'); setPoolTvl('0');
        setLoadingPrices(false); 
        return;
    }

    setLoadingPrices(true);
    setPriceError(null);

    const chainNameForApi = getChainById(chainId).network;
    const dexscreenerApiBase = `https://api.dexscreener.com/latest/dex/pairs/${chainNameForApi}/`;
    
    let fetchedXenPrice = '0';
    let fetchedXburnPrice = '0';
    let fetchedPoolTvl = '0';

    try {
      console.log(`DexScreener: Fetching pairs for chain ${chainNameForApi} (${chainId}): XEN Base (${xenBasePairAddr}), XBURN/XEN (${xburnXenLpAddr})`);
      console.log(`DexScreener: Using token addresses - XEN: ${xenAddr}, XBURN: ${xburnAddr}`);
      console.log(`DexScreener: API endpoints: ${dexscreenerApiBase}${xenBasePairAddr} and ${dexscreenerApiBase}${xburnXenLpAddr}`);
      
      // Special handling for Base chain - Add alternative XEN token address for XENON token
      let alternativeXenAddr = null;
      if (chainId === base.id) {
        // Use XENON token address as an alternative
        alternativeXenAddr = '0xc4de89d9a5163dfeb16ae26cf21da3562a1db81a';
        console.log(`DexScreener: Base chain detected, will also check for XENON token: ${alternativeXenAddr}`);
      }
      
      // Fetch both pairs concurrently
      const [xenBaseResponse, xburnXenResponse] = await Promise.all([
        fetch(`${dexscreenerApiBase}${xenBasePairAddr}`),
        fetch(`${dexscreenerApiBase}${xburnXenLpAddr}`)
      ]);

      // --- Debug response status ---
      console.log(`DexScreener: Response status - XEN Base pair: ${xenBaseResponse.status}, XBURN/XEN pair: ${xburnXenResponse.status}`);
      
      // --- Process XEN Base Pair (e.g., WETH/XEN or USDC/XEN) --- 
      if (xenBaseResponse.ok) {
          const xenBaseData = await xenBaseResponse.json();
          if (xenBaseData && xenBaseData.pair) {
              // Log token addresses for debugging
              console.log(`DexScreener: XEN/Base pair token addresses - Base: ${xenBaseData.pair.baseToken?.address}, Quote: ${xenBaseData.pair.quoteToken?.address}`);
              console.log(`DexScreener: Looking for XEN address: ${xenAddr.toLowerCase()}`);
              
              // Determine price based on which token is base/quote
              if (xenBaseData.pair.baseToken?.address?.toLowerCase() === xenAddr.toLowerCase() ||
                  (alternativeXenAddr && xenBaseData.pair.baseToken?.address?.toLowerCase() === alternativeXenAddr.toLowerCase())) {
                  // XEN is Base, priceUsd is price of XEN
                  fetchedXenPrice = xenBaseData.pair.priceUsd || '0';
                  console.log(`DexScreener: Found XEN as base token. Price: ${fetchedXenPrice}`);
              } else if (xenBaseData.pair.quoteToken?.address?.toLowerCase() === xenAddr.toLowerCase() ||
                         (alternativeXenAddr && xenBaseData.pair.quoteToken?.address?.toLowerCase() === alternativeXenAddr.toLowerCase())) {
                  // XEN is Quote, priceUsd is price of BaseToken in XEN.
                  // We need PriceQuoteUSD = PriceBaseUSD / PriceBaseQuote (PriceBaseQuote = priceUsd)
                  // We approximate PriceBaseUSD using DexScreener's base token price if available
                   const baseTokenPriceUSD = parseFloat(xenBaseData.pair.baseToken.priceUsd || '0');
                   const priceBaseInQuote = parseFloat(xenBaseData.pair.priceUsd || '0');
                   if (baseTokenPriceUSD > 0 && priceBaseInQuote > 0) {
                       fetchedXenPrice = (baseTokenPriceUSD / priceBaseInQuote).toString();
                       console.log(`DexScreener: Found XEN as quote token. Base price: ${baseTokenPriceUSD}, Pair price: ${priceBaseInQuote}, Calculated XEN price: ${fetchedXenPrice}`);
                   } else {
                      console.warn(`DexScreener: Could not calculate XEN price from quote side for pair ${xenBasePairAddr}`);
                   }
              } else {
                  console.warn(`DexScreener: XEN address not found in base/quote for pair ${xenBasePairAddr}. Base: ${xenBaseData.pair.baseToken?.address}, Quote: ${xenBaseData.pair.quoteToken?.address}, Looking for: ${xenAddr.toLowerCase()}`);
              }
          } else {
              console.warn(`DexScreener: No pair data found for XEN base pair: ${xenBasePairAddr}`, xenBaseData);
          }
      } else {
          console.error(`DexScreener: Failed to fetch XEN base pair ${xenBasePairAddr}`, { status: xenBaseResponse.status, statusText: xenBaseResponse.statusText });
          try {
              const errorText = await xenBaseResponse.text();
              console.error(`DexScreener: Error response: ${errorText.substring(0, 200)}`);
          } catch (e) {
              console.error('Could not read error response');
          }
      }

      // --- Process XBURN/XEN Pair --- 
      if (xburnXenResponse.ok) {
          const xburnXenData = await xburnXenResponse.json();
          // ADD DETAILED LOGGING HERE
          console.log(`DexScreener: Raw xburnXenData for pair ${xburnXenLpAddr} on chain ${chainId}:`, JSON.stringify(xburnXenData));

          if (xburnXenData.pair) {
              // Log token addresses for debugging
              console.log(`DexScreener: XBURN/XEN pair token addresses - Base: ${xburnXenData.pair.baseToken?.address}, Quote: ${xburnXenData.pair.quoteToken?.address}`);
              console.log(`DexScreener: Looking for XBURN address: ${xburnAddr.toLowerCase()}`);
              if (alternativeXenAddr) {
                console.log(`DexScreener: Also checking for alternative XEN (XENON) address: ${alternativeXenAddr}`);
              }
              
              fetchedPoolTvl = xburnXenData.pair.liquidity?.usd || '0'; // Get TVL from this pair
              
              // Now determine XBURN price - Requires XEN price calculated above
              const xenPriceNum = parseFloat(fetchedXenPrice);
              if (isNaN(xenPriceNum) || xenPriceNum <= 0) {
                  console.warn(`DexScreener: Cannot calculate XBURN price as XEN price is invalid (${fetchedXenPrice})`);
              } else {
                  // Check if XBURN is Base token
                  if (xburnXenData.pair.baseToken?.address?.toLowerCase() === xburnAddr.toLowerCase()) {
                      // Check if XEN is Quote token (using both addresses)
                      const isXenQuote = xburnXenData.pair.quoteToken?.address?.toLowerCase() === xenAddr.toLowerCase() ||
                                       (alternativeXenAddr && xburnXenData.pair.quoteToken?.address?.toLowerCase() === alternativeXenAddr.toLowerCase());
                      
                      if (isXenQuote) {
                        console.log(`DexScreener: Found valid XBURN/XEN pair with XBURN as base and XEN as quote`);
                        // XBURN is Base, priceUsd should be price of XBURN in terms of XEN
                        fetchedXburnPrice = xburnXenData.pair.priceUsd || '0';
                      } else {
                        console.log(`DexScreener: Found XBURN as base but quote token is not XEN`);
                      }
                  } 
                  // Check if XBURN is Quote token
                  else if (xburnXenData.pair.quoteToken?.address?.toLowerCase() === xburnAddr.toLowerCase()) {
                      // Check if XEN is Base token (using both addresses)
                      const isXenBase = xburnXenData.pair.baseToken?.address?.toLowerCase() === xenAddr.toLowerCase() ||
                                     (alternativeXenAddr && xburnXenData.pair.baseToken?.address?.toLowerCase() === alternativeXenAddr.toLowerCase());
                      
                      if (isXenBase) {
                        console.log(`DexScreener: Found valid XBURN/XEN pair with XEN as base and XBURN as quote`);
                        const priceBaseInQuote = parseFloat(xburnXenData.pair.priceNative || '0'); // Price of Base (XEN) in terms of Quote (XBURN)
                        if (priceBaseInQuote > 0) {
                            fetchedXburnPrice = (xenPriceNum / priceBaseInQuote).toString(); // PriceQuote = PriceBase / PriceBaseInQuote
                            console.log(`DexScreener: Calculated XBURN price: ${fetchedXburnPrice} from XEN price: ${xenPriceNum} and pair price: ${priceBaseInQuote}`);
                        } else { 
                            console.warn(`DexScreener: Could not calculate XBURN price, invalid priceNative for pair ${xburnXenLpAddr}`);
                        }
                      } else {
                        console.log(`DexScreener: Found XBURN as quote but base token is not XEN`);
                      }
                  } else {
                      console.warn(`DexScreener: XBURN address not found in base/quote for pair ${xburnXenLpAddr}`);
                  }
              }
          } else {
              console.warn(`DexScreener: No pair data found for XBURN/XEN pair: ${xburnXenLpAddr}`);
          }
      } else {
          console.error(`DexScreener: Failed to fetch XBURN/XEN pair ${xburnXenLpAddr}`, { status: xburnXenResponse.status });
      }

    } catch (error) {
      console.error(`DexScreener: Error during fetch/processing for chain ${chainId}:`, error);
      setPriceError(error.message || 'Failed to process price data');
      // Don't clear prices on error, keep stale data potentially
    } finally {
      // Update state with fetched (or default 0) values
      setXenPrice(fetchedXenPrice);
      setXburnPrice(fetchedXburnPrice);
      setPoolTvl(fetchedPoolTvl);
      setLoadingPrices(false);
      console.log(`DexScreener: Update complete - XEN Price: ${fetchedXenPrice}, XBURN Price: ${fetchedXburnPrice}, TVL: ${fetchedPoolTvl}`);
      
      // Special debugging for Base chain
      if (chainId === base.id && !fetchedXenPrice) {
        console.log(`DexScreener: Base chain detected with no XEN price. Will try direct token lookup.`);
        // Try looking up the XEN token directly - not waiting for result to avoid blocking
        fetch(`https://api.dexscreener.com/latest/dex/tokens/0xffcbF84650cE02DaFE96926B37a0ac5E34932fa5,0xc4de89d9a5163dfeb16ae26cf21da3562a1db81a?chainIds=base`)
          .then(response => response.json())
          .then(data => {
            console.log(`DexScreener Debug: Direct token lookup results:`, data);
          })
          .catch(error => {
            console.error(`DexScreener Debug: Error in direct token lookup:`, error);
          });
      }
    }
  // Dependencies: Only trigger when chain or addresses change.
  }, [selectedChainId, getCurrentAddresses]);

  // Fetch External Stats (removed unused refs/setters)
  const fetchExternalStats = useCallback(async () => {
      const now = Date.now();
      // Use constant directly instead of ref
      if (now - externalStats.lastFetched < MIN_EXTERNAL_STATS_FETCH_INTERVAL) { 
          // console.log('Skipping external stats fetch, last fetch too recent');
          return;
      }
      // lastExternalStatsFetchTime.current = now; // Removed ref update
      setExternalStats(prev => ({ ...prev, loading: true, error: null }));
      const url = "https://raw.githubusercontent.com/TreeCityWes/XBURN-STATS/refs/heads/main/stats.json";
      try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          setExternalStats({ loading: false, data: data, lastFetched: now, error: null });
      } catch (error) {
          console.error('Error fetching external stats:', error);
          setExternalStats(prev => ({ ...prev, loading: false, error: error.message }));
      } 
  // Dependency: only relies on its own lastFetched state to throttle.
  }, [externalStats.lastFetched]); 

  // Main Data Loading Effect - Waits for connection AND contracts to be ready
  useEffect(() => {
    if (isConnected && account && provider && selectedChainId && !isLoadingContracts) { 
      console.log(`GlobalData: Wallet connected & contracts ready on chain ${selectedChainId}. Triggering initial data load...`);
      // Add explicit balance fetch first
      fetchBalances(true);
      loadStats();  
      fetchDexScreenerData();
      fetchExternalStats(); 
      // Load only NFTs initially or on connection/network changes
      loadNFTs(); 
    } else {
       console.log(`GlobalData: Not ready for loading. Clearing data. isConnected: ${isConnected}, account: ${!!account}, provider: ${!!provider}, chainId: ${selectedChainId}, contractsLoading: ${isLoadingContracts}`);
       // Clear data if not ready
       setNfts([]);
       setTotalNFTs(0);
       setTotalPages(1);
       // Clear stats and prices too
       setStats({ loading: false, error: null, data: { /* initial data structure */ }, lastFetched: 0 });
       setXenPrice('0');
       setXburnPrice('0');
       setPoolTvl('0');
    }

    // Return empty cleanup function as intervals are removed
    return () => {
      console.log("GlobalDataContext: Main useEffect cleanup.");
      // clearInterval(priceIntervalId);
      // clearInterval(externalStatsIntervalId);
    };
  }, [isConnected, account, provider, selectedChainId, isLoadingContracts, 
      loadNFTs, fetchBalances, loadStats, fetchDexScreenerData, fetchExternalStats]);

  // Claim NFT function - Use WalletContext contract instance
  const claimNFT = useCallback(async (tokenId) => {
    const contract = xburnMinterContract;
    if (!isConnected || !account || !provider || !contract) {
      throw new Error("Wallet not connected or contract not initialized");
    }
    // Address check could be added here too
    try {
      const signer = provider.getSigner();
      const connectedContract = contract.connect(signer);
      const tx = await connectedContract.claimLockedXBURN(tokenId);
      await tx.wait();
      // Re-fetch data after successful claim
      loadNFTs(); 
      loadStats();
      // Manually trigger balance refresh in WalletContext? Or rely on its polling.
      // useWallet().fetchBalances(provider, account, selectedChainId, true); // If fetchBalances is exposed
      return true;
    } catch (error) {
      console.error("Error claiming NFT:", error);
      throw error;
    }
  }, [isConnected, account, provider, xburnMinterContract, loadNFTs, loadStats]);

  // Emergency end NFT function - Use WalletContext contract instance
  const emergencyEndNFT = useCallback(async (tokenId) => {
    const contract = xburnMinterContract;
     if (!isConnected || !account || !provider || !contract) {
      throw new Error("Wallet not connected or contract not initialized");
    }
    try {
      const signer = provider.getSigner();
      const connectedContract = contract.connect(signer);
      const tx = await connectedContract.emergencyEnd(tokenId);
      await tx.wait();
       // Re-fetch data after successful action
      loadNFTs();
      loadStats();
      return true;
    } catch (error) {
      console.error("Error emergency ending NFT:", error);
      throw error;
    }
  }, [isConnected, account, provider, xburnMinterContract, loadNFTs, loadStats]);

  // Add state to track when NFT or Stats tabs are active
  const [activeTab, setActiveTab] = useState(() => {
    const storedTab = localStorage.getItem('activeTab');
    return storedTab || 'burn'; // Default to burn tab
  });

  // Create context value - provide WalletContext balances directly
  const value = {
    nfts,
    loadingNFTs,
    nftError,
    loadNFTs,
    loadNFTById,
    claimNFT,
    emergencyEndNFT,
    currentPage,
    totalPages,
    setCurrentPage,
    totalNFTs,
    // Removed contract getters
    balances: { // Passed directly from useWallet()
      eth: ethBalance,
      xen: xenBalance,
      xburn: xburnBalance,
      xenRaw: xenBalanceRaw,
      xburnRaw: xburnBalanceRaw,
      xenApprovalRaw: xenApprovalRaw,
      xburnApprovalRaw: xburnApprovalRaw
    },
    stats,
    loadStats,
    // account is available via useWallet() where needed
    // loading state combines local loading flags
    loading: loadingNFTs || stats.loading || loadingPrices || externalStats.loading,
    error: nftError || stats.error || priceError || externalStats.error,
    xenPrice,
    xburnPrice,
    poolTvl,
    loadingPrices,
    priceError,
    fetchDexScreenerData, // Expose refetch function
    externalStats,
    fetchExternalStats, // Expose external stats fetch function
    activeTab,
    setActiveTab
  };

  // Add retry logic for failed network requests
  const retryOperation = useCallback(async (operation, maxRetries = 3, initialDelay = 200) => {
    // Skip the operation if we're not properly connected
    if (!isConnected || !provider || !account || !selectedChainId) {
      console.log("Retry: Skipping operation - not connected or missing dependencies");
      return null;
    }
    
    let lastError;
    let currentDelay = initialDelay;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        // Check if we're still on the same chain after the operation completes
        if (provider) {
          const network = await provider.getNetwork();
          if (network.chainId !== selectedChainId) {
            console.log(`Retry: Network changed during operation (${selectedChainId} -> ${network.chainId}). Aborting.`);
            return null;
          }
        }
        return result;
      } catch (error) {
        console.log(`Operation failed, attempt ${attempt}/${maxRetries}. Retrying in ${currentDelay}ms...`, error);
        lastError = error;
        
        // eslint-disable-next-line no-loop-func
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        // Increase delay for next attempt, but cap at 1000ms
        currentDelay = Math.min(Math.floor(currentDelay * 1.5), 1000);
        
        // Check if we're still connected and on the same chain before retrying
        if (!isConnected || !provider || !account || !selectedChainId) {
          console.log("Retry: Dependencies lost during retry wait. Aborting.");
          return null;
        }
      }
    }
    throw lastError; // All retries failed
  }, [isConnected, provider, account, selectedChainId]);

  // Simplified chain change effect - less responsibility for handling network state
  useEffect(() => {
    if (isConnected && provider && account && selectedChainId) {
      console.log(`GlobalDataContext: Chain changed to ${selectedChainId}, forcing data refresh`);
      
      // Reset data
      setXenPrice('0');
      setXburnPrice('0'); 
      setPoolTvl('0');
      
      // When chain changes, clear any stale data
      setStats(prev => ({
        ...prev,
        data: {
          totalXenBurned: '0',
          totalXburnMinted: '0',
          totalXburnBurned: '0',
          globalBurnRank: '0',
          userXenBurned: '0',
          userXburnMinted: '0',
          userXburnBurned: '0'
        },
        loading: false,
        error: null
      }));
      
      // Reset the price fetch time to ensure we fetch regardless of when the last fetch was
      lastPriceFetchTime.current = 0;
      
      // Always fetch DexScreener data immediately on chain change, regardless of active tab
      // Use a slight delay to ensure the state resets have taken effect
      setTimeout(() => {
        console.log(`GlobalDataContext: Delayed DexScreener fetch for chain ${selectedChainId}`);
        fetchDexScreenerData(selectedChainId, true)
          .catch(error => console.error("Failed to fetch price data:", error));
      }, 100);
      
      // Don't try to load stats here since contracts might not be ready yet
      // Our dedicated contract-ready effect will handle that
      
      // Allow a short delay for wallet context to fully update
      setTimeout(() => {
        // Only proceed if we're still connected and on the same chain
        if (!isConnected || !provider || !account || !selectedChainId) {
          console.log("Data refresh: State changed during timeout. Aborting refresh.");
          return;
        }
        
        // Only load NFT data if we're on the NFTs tab
        if (activeTab === 'nfts' && !isLoadingContracts) {
          retryOperation(() => loadNFTs(true))
            .catch(error => console.error("Failed to load NFTs after retries:", error));
        }
      }, 200); // Short delay for network synchronization
    }
  }, [selectedChainId, isConnected, provider, account, activeTab, 
      fetchDexScreenerData, loadNFTs, retryOperation]);

  // Add a dedicated effect to load stats when contracts finish loading
  useEffect(() => {
    // Only trigger when we have completed loading contracts AND we're connected
    if (isConnected && account && provider && selectedChainId && !isLoadingContracts) {
      console.log(`GlobalDataContext: Contracts finished loading for chain ${selectedChainId}, loading stats now`);
      
      // Load stats immediately when contracts become available
      retryOperation(() => loadStats(true))
        .catch(error => console.error("Failed to load stats after contracts initialized:", error));
    }
  }, [isConnected, account, provider, selectedChainId, loadStats, retryOperation, isLoadingContracts]);

  // Add dedicated polling for DexScreener data
  useEffect(() => {
    // Only set up polling if we're connected and have a valid chain
    if (!isConnected || !provider || !account || !selectedChainId) {
      return;
    }
    
    console.log(`Setting up DexScreener polling for chain ${selectedChainId}`);
    
    // Immediate fetch on setup
    fetchDexScreenerData(selectedChainId, true).catch(error => 
      console.error("Failed initial DexScreener fetch:", error)
    );
    
    // Set up interval for regular polling
    const dexScreenerInterval = setInterval(() => {
      fetchDexScreenerData(selectedChainId).catch(error => 
        console.error("Failed DexScreener polling fetch:", error)
      );
    }, 30000); // Poll every 30 seconds
    
    return () => {
      console.log("Clearing DexScreener polling interval");
      clearInterval(dexScreenerInterval);
    };
  }, [isConnected, provider, account, selectedChainId, fetchDexScreenerData, isLoadingContracts]);

  // Main cleanup effect (keep this existing code)
  useEffect(() => {
    // ... existing cleanup code ...
  }, []);

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};

// Updated hook name convention
export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
}; 