// Define chain configurations

// Helper function to define chain objects consistently
const defineChain = (id, name, rpcUrls, blockExplorerUrls, nativeCurrency, logoUrl) => ({
  id,
  name,
  // Use lowercase name for most networks as default network value
  network: name.toLowerCase().replace(/ /g, '-'), 
  nativeCurrency,
  rpcUrls: {
    public: { http: rpcUrls },
    default: { http: rpcUrls },
  },
  blockExplorers: {
    etherscan: { name: `${name}scan`, url: blockExplorerUrls },
    default: { name: `${name}scan`, url: blockExplorerUrls },
  },
  logoUrl, 
});

// Base Mainnet
export const base = defineChain(
  8453,
  'Base',
  ['https://mainnet.base.org'], // Primary RPC
  'https://basescan.org',
  { name: 'Ether', symbol: 'ETH', decimals: 18 },
  '/logos/cbxen.png' // Base Logo Path
);

// Explicitly set the network property for Base to 'base' (this is critical for DexScreener API)
base.network = 'base';

// Optimism Mainnet
export const optimism = defineChain(
  10,
  'Optimism',
  ['https://mainnet.optimism.io'], // Primary RPC
  'https://optimistic.etherscan.io',
  { name: 'Ether', symbol: 'ETH', decimals: 18 },
  '/logos/opxen.png' // Updated Optimism Logo Path
);

// Sepolia Testnet
export const sepolia = defineChain(
  11155111,
  'Sepolia',
  ['https://rpc.sepolia.org'], // Using public RPC endpoint
  'https://sepolia.etherscan.io',
  { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  '/logos/xen.png' // Updated Sepolia Logo Path
);

// Polygon Mainnet
export const polygon = defineChain(
  137,
  'Polygon',
  ['https://rpc-mainnet.matic.quiknode.pro'], // Using the provided RPC
  'https://polygonscan.com',
  { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  '/logos/polyxen.png' // Using the Polygon-specific logo
);

// PulseChain Mainnet
export const pulsechain = defineChain(
  369, // Standard PulseChain Chain ID
  'PulseChain',
  ['https://rpc.pulsechain.com'], 
  'https://scan.pulsechain.com', // Official block explorer
  { name: 'Pulse', symbol: 'PLS', decimals: 18 },
  '/logos/pulsexen.png' // Using the PulseChain-specific logo
);

// Avalanche Mainnet
export const avalanche = defineChain(
  43114, // Avalanche C-Chain ID
  'Avalanche',
  ['https://api.avax.network/ext/bc/C/rpc'], // Primary RPC
  'https://snowtrace.io',
  { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  '/logos/axen.png' // Avalanche-specific logo
);

// Explicitly set the network property for Avalanche to 'avalanche' (critical for DexScreener API)
avalanche.network = 'avalanche';

// BSC (Binance Smart Chain) Mainnet
export const bsc = defineChain(
  56,
  'BNB Chain',
  ['https://binance.llamarpc.com', 'https://bsc-dataseed.binance.org', 'https://bsc-dataseed1.defibit.io', 'https://bsc-dataseed1.ninicoin.io'],
  'https://bscscan.com',
  { name: 'BNB', symbol: 'BNB', decimals: 18 },
  '/logos/bxen.png' // BSC Logo Path
);

// Explicitly set the network property for BSC to 'bsc' (critical for DexScreener API)
bsc.network = 'bsc';

// Array of all supported chains
export const supportedChains = [base, optimism, sepolia, polygon, pulsechain, avalanche, bsc];

// Function to get chain info by ID
export const getChainById = (chainId) => supportedChains.find(chain => chain.id === chainId); 