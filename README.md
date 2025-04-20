X.com Account: @BurnMoreXen
T.me Telegram channel:  @BurnMoreXen 
Website: BurnXen.com 
The Litpaper: https://xenburner.gitbook.io/xenburner


This app interacts with src/contracts Solidity and ABI Json  files. 
1) Users approve XEN in Xen contract 
2) Users burn XEN by calling burn function in XBURN contract
3) Users can also approve and burn XBURN
4) App should also track prorgress and stats using  getStats and other functions
5) once xen threshold set in contract is reached, users can hit Swap and Burn button which does not take an amount and simply calls the function on the contract using the ABI. 

in the public folder is xenburn.png whic his the hero/title image 

logo192.png and logo512.png can be used for logo / favicon / social media 



4. **Stats Display**
- 4x2 grid of stat cards showing:
  - XEN Balance
  - XBURN Balance
  - XEN Approved
  - Your XEN Burned
  - XBURN Burned
  - XBURN Balance
  - Your Burn %
  - Global Burn %

5. **Social Links**
- Three cards in a row:
  - "The Lit Book"  - Gitbook link
  - "Fire Follow" - X.com link
  - "Spark a Convo" - Telegram link

### Technical Implementation

1. **Smart Contracts**
```solidity
// Main contract address (Sepolia)
XEN: "0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB"
XenBurner: "0x644D5B0fFd68bD3215e3FcD869E23E8b8B0f481d"
XBurnNFT: "0x1EbC3157Cc44FE1cb0d7F4764D271BAD3deB9a03"
Liquidity Pair: "0xE29b614646004c9411f0b7EBE06fBe7E9bb0908D"
Router: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"
```

2. **Key Contract Functions**
```solidity
// XEN Contract
- balanceOf(address)
- approve(address, uint256)
- allowance(address, address)

// XenBurner Contract
- burnXen(uint256 amount)
- burnXburn(uint256 amount)
- swapXenForXburn(uint256 minReceived)
- getStats(address user) returns (
    uint256 userXenBurned,
    uint256 userXburnBurned,
    uint256 userXburnBalance,
    uint256 userBurnPercentage,
    uint256 globalXenBurned,
    uint256 globalXburnBurned,
    uint256 totalXburnSupply,
    uint256 globalBurnPercentage
)
- getAccumulationProgress() returns (
    uint256 accumulated,
    uint256 threshold,
    uint256 percentage
)
``
```

# XenBurner Website Refactoring

This project has been refactored to improve code organization and maintainability.

## Refactoring Changes

### 1. Utility Functions Extraction

All utility functions have been moved to a dedicated file:

- `src/utils/tokenUtils.js` - Contains functions for token formatting and calculations:
  - `formatDecimals` - Formats numbers with appropriate decimal places
  - `safeFormatMaxBalance` - Safely formats token balance for MAX button
  - `formatTokenAmount` - Formats raw BigNumber values to human-readable amounts
  - `parseInputValue` - Sanitizes input values for token amounts
  - `calculateDaysForMultiplier` - Calculates days needed for a specific multiplier
  - `calculateMultiplier` - Calculates multiplier based on days

### 2. Constants Extraction

Constants have been moved to a dedicated file:

- `src/utils/constants.js` - Contains ABIs and other constants:
  - `ROUTER_ABI` - Uniswap Router ABI
  - `PAIR_ABI` - Uniswap Pair ABI
  - `MAX_TERM_DAYS` - Maximum days for term (3650)
  - `DEFAULT_AMP_START` - Default amplification start parameter
  - `DEFAULT_AMP_SNAPSHOT` - Default amplification snapshot parameter

### 3. UI Components Extraction

Reusable UI components have been moved to a dedicated file:

- `src/utils/components.js` - Contains reusable UI components:
  - `TabView` - Tab navigation component
  - `InputToken` - Input token component with token logo and balance display
  - `OutputToken` - Output token component for displaying token output
  - `SwapDetails` - Swap details component for displaying exchange information
  - `Tooltip` - Tooltip component for better UX
  - `TermSelect` - Term selection component for choosing lock duration

## Next Steps

1. **Testing**: Test all functionality to ensure the refactoring hasn't broken anything.
2. **Further Refactoring**: Consider breaking down the BurnPanel component into smaller, more focused components.
3. **Code Review**: Review the code for any remaining issues or opportunities for improvement.

## Benefits of This Refactoring

1. **Improved Maintainability**: Code is now more organized and easier to maintain.
2. **Better Reusability**: UI components and utility functions can be reused across the application.
3. **Reduced File Size**: The BurnPanel.js file is now significantly smaller and more focused.
4. **Better Separation of Concerns**: UI components, utility functions, and constants are now properly separated.

## Post-Audit Contract Updates (April 19, 2025)

Following a security audit completed on April 19, 2025, the following changes were implemented in the `XBurnMinter.sol` contract based on the audit recommendations and a final review of token economic parameters:

### Code Changes Implemented:

1.  **Minimum Burn Amount Check:**
    *   Added a `require(amount >= BASE_RATIO, "InvalidAmount")` check to the `burnXEN` function. This prevents users from burning an amount of XEN too small to generate any base XBURN (due to integer division), ensuring the amount is at least the `BASE_RATIO` (now 1,000,000 XEN).
2.  **`nonReentrant` Modifier on `initializeLiquidity`:**
    *   Added the `nonReentrant` modifier to the `initializeLiquidity` function for consistency and robustness, aligning with best practices even for `onlyOwner` functions.

### Finalized Token Economic Parameters:

The following parameters were confirmed and updated in the contracts (`XBurnMinter.sol`, `XBurnNFT.sol`) or defined for deployment:

*   **Base Burn Rate:** `1,000,000` cbXEN per 1 XBURN (`BASE_RATIO` constant).
*   **Seed LP Amounts:** `1,000,000,000,000` cbXEN + `1,000,000` XBURN (`MINIMUM_LIQUIDITY` and `INITIAL_SUPPLY` constants).
*   **cbXEN Burn Split:** 80% destroyed, 20% saved for swap (handled in `_handleXenTokens` logic).
*   **Swap-and-Burn Trigger:** `500,000,000` cbXEN accumulated (`SWAP_THRESHOLD` constant).
*   **Caller Bounty:** 5% of the threshold (`CALLER_REWARD_PERCENTAGE` constant).
*   **Liquidity Pool Lock:** 100% LP tokens locked for >= 1 year (Operational step for deployment).
*   **Owner Renouncement:** Owner privileges to be renounced post-deployment (Operational step).

These updates address the actionable feedback from the audit and finalize the core mechanics for mainnet.