X.com Account: @BurnMoreXen
T.me Telegram channel:  @BurnMoreXen 
Website: BurnXen.com 
The Litpaper: https://xenburner.gitbook.io/xenburner

Sepolia Xen: 0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB
Sepolia Xburn: 0xd60483890f9aae31bc19cef2523072151f23c54c

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
XenBurner: "0xd60483890f9aae31bc19cef2523072151f23c54c"
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

The dApp provides a clean, dark-themed interface for interacting with the Xen and XenBurner protocol on Sepolia testnet, with real-time updates of balances and stats, and clear user feedback for all operations.
