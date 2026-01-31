# Styx React Native Template

A privacy-first Solana mobile app template using **Styx App Kit**.

## Features

- 🔒 **Private Messaging** - Signal-like E2E encryption with Double Ratchet
- 💸 **Payment Links** - Share SOL via text/email (no wallet needed to claim)
- 📱 **Mobile Wallet Adapter** - Works with Phantom, Solflare, etc.
- 🎯 **Seeker Ready** - Optimized for Solana Seeker device

## Quick Start

```bash
# Clone template
npx degit QuarksBlueFoot/StyxStack/templates/rn-styx-app my-styx-app
cd my-styx-app

# Install dependencies
npm install

# Start development
npx expo start
```

## Structure

```
├── App.tsx              # Main app with screens
├── package.json         # Dependencies
└── app.json            # Expo config
```

## Customization

### Add More Privacy Modules

```tsx
import {
  usePrivateGovernance,  // Anonymous DAO voting
  usePrivateSwaps,       // MEV-protected trading
  usePrivateNFT,         // Hidden ownership NFTs
  usePrivateAirdrop,     // WhisperDrop claims
} from '@styxstack/app-kit';
```

### Configure Cluster

```tsx
<StyxProvider cluster="mainnet-beta" rpcUrl="https://your-rpc.com">
  <App />
</StyxProvider>
```

### Customize Theme

Edit the `styles` object in `App.tsx` to match your brand.

## Deployment

```bash
# Build for production
npx expo build:android
npx expo build:ios

# Or use EAS Build
eas build --platform all
```

## Resources

- [Styx App Kit Docs](https://styx.nexus/docs/app-kit)
- [Solana Mobile Docs](https://docs.solanamobile.com)
- [Expo Docs](https://docs.expo.dev)

## License

MIT
