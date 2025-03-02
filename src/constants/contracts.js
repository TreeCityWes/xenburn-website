import xenAbi from '../contracts/xen.json';
import xenBurnerAbi from '../contracts/XBurnMinter.json';
import xburnNftAbi from '../contracts/XBurnNFT.json';

// Updated contract addresses
export const XEN_ADDRESS = '0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB';
export const XENBURNER_ADDRESS = '0x00a99B5cAEdaDFEFd34DD7AF4fec3A909eBa0667'; // XBurnMinter
export const XBURN_NFT_ADDRESS = '0x03dFF2159f297F36f2E93f44014C36544c5Ba53A'; // XBurnNFT
export const XBURN_MINTER_ADDRESS = '0x00a99B5cAEdaDFEFd34DD7AF4fec3A909eBa0667'; // Same as XENBURNER_ADDRESS
export const UNISWAP_ROUTER_ADDRESS = '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3';
export const PAIR_ADDRESS = '0xb14C4707C2d9501e2f2b863A3A050B4D3d179626'; // Uniswap XEN-XBURN pair

export const XEN_ABI = xenAbi;
export const XENBURNER_ABI = xenBurnerAbi;
export const XBURN_NFT_ABI = xburnNftAbi;
export const XBURN_MINTER_ABI = xenBurnerAbi; // Same as XENBURNER_ABI 