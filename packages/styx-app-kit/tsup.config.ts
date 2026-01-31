import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'modules/messaging/index': 'src/modules/messaging/index.ts',
    'modules/payments/index': 'src/modules/payments/index.ts',
    'modules/governance/index': 'src/modules/governance/index.ts',
    'modules/swaps/index': 'src/modules/swaps/index.ts',
    'modules/nft/index': 'src/modules/nft/index.ts',
    'modules/social/index': 'src/modules/social/index.ts',
    'modules/airdrop/index': 'src/modules/airdrop/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'providers/index': 'src/providers/index.ts',
    'components/index': 'src/components/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  loader: {
    '.ts': 'tsx',
  },
  external: [
    'react',
    'react-native',
    '@solana/web3.js',
    '@solana-mobile/mobile-wallet-adapter-protocol',
    '@solana-mobile/mobile-wallet-adapter-protocol-web3js',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.banner = {
      js: '/* Styx Stack App Kit - Privacy-First Solana Mobile Development */',
    };
  },
});
