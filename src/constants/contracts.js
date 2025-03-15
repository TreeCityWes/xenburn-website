import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/XBurnMinter.json';
import xburnNftAbi from '../contracts/XBurnNFT.json';

// Updated contract addresses
export const XEN_ADDRESS = '0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB';
export const XENBURNER_ADDRESS = '0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189'; // XBurnMinter
export const XBURN_NFT_ADDRESS = '0x1EbC3157Cc44FE1cb0d7F4764D271BAD3deB9a03'; // XBurnNFT
export const XBURN_MINTER_ADDRESS = '0x964db60EfdF9FDa55eA62f598Ea4c7a9cD48F189'; // Same as XENBURNER_ADDRESS
export const UNISWAP_ROUTER_ADDRESS = '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3';
export const PAIR_ADDRESS = '0x38C29A96f026F169822c3Dd150cCF9504260b5e6'; // Uniswap XEN-XBURN pair

export const XEN_ABI = xenAbi;
export const XENBURNER_ABI = xenBurnerAbi;
export const XBURN_NFT_ABI = xburnNftAbi;
export const XBURN_MINTER_ABI = xenBurnerAbi; // Same as XENBURNER_ABI 