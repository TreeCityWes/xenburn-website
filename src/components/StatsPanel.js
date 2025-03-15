import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import './StatsPanel.css';
import FireParticles from './FireParticles';

// Format large numbers with K, M, B, T suffixes and special handling for ratios
const formatNumber = (num, isRatio = false) => {
  if (!num) return isRatio ? '0.031478' : '0.00';
  
  const n = parseFloat(num);
  if (isNaN(n)) return isRatio ? '0.031478' : '0.00';
  
  // Handle scientific notation (e.g., 1.15792089237316e+50B)
  if (String(num).includes('e+')) {
    // Special case for extremely large values (likely MAX_UINT256)
    if (n > 1e20) return "999T+";
    return "999T+";
  }
  
  // Cap at 999T+
  if (n > 999e12) return '999T+';
  
  // Handle large numbers with proper suffixes
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  
  // Special case for ratio
  if (isRatio) {
    return n.toFixed(6);
  }
  
  // For regular numbers
  return n.toFixed(2);
};

export const StatsPanel = () => {
  console.log("StatsPanel rendering");
  
  const { 
    account, 
    provider,
    xenBalance, 
    xburnBalance,
    xburnMinterContract,
    safeRequest,
    xenApprovalRaw,
    xburnApprovalRaw
  } = useWallet();

  // State for tracking stats
  const [stats, setStats] = useState({
    xenBalance: '0',
    xenApproval: '0',
    userXenBurned: '0',
    xburnBalance: '0',
    xburnApproval: '0',
    userXburnBurned: '0',
    xenSupply: '0',
    xburnSupply: '0',
    xenInPool: '0',
    xburnInPool: '0',
    globalXenBurned: '0',
    globalXburnBurned: '0',
    xenPerXburn: '0.031478',
    burnRatio: '100,000'
  });

  // Log wallet context values for debugging
  console.log("StatsPanel wallet context:", { 
    hasAccount: !!account, 
    hasProvider: !!provider,
    hasXenBalance: !!xenBalance,
    hasXburnBalance: !!xburnBalance,
    hasContract: !!xburnMinterContract,
    hasXenApproval: !!xenApprovalRaw,
    hasXburnApproval: !!xburnApprovalRaw
  });

  // Update stats when balances or approvals change
  useEffect(() => {
    console.log("StatsPanel updating from balance/approval changes:", { 
      xenBalance, 
      xburnBalance,
      xenApprovalRaw: xenApprovalRaw ? ethers.utils.formatUnits(xenApprovalRaw, 18) : null,
      xburnApprovalRaw: xburnApprovalRaw ? ethers.utils.formatUnits(xburnApprovalRaw, 18) : null
    });
    
    // Update the stats with the latest values
    setStats(prevStats => {
      // Format approved values to ensure they're properly handled
      const xenApproval = xenApprovalRaw ? ethers.utils.formatUnits(xenApprovalRaw, 18) : prevStats.xenApproval;
      const xburnApproval = xburnApprovalRaw ? ethers.utils.formatUnits(xburnApprovalRaw, 18) : prevStats.xburnApproval;
      
      return {
        ...prevStats,
        xenBalance: xenBalance || prevStats.xenBalance,
        xburnBalance: xburnBalance || prevStats.xburnBalance,
        xenApproval,
        xburnApproval
      };
    });
  }, [xenBalance, xburnBalance, xenApprovalRaw, xburnApprovalRaw]);

  // Define fetchContractStats at component level
  const fetchContractStats = useCallback(async () => {
    try {
      console.log("Fetching contract stats...");
      
      if (!xburnMinterContract) {
        console.warn("xburnMinterContract is not available yet");
        return;
      }
      
      console.log("Using contract at address:", xburnMinterContract.address);
      
      // Define direct xen and xburn token contracts from known addresses
      const XEN_ADDRESS = "0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB"; // Sepolia XEN
      const XBURN_ADDRESS = xburnMinterContract.address;
      
      // Basic ERC20 ABI for token operations
      const ERC20_ABI = [
        "function totalSupply() external view returns (uint256)",
        "function balanceOf(address account) external view returns (uint256)",
        "function transfer(address recipient, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
      ];
      
      // Create token contracts
      const xenTokenContract = new ethers.Contract(XEN_ADDRESS, ERC20_ABI, provider);
      
      // Initialize a batch of parallel promises to fetch multiple pieces of data at once
      const promises = [];
      const results = {
        userStats: null,
        combinedStats: null,
        globalStats: null,
        xenSupply: null,
        baseRatio: null,
        pairAddress: null,
        pairData: null,
        totalBurned: null
      };
      
      // 1. Try to get user-specific stats first
      if (account) {
        if (typeof xburnMinterContract.getUserStats === 'function') {
          console.log("Attempting to fetch user stats for account:", account);
          promises.push(
            safeRequest(
              () => xburnMinterContract.getUserStats(account),
              'Error fetching user stats'
            )
            .then(data => { results.userStats = data; })
            .catch(error => { console.error("Error fetching user stats:", error); })
          );
        }
        
        // 2. Try to get combined stats next
        if (typeof xburnMinterContract.getStats === 'function' && account) {
          console.log(`Attempting to fetch combined stats for account: ${account}`);
          promises.push(
            safeRequest(
              () => xburnMinterContract.getStats(account),
              'Error fetching combined stats'
            )
            .then(data => { 
              results.combinedStats = data;
              console.log("Combined stats raw data:", data);
              // Log each property of the returned data
              if (data) {
                console.log("Combined stats properties:");
                if (typeof data === 'object') {
                  // For object-style return
                  for (const prop in data) {
                    if (typeof data[prop]?.toString === 'function') {
                      console.log(`${prop}: ${data[prop].toString()}`);
                    } else {
                      console.log(`${prop}: ${data[prop]}`);
                    }
                  }
                } else if (Array.isArray(data)) {
                  // For array-style return
                  data.forEach((value, index) => {
                    if (typeof value?.toString === 'function') {
                      console.log(`[${index}]: ${value.toString()}`);
                    } else {
                      console.log(`[${index}]: ${value}`);
                    }
                  });
                }
              }
            })
            .catch(error => { console.error("Error fetching combined stats:", error); })
          );
        }
      }
      
      // 3. Try to get global stats
      if (typeof xburnMinterContract.getGlobalStats === 'function') {
        console.log("Attempting to fetch global stats");
        promises.push(
          safeRequest(
            () => xburnMinterContract.getGlobalStats(),
            'Error fetching global stats'
          )
          .then(data => { 
            results.globalStats = data;
            console.log("Global stats raw data:", data);
            // Log each property of the returned data
            if (data) {
              console.log("Global stats properties:");
              if (typeof data === 'object') {
                // For object-style return
                for (const prop in data) {
                  if (typeof data[prop]?.toString === 'function') {
                    console.log(`${prop}: ${data[prop].toString()}`);
                  } else {
                    console.log(`${prop}: ${data[prop]}`);
                  }
                }
              } else if (Array.isArray(data)) {
                // For array-style return
                data.forEach((value, index) => {
                  if (typeof value?.toString === 'function') {
                    console.log(`[${index}]: ${value.toString()}`);
                  } else {
                    console.log(`[${index}]: ${value}`);
                  }
                });
              }
            }
          })
          .catch(error => { console.error("Error fetching global stats:", error); })
        );
      }
      
      // 4. Get the BASE_RATIO constant
      if (typeof xburnMinterContract.BASE_RATIO === 'function') {
        console.log("Attempting to fetch BASE_RATIO");
        promises.push(
          safeRequest(
            () => xburnMinterContract.BASE_RATIO(),
            'Error fetching BASE_RATIO'
          )
          .then(data => { results.baseRatio = data; })
          .catch(error => { console.error("Error fetching BASE_RATIO:", error); })
        );
      } else {
        // Hardcoded fallback for BASE_RATIO
        results.baseRatio = 100000;
      }
      
      // 5. Try to fetch XEN supply from contract
      console.log("Attempting to fetch XEN supply");
      promises.push(
        safeRequest(
          () => xenTokenContract.totalSupply(),
          'Error fetching XEN supply'
        )
        .then(data => { results.xenSupply = data; })
        .catch(error => { console.error("Error fetching XEN supply:", error); })
      );
      
      // 6. Try to get liquidity pair address
      if (typeof xburnMinterContract.liquidityPair === 'function') {
        console.log("Attempting to fetch liquidity pair address");
        promises.push(
          safeRequest(
            () => xburnMinterContract.liquidityPair(),
            'Error fetching liquidity pair'
          )
          .then(data => { results.pairAddress = data; })
          .catch(error => { console.error("Error fetching liquidity pair:", error); })
        );
      }
      
      // Add direct calls to getTotalXenBurned and getTotalXburnBurned if available
      if (typeof xburnMinterContract.getTotalXenBurned === 'function') {
        console.log("Attempting to fetch total XEN burned");
        promises.push(
          safeRequest(
            () => xburnMinterContract.getTotalXenBurned(),
            'Error fetching total XEN burned'
          )
          .then(data => { 
            console.log("Total XEN burned:", data.toString());
            setStats(prevStats => ({
              ...prevStats,
              globalXenBurned: ethers.utils.formatUnits(data, 18)
            }));
          })
          .catch(error => { console.error("Error fetching total XEN burned:", error); })
        );
      }
      
      if (typeof xburnMinterContract.getTotalXburnBurned === 'function') {
        console.log("Attempting to fetch total XBURN burned");
        promises.push(
          safeRequest(
            () => xburnMinterContract.getTotalXburnBurned(),
            'Error fetching total XBURN burned'
          )
          .then(data => { 
            console.log("Total XBURN burned:", data.toString());
            setStats(prevStats => ({
              ...prevStats,
              globalXburnBurned: ethers.utils.formatUnits(data, 18)
            }));
          })
          .catch(error => { console.error("Error fetching total XBURN burned:", error); })
        );
      }
      
      // Add a direct call to getTotalBurned if available
      if (typeof xburnMinterContract.getTotalBurned === 'function') {
        console.log("Attempting to fetch total burned amounts");
        promises.push(
          safeRequest(
            () => xburnMinterContract.getTotalBurned(),
            'Error fetching total burned amounts'
          )
          .then(data => { results.totalBurned = data; })
          .catch(error => { console.error("Error fetching total burned:", error); })
        );
      }
      
      // Wait for all promises to complete
      await Promise.all(promises);
      
      // Process and update state with the retrieved data
      
      // 1. Process user stats
      if (results.userStats) {
        console.log("User stats retrieved:", results.userStats);
        // Log all properties to debug the structure
        console.log("User stats properties:");
        for (const prop in results.userStats) {
          console.log(`${prop}: ${results.userStats[prop]?.toString()}`);
        }
        
        setStats(prevStats => ({
          ...prevStats,
          userXenBurned: ethers.utils.formatUnits(results.userStats.userXenBurnedAmount || 0, 18),
          userXburnBurned: ethers.utils.formatUnits(results.userStats.userXburnBurnedAmount || 0, 18)
        }));
      }
      
      // 2. Process combined stats
      if (results.combinedStats) {
        console.log("Processing combined stats...");
        
        // Check for the correct property names that contain the global burn data
        const hasXenBurned = 'xenBurned' in results.combinedStats;
        const hasXBurnBurned = 'xburnBurned' in results.combinedStats;
        const hasTotalXenBurned = 'totalXenBurned' in results.combinedStats;
        const hasTotalXBurnBurned = 'totalXBurnBurned' in results.combinedStats;
        const hasUserXenBurnedAmount = 'userXenBurnedAmount' in results.combinedStats;
        const hasUserXburnBurnedAmount = 'userXburnBurnedAmount' in results.combinedStats;
        const hasTotalXburnSupply = 'totalXburnSupply' in results.combinedStats;
        const hasGlobalXenBurned = 'globalXenBurned' in results.combinedStats;
        const hasGlobalXburnBurned = 'globalXburnBurned' in results.combinedStats;
        
        console.log("Available properties in combinedStats:", {
          hasXenBurned,
          hasXBurnBurned,
          hasTotalXenBurned,
          hasTotalXBurnBurned,
          hasUserXenBurnedAmount,
          hasUserXburnBurnedAmount,
          hasTotalXburnSupply,
          hasGlobalXenBurned,
          hasGlobalXburnBurned
        });
        
        // Update state with available stats
        setStats(prevStats => {
          const updatedStats = { ...prevStats };
          
          // Try to set user burn stats from various possible property names
          if (hasUserXenBurnedAmount && results.combinedStats.userXenBurnedAmount) {
            updatedStats.userXenBurned = ethers.utils.formatUnits(results.combinedStats.userXenBurnedAmount, 18);
            console.log("Set userXenBurned from userXenBurnedAmount:", updatedStats.userXenBurned);
          } else if (hasXenBurned && results.combinedStats.xenBurned) {
            updatedStats.userXenBurned = ethers.utils.formatUnits(results.combinedStats.xenBurned, 18);
            console.log("Set userXenBurned from xenBurned:", updatedStats.userXenBurned);
          }
          
          if (hasUserXburnBurnedAmount && results.combinedStats.userXburnBurnedAmount) {
            updatedStats.userXburnBurned = ethers.utils.formatUnits(results.combinedStats.userXburnBurnedAmount, 18);
            console.log("Set userXburnBurned from userXburnBurnedAmount:", updatedStats.userXburnBurned);
          } else if (hasXBurnBurned && results.combinedStats.xburnBurned) {
            updatedStats.userXburnBurned = ethers.utils.formatUnits(results.combinedStats.xburnBurned, 18);
            console.log("Set userXburnBurned from xburnBurned:", updatedStats.userXburnBurned);
          }
          
          // Set global burn stats - prioritize named properties over indices
          if (hasGlobalXenBurned && results.combinedStats.globalXenBurned) {
            updatedStats.globalXenBurned = ethers.utils.formatUnits(results.combinedStats.globalXenBurned, 18);
            console.log("Set globalXenBurned from globalXenBurned:", updatedStats.globalXenBurned);
          } else if (hasTotalXenBurned && results.combinedStats.totalXenBurned) {
            updatedStats.globalXenBurned = ethers.utils.formatUnits(results.combinedStats.totalXenBurned, 18);
            console.log("Set globalXenBurned from totalXenBurned:", updatedStats.globalXenBurned);
          }
          
          if (hasGlobalXburnBurned && results.combinedStats.globalXburnBurned) {
            updatedStats.globalXburnBurned = ethers.utils.formatUnits(results.combinedStats.globalXburnBurned, 18);
            console.log("Set globalXburnBurned from globalXburnBurned:", updatedStats.globalXburnBurned);
          } else if (hasTotalXBurnBurned && results.combinedStats.totalXBurnBurned) {
            updatedStats.globalXburnBurned = ethers.utils.formatUnits(results.combinedStats.totalXBurnBurned, 18);
            console.log("Set globalXburnBurned from totalXBurnBurned:", updatedStats.globalXburnBurned);
          }
          
          // Set XBURN supply if available
          if (hasTotalXburnSupply && results.combinedStats.totalXburnSupply) {
            updatedStats.xburnSupply = ethers.utils.formatUnits(results.combinedStats.totalXburnSupply, 18);
            console.log("Set xburnSupply from totalXburnSupply:", updatedStats.xburnSupply);
          }
          
          return updatedStats;
        });
      }
      
      // 3. Process global stats
      if (results.globalStats) {
        console.log("Processing global stats...");
        
        // This will help identify what properties are available and their values
        const hasXenBurned = 'xenBurned' in results.globalStats;
        const hasXBurnBurned = 'xburnBurned' in results.globalStats;
        const hasTotalXenBurned = 'totalXenBurned' in results.globalStats;
        const hasTotalXBurnBurned = 'totalXBurnBurned' in results.globalStats;
        const hasTotalBurnedXEN = 'totalBurnedXEN' in results.globalStats;
        const hasTotalMintedXBURN = 'totalMintedXBURN' in results.globalStats;
        
        console.log("Available properties in globalStats:", {
          hasXenBurned,
          hasXBurnBurned,
          hasTotalXenBurned,
          hasTotalXBurnBurned,
          hasTotalBurnedXEN,
          hasTotalMintedXBURN
        });
        
        // Try different property names for global burned values
        setStats(prevStats => {
          const updatedStats = { ...prevStats };
          
          // Only update if we haven't already set these values from combinedStats
          if (!updatedStats.globalXenBurned || updatedStats.globalXenBurned === '0' || 
              parseFloat(updatedStats.globalXenBurned) < 0.1) {
            
            if (hasTotalBurnedXEN && results.globalStats.totalBurnedXEN) {
              updatedStats.globalXenBurned = ethers.utils.formatUnits(results.globalStats.totalBurnedXEN, 18);
              console.log("Set globalXenBurned from totalBurnedXEN:", updatedStats.globalXenBurned);
            } else if (hasXenBurned && results.globalStats.xenBurned) {
              updatedStats.globalXenBurned = ethers.utils.formatUnits(results.globalStats.xenBurned, 18);
              console.log("Set globalXenBurned from xenBurned:", updatedStats.globalXenBurned);
            } else if (hasTotalXenBurned && results.globalStats.totalXenBurned) {
              updatedStats.globalXenBurned = ethers.utils.formatUnits(results.globalStats.totalXenBurned, 18);
              console.log("Set globalXenBurned from totalXenBurned:", updatedStats.globalXenBurned);
            }
          }
          
          if (!updatedStats.globalXburnBurned || updatedStats.globalXburnBurned === '0' || 
              parseFloat(updatedStats.globalXburnBurned) < 0.1) {
              
            if (hasTotalMintedXBURN && results.globalStats.totalMintedXBURN) {
              updatedStats.globalXburnBurned = ethers.utils.formatUnits(results.globalStats.totalMintedXBURN, 18);
              console.log("Set globalXburnBurned from totalMintedXBURN:", updatedStats.globalXburnBurned);
            } else if (hasXBurnBurned && results.globalStats.xburnBurned) {
              updatedStats.globalXburnBurned = ethers.utils.formatUnits(results.globalStats.xburnBurned, 18);
              console.log("Set globalXburnBurned from xburnBurned:", updatedStats.globalXburnBurned);
            } else if (hasTotalXBurnBurned && results.globalStats.totalXBurnBurned) {
              updatedStats.globalXburnBurned = ethers.utils.formatUnits(results.globalStats.totalXBurnBurned, 18);
              console.log("Set globalXburnBurned from totalXBurnBurned:", updatedStats.globalXburnBurned);
            }
          }
          
          // Only update these when using array indices if we haven't set them from properties
          if ((!updatedStats.globalXenBurned || updatedStats.globalXenBurned === '0' || 
               parseFloat(updatedStats.globalXenBurned) < 0.1) && 
              (Array.isArray(results.globalStats) || results.globalStats[2] !== undefined)) {
            
            // Use index 2 which is totalBurnedXEN in the GlobalStats return
            if (results.globalStats[2]) {
              updatedStats.globalXenBurned = ethers.utils.formatUnits(results.globalStats[2], 18);
              console.log("Set globalXenBurned from index 2 (totalBurnedXEN):", updatedStats.globalXenBurned);
            }
          }
          
          if ((!updatedStats.globalXburnBurned || updatedStats.globalXburnBurned === '0' || 
               parseFloat(updatedStats.globalXburnBurned) < 0.1) && 
              (Array.isArray(results.globalStats) || results.globalStats[3] !== undefined)) {
            
            // Use index 3 which is totalMintedXBURN in the GlobalStats return
            if (results.globalStats[3]) {
              updatedStats.globalXburnBurned = ethers.utils.formatUnits(results.globalStats[3], 18);
              console.log("Set globalXburnBurned from index 3 (totalMintedXBURN):", updatedStats.globalXburnBurned);
            }
          }
          
          return updatedStats;
        });
      }
      
      // 4. Process BASE_RATIO
      if (results.baseRatio) {
        console.log("Base ratio retrieved:", results.baseRatio.toString());
        setStats(prevStats => ({
          ...prevStats,
          burnRatio: formatNumber(results.baseRatio)
        }));
      }
      
      // 5. Process XEN supply
      if (results.xenSupply) {
        console.log("XEN supply retrieved:", results.xenSupply.toString());
        setStats(prevStats => ({
          ...prevStats,
          xenSupply: ethers.utils.formatUnits(results.xenSupply, 18)
        }));
      }
      
      // 6. Process liquidity pair data if available
      if (results.pairAddress && results.pairAddress !== ethers.constants.AddressZero) {
        console.log("Liquidity pair address:", results.pairAddress);
        
        // Create the pair contract instance to get reserves
        const pairABI = [
          'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
          'function token0() external view returns (address)',
          'function token1() external view returns (address)'
        ];
        
        const pairContract = new ethers.Contract(results.pairAddress, pairABI, provider);
        
        try {
          // Get token order and reserves in parallel
          const [token0, reserves] = await Promise.all([
            safeRequest(() => pairContract.token0(), 'Error fetching token0'),
            safeRequest(() => pairContract.getReserves(), 'Error fetching reserves')
          ]);
          
          if (token0 && reserves) {
            console.log("Token0 address:", token0);
            const [reserve0, reserve1] = reserves;
            console.log("Reserves:", { 
              reserve0: reserve0?.toString(), 
              reserve1: reserve1?.toString() 
            });
            
            // Determine which reserve is XEN and which is XBURN
            let xenInPool, xburnInPool;
            
            if (token0.toLowerCase() === XBURN_ADDRESS.toLowerCase()) {
              // XBURN is token0, XEN is token1
              xburnInPool = ethers.utils.formatUnits(reserve0 || 0, 18);
              xenInPool = ethers.utils.formatUnits(reserve1 || 0, 18);
            } else {
              // XEN is token0, XBURN is token1
              xenInPool = ethers.utils.formatUnits(reserve0 || 0, 18);
              xburnInPool = ethers.utils.formatUnits(reserve1 || 0, 18);
            }
            
            // Calculate XEN per XBURN ratio
            const xburnPoolNum = parseFloat(xburnInPool);
            const xenPoolNum = parseFloat(xenInPool);
            let xenPerXburnRatio = "0.031478";
            
            if (xburnPoolNum > 0) {
              xenPerXburnRatio = (xenPoolNum / xburnPoolNum).toFixed(6);
            }
            
            console.log("Pool stats calculated:", { 
              xenInPool, 
              xburnInPool, 
              xenPerXburnRatio 
            });
            
            // Update the stats
            setStats(prevStats => ({
              ...prevStats,
              xenInPool,
              xburnInPool,
              xenPerXburn: xenPerXburnRatio
            }));
          }
        } catch (error) {
          console.error("Error processing pool data:", error);
        }
      } else {
        console.log("No liquidity pair address found or zero address returned");
      }
      
      // Process total burned data if available
      if (results.totalBurned) {
        console.log("Total burned data retrieved:", results.totalBurned);
        // Log all properties
        console.log("Total burned properties:");
        for (const prop in results.totalBurned) {
          console.log(`${prop}: ${results.totalBurned[prop]?.toString()}`);
        }
        
        // Try to extract the burned amounts
        let totalXenBurned = 0;
        let totalXburnBurned = 0;
        
        if (results.totalBurned.xenBurned) {
          totalXenBurned = results.totalBurned.xenBurned;
        } else if (results.totalBurned.totalXenBurned) {
          totalXenBurned = results.totalBurned.totalXenBurned;
        } else if (results.totalBurned[0]) {
          // It might be an array or tuple
          totalXenBurned = results.totalBurned[0];
        }
        
        if (results.totalBurned.xburnBurned) {
          totalXburnBurned = results.totalBurned.xburnBurned;
        } else if (results.totalBurned.totalXburnBurned) {
          totalXburnBurned = results.totalBurned.totalXburnBurned;
        } else if (results.totalBurned[1]) {
          // It might be an array or tuple
          totalXburnBurned = results.totalBurned[1];
        }
        
        if (totalXenBurned || totalXburnBurned) {
          setStats(prevStats => ({
            ...prevStats,
            globalXenBurned: ethers.utils.formatUnits(totalXenBurned, 18),
            globalXburnBurned: ethers.utils.formatUnits(totalXburnBurned, 18)
          }));
        }
      }
      
      console.log("Contract stats fetch complete");
      
    } catch (error) {
      console.error("Error in fetchContractStats:", error);
    }
  }, [account, xburnMinterContract, provider, safeRequest]);

  // Fetch additional stats when account changes
  useEffect(() => {
    console.log("StatsPanel account effect triggered:", { account });
    
    if (account && xburnMinterContract) {
      fetchContractStats();
    }
  }, [account, xburnMinterContract, fetchContractStats]);

  // Ensure component always renders even if some props are missing
  return (
    <div className="stats-panel">
      <div className="stats-header">
        <h3>User Stats & Info</h3>
      </div>
      
      <div className="stats-grid">
        {/* XEN Stats - White */}
        {[
          { title: "XEN Balance", value: stats.xenBalance, type: "xen" },
          { title: "XEN Approved", value: stats.xenApproval, type: "xen" },
          { title: "User Xen 🔥", value: stats.userXenBurned, type: "xen" }
        ].map((stat, i) => (
          <div key={i} className={`stat-box ${stat.type}`}>
            <FireParticles width={200} height={100} intensity={0.3} type={stat.type} />
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">{formatNumber(stat.value)}</div>
            </div>
          </div>
        ))}

        {/* XBURN Stats - Orange */}
        {[
          { title: "XBURN Balance", value: stats.xburnBalance, type: "xburn" },
          { title: "XBURN Approved", value: stats.xburnApproval, type: "xburn" },
          { title: "User XBurn 🔥", value: stats.userXburnBurned, type: "xburn" }
        ].map((stat, i) => (
          <div key={i} className={`stat-box ${stat.type}`}>
            <FireParticles width={200} height={100} intensity={0.3} type={stat.type} />
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">{formatNumber(stat.value)}</div>
            </div>
          </div>
        ))}

        {/* Supply Stats - Yellow */}
        {[
          { title: "XEN SUPPLY", value: stats.xenSupply, type: "supply" },
          { title: "XBURN SUPPLY", value: stats.xburnSupply, type: "supply" },
          { 
            title: "CONTRACT",
            value: <a 
              href="https://sepolia.etherscan.io/address/0xd60483890f9aae31bc19cef2523072151f23c54c"
              target="_blank"
              rel="noopener noreferrer"
              className="stat-value link"
            >
              $XBURN
            </a>,
            type: "supply"
          }
        ].map((stat, i) => (
          <div key={i} className={`stat-box ${stat.type}`}>
            <FireParticles width={200} height={100} intensity={0.3} type={stat.type} />
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">
                {typeof stat.value === 'object' ? stat.value : formatNumber(stat.value)}
              </div>
            </div>
          </div>
        ))}

        {/* Pool Stats - Red */}
        {[
          { title: "XEN IN POOL", value: stats.xenInPool, type: "pool" },
          { title: "XBURN IN POOL", value: stats.xburnInPool, type: "pool" },
          { title: "Xen per Xburn", value: stats.xenPerXburn, type: "pool", isRatio: true }
        ].map((stat, i) => (
          <div key={i} className={`stat-box ${stat.type}`}>
            <FireParticles width={200} height={100} intensity={0.3} type={stat.type} />
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">
                {formatNumber(stat.value, stat.isRatio)}
              </div>
            </div>
          </div>
        ))}

        {/* Global Burn Stats - Purple */}
        {[
          { title: "Global Xen 🔥", value: stats.globalXenBurned, type: "global" },
          { title: "Global XBurn 🔥", value: stats.globalXburnBurned, type: "global" },
          { title: "Burn Ratio", value: `${stats.burnRatio}:1`, type: "global" }
        ].map((stat, i) => (
          <div key={i} className={`stat-box ${stat.type}`}>
            <FireParticles width={200} height={100} intensity={0.3} type={stat.type} />
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">
                {stat.title.includes("Ratio") ? stat.value : formatNumber(stat.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 