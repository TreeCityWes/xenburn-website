import { getDefaultWallets, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { 
  rabbyWallet,
  metaMaskWallet,
  phantomWallet,
} from '@rainbow-me/rainbowkit/wallets';

// Configure Base mainnet
const baseMainnet = {
  ...base,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.base.org'],
    },
    public: {
      http: ['https://mainnet.base.org'],
    },
  },
};

const projectId = 'c852fc82b0c14e6e8756a1532e495efb';
const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY || 'demo';

const { chains, publicClient } = configureChains(
  [baseMainnet],
  [
    alchemyProvider({ apiKey: alchemyApiKey }),
    jsonRpcProvider({
      rpc: (chain) => ({
        http: `https://mainnet.base.org`,
      }),
    }),
    publicProvider(),
  ],
  {
    pollingInterval: 6_000,
    stallTimeout: 5_000,
    retryCount: 3,
    retryDelay: 1_000,
  }
);

const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [
      rabbyWallet({ chains, projectId }),
      metaMaskWallet({ chains, projectId }),
      phantomWallet({ chains, projectId }),
    ],
  },
]);

export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export { chains }; 