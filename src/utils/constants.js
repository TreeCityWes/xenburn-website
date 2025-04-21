/**
 * Contract ABIs and other constants used throughout the application
 */

// Uniswap Router ABI
export const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
];

// Uniswap Pair ABI
export const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];

// Maximum days for term (10 years)
export const MAX_TERM_DAYS = 3650;

// Default amplification parameters
export const DEFAULT_AMP_START = 2397;
export const DEFAULT_AMP_SNAPSHOT = 2397; 