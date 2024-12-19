import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { base, baseGoerli } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import {
  injectedWallet,
  rabbyWallet,
  phantomWallet,
  metaMaskWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';

const projectId = 'YOUR_WALLET_CONNECT_PROJECT_ID';

const { chains, publicClient } = configureChains(
  [base, baseGoerli],
  [publicProvider()]
);

const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [
      metaMaskWallet({ projectId, chains }),
      rabbyWallet({ chains }),
      phantomWallet({ chains }),
    ],
  },
  {
    groupName: 'Other',
    wallets: [
      walletConnectWallet({ projectId, chains }),
      injectedWallet({ chains }),
    ],
  },
]);

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export { chains }; 