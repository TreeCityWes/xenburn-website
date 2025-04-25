/**
 * Contract addresses for the application
 */

import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/XBurnMinter.json';
import xburnNftAbi from '../contracts/XBurnNFT.json';

// Base Mainnet Addresses
export const XEN_ADDRESS = '0xffcbF84650cE02DaFE96926B37a0ac5E34932fa5'; // cbXEN on Base
export const XBURN_MINTER_ADDRESS = '0xe89AFDeFeBDba033f6e750615f0A0f1A37C78c4A'; // XBurnMinter
export const XENBURNER_ADDRESS = '0xe89AFDeFeBDba033f6e750615f0A0f1A37C78c4A'; // Alias for XBurnMinter
export const XBURN_NFT_ADDRESS = '0x305C60D2fEf49FADfEe67EC530DE98f67bac861D'; // XBurnNFT 
export const XBURN_TOKEN_ADDRESS = '0xe89AFDeFeBDba033f6e750615f0A0f1A37C78c4A'; // The actual XBURN ERC20 token

// DEX / Liquidity Related (Using Uniswap v3 Universal Router on Base)
export const UNISWAP_ROUTER_ADDRESS = '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'; // Provided Router Address
export const XBURN_XEN_LP_ADDRESS = '0x93e39bd6854d960a0c4f5b592381bb8356a2d725'; // Provided Liquidity Pair Address

// Wrapped Ether (WETH on Base)
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'; 

// -- Sepolia Testnet Addresses (Keep for reference or remove) --
// export const XEN_ADDRESS = '0x7D3832d9239a0D1130C75e21076580d13C80F703';
// export const XBURN_MINTER_ADDRESS = '0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189'; 
// export const XENBURNER_ADDRESS = '0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189'; 
// export const XBURN_TOKEN_ADDRESS = '0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189'; // Assuming same as minter for Sepolia
// export const UNISWAP_ROUTER_ADDRESS = '0x4b595355248217124210895A31C52682C5d10120'; // Uniswap V3 Router on Sepolia
// export const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'; // Wrapped ETH on Sepolia

export const XEN_ABI = xenAbi;
export const XENBURNER_ABI = xenBurnerAbi;
export const XBURN_NFT_ABI = xburnNftAbi;
export const XBURN_MINTER_ABI = xenBurnerAbi; // Same as XENBURNER_ABI 