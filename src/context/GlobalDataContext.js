import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';

const GlobalDataContext = createContext();

// Constants for pagination
const PER_PAGE = 10;

// Add ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)'
];

// Contract addresses for Sepolia testnet
const CONTRACTS = {
  XEN: ethers.utils.getAddress("0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB"),
  XBURN: ethers.utils.getAddress("0x644D5B0fFd68bD3215e3FcD869E23E8b8B0f481d"),
  XENFT: ethers.utils.getAddress("0x1EbC3157Cc44FE1cb0d7F4764D271BAD3deB9a03"),
  XENFT_BURN_MINTER: ethers.utils.getAddress("0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189"),
  ROUTER: ethers.utils.getAddress("0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"),
  LIQUIDITY_PAIR: ethers.utils.getAddress("0x38C29A96f026F169822c3Dd150cCF9504260b5e6")
};

export const GlobalDataProvider = ({ children }) => {
  const { account, provider } = useWallet();
  
  // NFT data state
  const [nfts, setNfts] = useState([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [nftError, setNftError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNFTs, setTotalNFTs] = useState(0);

  // Balance state
  const [balances, setBalances] = useState({
    eth: '0',
    xen: '0',
    xburn: '0',
    lastFetched: null
  });

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

  // Initialize XENFT contract
  const xenftContract = useCallback(() => {
    if (!provider) return null;
    console.log("Initializing XENFT contract at", CONTRACTS.XENFT);
    
    const XENFT_CONTRACT_ABI = [
      "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
      "function ownerOf(uint256 tokenId) external view returns (address)",
      "function tokenURI(uint256 tokenId) external view returns (string memory)",
      "function getLockDetails(uint256 tokenId) external view returns (uint256 xenAmount, uint256 maturityTs, uint256 ampSnapshot, uint256 termDays, bool claimed, uint256 rewardAmount, uint256 baseMint, address owner)",
      "function balanceOf(address owner) external view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(
      CONTRACTS.XENFT, 
      XENFT_CONTRACT_ABI, 
      provider.getSigner ? provider.getSigner() : provider
    );
    
    // Make the contract available globally for the NFTPanel component
    window.xenftContract = contract;
    
    return contract;
  }, [provider]);

  // Initialize XENFT Burn contract
  const xenftBurnContract = useCallback(() => {
    if (!provider) return null;
    
    try {
      console.log("Initializing XBurnMinter contract at", CONTRACTS.XENFT_BURN_MINTER);
      // Use the correct ABI for the XBurnMinter contract
      const abi = [
        "function claimLockedXBURN(uint256 tokenId) external",
        "function emergencyEnd(uint256 tokenId) external",
        "function getTokenStats(uint256 tokenId) external view returns (uint256 xenAmount, uint256 baseMint, uint256 rewardAmount, uint256 maturityTs, bool isClaimable, bool isClaimed)",
        "function balanceOf(address owner) external view returns (uint256)",
        "function getUserLocks(address user) external view returns (uint256[])"
      ];
      
      return new ethers.Contract(
        CONTRACTS.XENFT_BURN_MINTER,
        abi,
        provider.getSigner ? provider.getSigner() : provider
      );
    } catch (error) {
      console.error("Error initializing XBurnMinter contract:", error);
      return null;
    }
  }, [provider]);

  // Create contract instances
  const xenContract = useCallback(() => {
    if (!provider) return null;
    console.log("Initializing XEN contract at", CONTRACTS.XEN);
    return new ethers.Contract(CONTRACTS.XEN, ERC20_ABI, provider);
  }, [provider]);

  const xburnContract = useCallback(() => {
    if (!provider) return null;
    console.log("Initializing XBURN contract at", CONTRACTS.XBURN);
    return new ethers.Contract(CONTRACTS.XBURN, ERC20_ABI, provider);
  }, [provider]);

  // Load balances
  const loadBalances = useCallback(async () => {
    if (!account || !provider) return;

    try {
      console.log("Loading balances for account", account);
      const xenContract = new ethers.Contract(
        CONTRACTS.XEN,
        ERC20_ABI,
        provider
      );

      const burnContract = new ethers.Contract(
        CONTRACTS.XBURN,
        ERC20_ABI,
        provider
      );

      const [ethBalance, xenBalance, xburnBalance] = await Promise.all([
        provider.getBalance(account),
        xenContract.balanceOf(account),
        burnContract.balanceOf(account)
      ]);

      console.log("Balances loaded:", {
        eth: ethers.utils.formatEther(ethBalance),
        xen: ethers.utils.formatEther(xenBalance),
        xburn: ethers.utils.formatEther(xburnBalance)
      });

      setBalances({
        eth: ethers.utils.formatEther(ethBalance),
        xen: ethers.utils.formatEther(xenBalance),
        xburn: ethers.utils.formatEther(xburnBalance),
        lastFetched: Date.now()
      });
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  }, [account, provider]);

  // Claim NFT function
  const claimNFT = useCallback(async (tokenId) => {
    if (!account || !xenftBurnContract()) {
      throw new Error("Wallet not connected or contract not initialized");
    }
    
    try {
      console.log("Claiming NFT", tokenId, "for account", account);
      const contract = xenftBurnContract();
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
  }, [account, xenftBurnContract, provider]);

  // Emergency end NFT function
  const emergencyEndNFT = useCallback(async (tokenId) => {
    if (!account || !xenftBurnContract()) {
      throw new Error("Wallet not connected or contract not initialized");
    }
    
    try {
      console.log("Emergency ending NFT", tokenId, "for account", account);
      const contract = xenftBurnContract();
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
  }, [account, xenftBurnContract, provider]);

  // Load a specific NFT by token ID
  const loadNFTById = useCallback(async (tokenId) => {
    if (!account || !xenftBurnContract() || !xenftContract() || !tokenId) {
      console.log("Cannot load NFT: account, contracts, or token ID not available");
      return null;
    }

    try {
      console.log("Loading NFT details for token ID", tokenId);
      const burnContract = xenftBurnContract();
      const nftContract = xenftContract();
      
      // First check if the user owns this NFT
      try {
        const owner = await nftContract.ownerOf(tokenId);
        if (owner.toLowerCase() !== account.toLowerCase()) {
          console.error("User does not own this NFT");
          return null;
        }
      } catch (error) {
        console.error("Error checking NFT ownership:", error);
        return null;
      }
      
      // Get the details for the NFT from the NFT contract
      const details = await nftContract.getLockDetails(tokenId);
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

  // Load NFTs for the current user
  const loadNFTs = useCallback(async () => {
    if (!account || !xenftBurnContract() || !xenftContract()) {
      console.log("Cannot load NFTs: account or contracts not available");
      return;
    }

    setLoadingNFTs(true);
    setNftError(null);

    try {
      console.log("Loading NFTs for account", account, "page", currentPage);
      const burnContract = xenftBurnContract();
      const nftContract = xenftContract();
      
      // Get total NFTs for user
      let totalNFTsCount = 0;
      try {
        console.log("Getting NFT balance for account", account);
        const balance = await nftContract.balanceOf(account);
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
              const tokenId = await nftContract.tokenOfOwnerByIndex(account, index);
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

  // Load stats
  const loadStats = useCallback(async () => {
    if (!account || !provider) return;
    
    setStats(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log("Loading stats for account", account);
      const contract = new ethers.Contract(
        CONTRACTS.XENFT_BURN_MINTER,
        [
          "function getStats(address user) external view returns (uint256 userXenBurnedAmount, uint256 userXburnBurnedAmount, uint256 userXburnBalance, uint256 userBurnPercentage, uint256 globalXenBurned, uint256 globalXburnBurned, uint256 totalXburnSupply, uint256 globalBurnPercentage)",
          "function globalBurnRank() external view returns (uint256)"
        ],
        provider
      );
      
      const [stats, globalBurnRank] = await Promise.all([
        contract.getStats(account),
        contract.globalBurnRank()
      ]);
      
      // Get XEN supply from XEN contract
      let xenSupply = '0';
      try {
        const xenContract = new ethers.Contract(
          CONTRACTS.XEN,
          ["function totalSupply() external view returns (uint256)"],
          provider
        );
        xenSupply = await xenContract.totalSupply();
        console.log("XEN Total Supply:", ethers.utils.formatUnits(xenSupply, 18));
      } catch (error) {
        console.error("Error fetching XEN supply:", error);
      }
      
      // Get LP pool data
      let xenInPool = '0';
      let xburnInPool = '0';
      
      try {
        // Router ABI for getting LP pair
        const routerAbi = ["function factory() external view returns (address)"];
        
        // Create router contract instance
        const routerContract = new ethers.Contract(CONTRACTS.ROUTER, routerAbi, provider);
        
        // Get factory address
        const factoryAddress = await routerContract.factory();
        console.log("Factory address:", factoryAddress);
        
        // Create factory contract instance
        const factoryAbi = ["function getPair(address, address) external view returns (address)"];
        const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, provider);
        
        // Get LP pair address
        const lpPairAddress = await factoryContract.getPair(CONTRACTS.XEN, CONTRACTS.XBURN);
        console.log("LP Pair address:", lpPairAddress);
        
        if (lpPairAddress && lpPairAddress !== ethers.constants.AddressZero) {
          // LP Pair ABI for getting reserves
          const lpPairAbi = [
            "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() external view returns (address)"
          ];
          
          // Create LP pair contract instance
          const lpPairContract = new ethers.Contract(lpPairAddress, lpPairAbi, provider);
          
          // Get token order in the pair
          const token0 = await lpPairContract.token0();
          console.log("Token0:", token0);
          
          // Get reserves
          const reserves = await lpPairContract.getReserves();
          console.log("Reserves:", reserves);
          
          // Determine which reserve is XEN and which is XBURN
          if (token0.toLowerCase() === CONTRACTS.XEN.toLowerCase()) {
            xenInPool = reserves.reserve0;
            xburnInPool = reserves.reserve1;
          } else {
            xenInPool = reserves.reserve1;
            xburnInPool = reserves.reserve0;
          }
          
          console.log("XEN in pool:", ethers.utils.formatUnits(xenInPool, 18));
          console.log("XBURN in pool:", ethers.utils.formatUnits(xburnInPool, 18));
        }
      } catch (error) {
        console.error("Error fetching LP pool data:", error);
      }
      
      console.log("Stats loaded:", {
        totalXenBurned: ethers.utils.formatUnits(stats.globalXenBurned, 18),
        totalXburnMinted: ethers.utils.formatUnits(stats.totalXburnSupply, 18),
        totalXburnBurned: ethers.utils.formatUnits(stats.globalXburnBurned, 18),
        globalBurnRank: globalBurnRank.toString(),
        userXenBurned: ethers.utils.formatUnits(stats.userXenBurnedAmount, 18),
        userXburnMinted: ethers.utils.formatUnits(stats.userXburnBalance, 18),
        userXburnBurned: ethers.utils.formatUnits(stats.userXburnBurnedAmount, 18),
        xenSupply: ethers.utils.formatUnits(xenSupply, 18),
        xenInPool: ethers.utils.formatUnits(xenInPool, 18),
        xburnInPool: ethers.utils.formatUnits(xburnInPool, 18)
      });
      
      setStats({
        loading: false,
        error: null,
        data: {
          totalXenBurned: ethers.utils.formatUnits(stats.globalXenBurned, 18),
          totalXburnMinted: ethers.utils.formatUnits(stats.totalXburnSupply, 18),
          totalXburnBurned: ethers.utils.formatUnits(stats.globalXburnBurned, 18),
          globalBurnRank: globalBurnRank.toString(),
          userXenBurned: ethers.utils.formatUnits(stats.userXenBurnedAmount, 18),
          userXburnMinted: ethers.utils.formatUnits(stats.userXburnBalance, 18),
          userXburnBurned: ethers.utils.formatUnits(stats.userXburnBurnedAmount, 18),
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
  }, [account, provider]);

  // Load data when account changes
  useEffect(() => {
    if (account && provider) {
      console.log("Account changed, loading data for", account);
      loadBalances();
      loadNFTs();
      loadStats();
    }
  }, [account, provider, loadBalances, loadNFTs, loadStats]);

  // Refresh balances periodically
  useEffect(() => {
    if (!account) return;

    const intervalId = setInterval(loadBalances, 30000); // Every 30 seconds
    return () => clearInterval(intervalId);
  }, [account, loadBalances]);

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
    balances,
    loadBalances,
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