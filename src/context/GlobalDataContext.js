import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';
// Import necessary addresses from constants
import {
  XEN_ADDRESS,
  XBURN_TOKEN_ADDRESS, // Assuming this is the XBURN token address
  XBURN_NFT_ADDRESS,
  XBURN_MINTER_ADDRESS,
  UNISWAP_ROUTER_ADDRESS, // Using the correct Router constant
  XBURN_XEN_LP_ADDRESS // Using the correct LP constant
} from '../constants/addresses';

const GlobalDataContext = createContext();

// Constants for pagination
const PER_PAGE = 10;

// Add ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)',
  'function totalSupply() view returns (uint256)'
];

// REMOVED Hardcoded Sepolia Addresses
// const CONTRACTS = { ... };

export const GlobalDataProvider = ({ children }) => {
  const { 
    account, 
    provider, 
    ethBalance, 
    xenBalance, 
    xburnBalance, 
    xenBalanceRaw, 
    xburnBalanceRaw, 
    xenApprovalRaw, 
    xburnApprovalRaw 
  } = useWallet();
  
  // NFT data state
  const [nfts, setNfts] = useState([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [nftError, setNftError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNFTs, setTotalNFTs] = useState(0);

  // Stats state
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

  // --- Debounce Timestamps using useRef ---
  const lastNftFetchTime = useRef(0);
  const MIN_NFT_FETCH_INTERVAL = 5000; 
  const lastStatsFetchTime = useRef(0);
  const MIN_STATS_FETCH_INTERVAL = 10000;

  // --- Contract Instance Getters (useCallback) ---
  const xenftContract = useCallback(() => {
    if (!provider) return null;
    console.log("Initializing XENFT contract at", XBURN_NFT_ADDRESS); // Use Constant
    
    const XENFT_CONTRACT_ABI = [
      "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
      "function ownerOf(uint256 tokenId) external view returns (address)",
      "function tokenURI(uint256 tokenId) external view returns (string memory)",
      "function getLockDetails(uint256 tokenId) external view returns (uint256 xenAmount, uint256 maturityTs, uint256 ampSnapshot, uint256 termDays, bool claimed, uint256 rewardAmount, uint256 baseMint, address owner)",
      "function balanceOf(address owner) external view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(
      XBURN_NFT_ADDRESS, // Use Constant
      XENFT_CONTRACT_ABI, 
      provider.getSigner ? provider.getSigner() : provider
    );
    
    window.xenftContract = contract; // Still potentially useful for debugging
    return contract;
  }, [provider]);

  const xenftBurnContract = useCallback(() => {
    if (!provider) return null;
    
    try {
      console.log("Initializing XBurnMinter contract at", XBURN_MINTER_ADDRESS); // Use Constant
      const abi = [
        "function claimLockedXBURN(uint256 tokenId) external",
        "function emergencyEnd(uint256 tokenId) external",
        "function getTokenStats(uint256 tokenId) external view returns (uint256 xenAmount, uint256 baseMint, uint256 rewardAmount, uint256 maturityTs, bool isClaimable, bool isClaimed)",
        "function balanceOf(address owner) external view returns (uint256)",
        "function getUserLocks(address user) external view returns (uint256[])",
        "function getStats(address user) external view returns (uint256 userXenBurnedAmount, uint256 userXburnBurnedAmount, uint256 userXburnBalance, uint256 userBurnPercentage, uint256 globalXenBurned, uint256 globalXburnBurned, uint256 totalXburnSupply, uint256 globalBurnPercentage)",
        "function globalBurnRank() external view returns (uint256)"
      ];
      
      return new ethers.Contract(
        XBURN_MINTER_ADDRESS, // Use Constant
        abi,
        provider.getSigner ? provider.getSigner() : provider
      );
    } catch (error) {
      console.error("Error initializing XBurnMinter contract:", error);
      return null;
    }
  }, [provider]);

  const xenContract = useCallback(() => {
    if (!provider) return null;
    console.log("Initializing XEN contract at", XEN_ADDRESS); // Use Constant
    return new ethers.Contract(XEN_ADDRESS, ERC20_ABI, provider); // Use Constant
  }, [provider]);

  const xburnContract = useCallback(() => {
    if (!provider) return null;
    console.log("Initializing XBURN contract at", XBURN_TOKEN_ADDRESS); // Use Constant
    return new ethers.Contract(XBURN_TOKEN_ADDRESS, ERC20_ABI, provider); // Use Constant
  }, [provider]);

  // --- Data Loading Functions ---
  const loadNFTById = useCallback(async (tokenId) => {
    const minterContract = xenftBurnContract();
    const nftContract = xenftContract();
    if (!account || !minterContract || !nftContract || !tokenId) {
      console.log("Load NFT By ID: Skipped, dependencies not ready.");
      return null;
    }

    try {
      console.log("Loading NFT details for token ID", tokenId);
      const burnContract = minterContract;
      const baseNftContract = nftContract;
      
      // First check if the user owns this NFT
      try {
        const owner = await baseNftContract.ownerOf(tokenId);
        if (owner.toLowerCase() !== account.toLowerCase()) {
          console.error("User does not own this NFT");
          return null;
        }
      } catch (error) {
        console.error("Error checking NFT ownership:", error);
        return null;
      }
      
      // Get the details for the NFT from the NFT contract
      const details = await baseNftContract.getLockDetails(tokenId);
      console.log("NFT details for", tokenId, ":", details);
      
      // Get additional token stats from the burn contract
      const tokenStats = await burnContract.getTokenStats(tokenId);
      console.log("Token stats for", tokenId, ":", tokenStats);
      
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
      console.error(`Error loading NFT ${tokenId}:`, error);
      return null;
    }
  }, [account, xenftBurnContract, xenftContract]);

  const loadNFTs = useCallback(async () => {
    // Debounce check using ref
    const now = Date.now();
    if (now - lastNftFetchTime.current < MIN_NFT_FETCH_INTERVAL) {
      console.log('Skipping NFT fetch, last fetch was too recent');
      return;
    }
    lastNftFetchTime.current = now;

    const minterContract = xenftBurnContract();
    const nftContract = xenftContract();
    if (!account || !minterContract || !nftContract) {
      console.log("Load NFTs: Skipped, dependencies not ready.");
      return;
    }

    setLoadingNFTs(true);
    setNftError(null);

    try {
      console.log("Loading NFTs for account", account, "page", currentPage);
      const burnContract = minterContract;
      const baseNftContract = nftContract;
      
      // Get total NFTs for user
      let totalNFTsCount = 0;
      try {
        console.log("Getting NFT balance for account", account);
        const balance = await baseNftContract.balanceOf(account);
        totalNFTsCount = parseInt(balance.toString(), 10);
        console.log("NFT balance:", totalNFTsCount);
        setTotalNFTs(totalNFTsCount);
        setTotalPages(Math.ceil(totalNFTsCount / PER_PAGE) || 1);
      } catch (error) {
        console.error('Error getting NFT balance:', error);
        setNftError('Error getting NFT balance');
        setLoadingNFTs(false);
        return;
      }

      if (totalNFTsCount === 0) {
        console.log("No NFTs found for account", account);
        setNfts([]);
        setLoadingNFTs(false);
        return;
      }

      // Get token IDs directly from the contract
      const tokenIds = [];
      const promises = [];
      
      // Try to get token IDs directly from the contract
      for (let i = 0; i < Math.min(totalNFTsCount, 20); i++) {
        promises.push(
          (async (index) => {
            try {
              const tokenId = await baseNftContract.tokenOfOwnerByIndex(account, index);
              return tokenId.toString();
            } catch (error) {
              console.error(`Error fetching token at index ${index}:`, error);
              return null;
            }
          })(i)
        );
      }
      
      const results = await Promise.all(promises);
      results.forEach(tokenId => {
        if (tokenId !== null) {
          tokenIds.push(tokenId);
        }
      });
      
      console.log("Token IDs:", tokenIds);
      
      if (tokenIds.length === 0) {
        setNftError("Could not retrieve your NFTs. Please try again later.");
        setNfts([]);
        setLoadingNFTs(false);
        return;
      }
      
      // Load details for the first NFT
      try {
        const firstTokenId = tokenIds[0];
        const details = await loadNFTById(firstTokenId);
        
        if (details) {
          const firstNft = {
            ...details,
            allTokenIds: tokenIds // Store all token IDs for the dropdown
          };
          
          setNfts([firstNft]);
        } else {
          setNftError("Error loading NFT details. Please try again later.");
        }
      } catch (error) {
        console.error("Error loading first NFT details:", error);
        setNftError("Error loading NFT details. Please try again later.");
      }
    } catch (error) {
      console.error('Error loading NFTs:', error);
      setNftError(error.message);
    } finally {
      setLoadingNFTs(false);
    }
  }, [account, xenftBurnContract, xenftContract, currentPage, loadNFTById]);

  const loadStats = useCallback(async () => {
    // Debounce check using ref
    const now = Date.now();
    if (now - lastStatsFetchTime.current < MIN_STATS_FETCH_INTERVAL) {
      console.log('Skipping stats fetch, last fetch was too recent');
      return;
    }
    lastStatsFetchTime.current = now;

    const minterContract = xenftBurnContract();
    const baseContract = xenContract();
    if (!account || !provider || !minterContract || !baseContract) {
      console.log("Load Stats: Skipped, dependencies not ready.");
      return;
    }
    
    setStats(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log("Loading stats for account", account, "using minter:", minterContract?.address);
      
      let statsData, globalBurnRank, globalStatsData;
      try {
        console.log("Calling minterContract.getStats...");
        statsData = await minterContract.getStats(account);
        console.log("Raw getStats return:", statsData);

        console.log("Calling minterContract.globalBurnRank...");
        globalBurnRank = await minterContract.globalBurnRank();
        console.log("Raw globalBurnRank return:", globalBurnRank);
        
        console.log("Calling minterContract.getGlobalStats...");
        globalStatsData = await minterContract.getGlobalStats(); 
        console.log("Raw getGlobalStats return:", globalStatsData);

      } catch (contractCallError) {
        console.error("ERROR during stats contract calls:", contractCallError);
        setStats(prev => ({ ...prev, loading: false, error: `Stats contract call failed: ${contractCallError.message}` }));
        return; // Stop execution if essential stats calls fail
      }
      
      let xenSupply = '0';
      try {
        console.log("Checking baseContract before calling totalSupply:", baseContract);
        // Explicitly check if the function exists on the instance
        if (baseContract && typeof baseContract.totalSupply === 'function') {
          xenSupply = await baseContract.totalSupply(); 
          console.log("XEN Total Supply:", ethers.utils.formatUnits(xenSupply, 18));
        } else {
           console.error("baseContract.totalSupply is NOT a function or baseContract is invalid.", baseContract);
           // Optionally set an error state or return default value
        }
      } catch (error) {
        console.error("Error fetching XEN supply:", error);
      }
      
      // Get LP pool data
      let xenInPool = '0';
      let xburnInPool = '0';
      
      try {
        // Removed factory/getPair logic - Directly use the known LP address
        console.log("Using provided LP Pair address:", XBURN_XEN_LP_ADDRESS);
        
        if (XBURN_XEN_LP_ADDRESS && XBURN_XEN_LP_ADDRESS !== ethers.constants.AddressZero) {
          // LP Pair ABI (Keep ABI as is)
          const lpPairAbi = [
            "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() external view returns (address)"
          ];
          
          // Create LP pair contract instance using the provided constant
          const lpPairContract = new ethers.Contract(XBURN_XEN_LP_ADDRESS, lpPairAbi, provider);
          
          // Get token order in the pair
          const token0 = await lpPairContract.token0();
          console.log("Token0:", token0);
          
          // Get reserves
          const reserves = await lpPairContract.getReserves();
          console.log("Reserves:", reserves);
          
          // Determine which reserve is XEN and which is XBURN using imported constants
          if (token0.toLowerCase() === XEN_ADDRESS.toLowerCase()) {
            xenInPool = reserves.reserve0;
            xburnInPool = reserves.reserve1;
          } else {
            xenInPool = reserves.reserve1;
            xburnInPool = reserves.reserve0;
          }
          
          console.log("XEN in pool:", ethers.utils.formatUnits(xenInPool, 18));
          console.log("XBURN in pool:", ethers.utils.formatUnits(xburnInPool, 18));
        } else {
          console.log("LP Pair address is zero or not provided.");
        }
      } catch (error) {
        console.error("Error fetching LP pool data:", error);
      }
      
      console.log("Stats loaded:", {
        totalXenBurned: ethers.utils.formatUnits(statsData.globalXenBurned, 18),
        totalXburnMinted: ethers.utils.formatUnits(statsData.totalXburnSupply, 18),
        totalXburnBurned: ethers.utils.formatUnits(statsData.globalXburnBurned, 18),
        globalBurnPercentage: ethers.utils.formatUnits(statsData.globalBurnPercentage || '0', 18),
        currentAMP: globalStatsData?.currentAMP?.toString() || '0',
        globalBurnRank: globalBurnRank.toString(),
        userXenBurned: ethers.utils.formatUnits(statsData.userXenBurnedAmount, 18),
        userXburnMinted: ethers.utils.formatUnits(statsData.userXburnBalance, 18),
        userXburnBurned: ethers.utils.formatUnits(statsData.userXburnBurnedAmount, 18),
        xenSupply: ethers.utils.formatUnits(xenSupply, 18),
        xenInPool: ethers.utils.formatUnits(xenInPool, 18),
        xburnInPool: ethers.utils.formatUnits(xburnInPool, 18)
      });
      
      setStats({
        loading: false,
        error: null,
        data: {
          totalXenBurned: ethers.utils.formatUnits(statsData.globalXenBurned, 18),
          totalXburnMinted: ethers.utils.formatUnits(statsData.totalXburnSupply, 18),
          totalXburnBurned: ethers.utils.formatUnits(statsData.globalXburnBurned, 18),
          globalBurnPercentage: ethers.utils.formatUnits(statsData.globalBurnPercentage || '0', 18),
          currentAMP: globalStatsData?.currentAMP?.toString() || '0',
          globalBurnRank: globalBurnRank.toString(),
          userXenBurned: ethers.utils.formatUnits(statsData.userXenBurnedAmount, 18),
          userXburnMinted: ethers.utils.formatUnits(statsData.userXburnBalance, 18),
          userXburnBurned: ethers.utils.formatUnits(statsData.userXburnBurnedAmount, 18),
          xenSupply: ethers.utils.formatUnits(xenSupply, 18),
          xenInPool: ethers.utils.formatUnits(xenInPool, 18),
          xburnInPool: ethers.utils.formatUnits(xburnInPool, 18)
        },
        lastFetched: Date.now()
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, [account, provider, xenftBurnContract, xenContract]);

  // Main Data Loading Effect - Depends only on account and provider
  useEffect(() => {
    if (account && provider) { 
      console.log("Account/Provider changed, loading global data for", account);
      loadNFTs(); 
      loadStats();  
    }
  }, [account, provider, loadNFTs, loadStats]); // Keep loadNFTs/loadStats here per ESLint

  // Claim NFT function
  const claimNFT = useCallback(async (tokenId) => {
    const contract = xenftBurnContract();
    if (!account || !provider || !contract) {
      throw new Error("Wallet not connected or contract not initialized");
    }
    
    try {
      console.log("Claiming NFT", tokenId, "for account", account);
      const signer = provider.getSigner();
      const connectedContract = contract.connect(signer);
      const tx = await connectedContract.claimLockedXBURN(tokenId);
      console.log("Claim transaction sent:", tx.hash);
      await tx.wait();
      console.log("Claim transaction confirmed");
      return true;
    } catch (error) {
      console.error("Error claiming NFT:", error);
      throw error;
    }
  }, [account, provider, xenftBurnContract]);

  // Emergency end NFT function
  const emergencyEndNFT = useCallback(async (tokenId) => {
    const contract = xenftBurnContract();
    if (!account || !provider || !contract) {
      throw new Error("Wallet not connected or contract not initialized");
    }
    
    try {
      console.log("Emergency ending NFT", tokenId, "for account", account);
      const signer = provider.getSigner();
      const connectedContract = contract.connect(signer);
      const tx = await connectedContract.emergencyEnd(tokenId);
      console.log("Emergency end transaction sent:", tx.hash);
      await tx.wait();
      console.log("Emergency end transaction confirmed");
      return true;
    } catch (error) {
      console.error("Error emergency ending NFT:", error);
      throw error;
    }
  }, [account, provider, xenftBurnContract]);

  // Create context value
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
    xenftContract,
    xenftBurnContract,
    xenContract,
    xburnContract,
    balances: { 
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
    account,
    loading: loadingNFTs || stats.loading,
    error: nftError || stats.error
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
}; 