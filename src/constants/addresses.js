/**
 * Contract addresses for the application
 */

import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/XBurnMinter.json';
import xburnNftAbi from '../contracts/XBurnNFT.json';
import { base, optimism, sepolia } from './chains'; // Assuming chain definitions exist

// Define addresses for each supported network
export const addresses = {
  [base.id]: {
    XEN_ADDRESS: '0xffcbF84650cE02DaFE96926B37a0ac5E34932fa5',
    // Fix Base chain addresses - update XBURN_TOKEN_ADDRESS to correct contract if needed
    XBURN_MINTER_ADDRESS: '0xe89AFDeFeBDba033f6e750615f0A0f1A37C78c4A', 
    XENBURNER_ADDRESS: '0xe89AFDeFeBDba033f6e750615f0A0f1A37C78c4A',
    // The same contract address is used for token, minter and burner functionality
    XBURN_TOKEN_ADDRESS: '0xe89AFDeFeBDba033f6e750615f0A0f1A37C78c4A',
    XBURN_NFT_ADDRESS: '0x305c60d2fef49fadfee67ec530de98f67bac861d', 
    UNISWAP_ROUTER_ADDRESS: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    // XBURN/XEN LP pair - Used for XBURN price calculation relative to XEN and for TVL
    XBURN_XEN_LP_ADDRESS: '0x93e39bd6854d960a0c4f5b592381bb8356a2d725',
    WETH_ADDRESS: '0x4200000000000000000000000000000000000006',
    // This is XEN/ETH (base) pair, not XBURN/XEN pair
    XEN_BASE_PAIR_ADDRESS: '0xe28f5637D009732259FCbB5ceA23488A411A5eaD',
  },
  [optimism.id]: {
    XEN_ADDRESS: '0xeB585163DEbB1E637c6D617de3bEF99347cd75c8', 
    XBURN_MINTER_ADDRESS: '0x9d16374c01Cf785b6dB5B02A830E00C40c5381D8',
    XENBURNER_ADDRESS: '0x9d16374c01Cf785b6dB5B02A830E00C40c5381D8', 
    XBURN_TOKEN_ADDRESS: '0x9d16374c01Cf785b6dB5B02A830E00C40c5381D8', 
    XBURN_NFT_ADDRESS: '0xd7dd1997ed8d5b836099e5d28fed1a9d8e9cc723',
    UNISWAP_ROUTER_ADDRESS: '0xE592427A0AEce92De3Edee1F18E0157C05861564', 
    XBURN_XEN_LP_ADDRESS: '0xd77b31796b7CE1880F84709eb5D9045749BB3d31', // XBURN/XEN
    WETH_ADDRESS: '0x4200000000000000000000000000000000000006', 
    // Updated Optimism XEN/WETH pair address
    XEN_BASE_PAIR_ADDRESS: '0xFDf64C32F4A03923547e6061911483b793e8d7E2', 
  },
  [sepolia.id]: {
    XEN_ADDRESS: '0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB',
    XBURN_MINTER_ADDRESS: '0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189', 
    XENBURNER_ADDRESS: '0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189', 
    XBURN_TOKEN_ADDRESS: '0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189', 
    XBURN_NFT_ADDRESS: '0x1ebc3157cc44fe1cb0d7f4764d271bad3deb9a03', 
    UNISWAP_ROUTER_ADDRESS: '0x4b595355248217124210895A31C52682C5d10120', 
    XBURN_XEN_LP_ADDRESS: '0x38C29A96f026F169822c3Dd150cCF9504260b5e6', 
    WETH_ADDRESS: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  },
};

// Function to get addresses for the current chain (or a specific chain)
export const getAddresses = (chainId) => {
  // Default to Base if chainId is not provided or not found
  return addresses[chainId] || addresses[base.id]; 
};

// ABIs remain the same
export const XEN_ABI = xenAbi;
export const XENBURNER_ABI = xenBurnerAbi;
export const XBURN_NFT_ABI = xburnNftAbi;
export const XBURN_MINTER_ABI = xenBurnerAbi; // Same as XENBURNER_ABI 