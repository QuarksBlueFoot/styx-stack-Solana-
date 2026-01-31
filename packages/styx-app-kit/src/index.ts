/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX STACK APP KIT
 *  
 *  The Privacy-First Development Kit for Solana Mobile Apps
 *  Build Signal-like messaging, private payments, and more — on Solana.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * MODULES:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ @styx-stack/app-kit/messaging     │ Signal-like encrypted messaging        │
 * │ @styx-stack/app-kit/payments      │ Private payments & Resolv links        │
 * │ @styx-stack/app-kit/governance    │ Private DAO voting & proposals         │
 * │ @styx-stack/app-kit/swaps         │ Private DEX swaps & trading            │
 * │ @styx-stack/app-kit/nft           │ Private NFT minting & trading          │
 * │ @styx-stack/app-kit/social        │ Private social features & identity     │
 * │ @styx-stack/app-kit/airdrop       │ WhisperDrop private airdrops           │
 * │ @styx-stack/app-kit/games         │ Private games: coin flip, dice, RPS    │
 * │ @styx-stack/app-kit/voting        │ Simple private polls & voting          │
 * │ @styx-stack/app-kit/privacy-cash  │ ZK shielded pools (Privacy Cash SDK)   │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ @styx-stack/app-kit/hooks         │ React hooks for all modules            │
 * │ @styx-stack/app-kit/providers     │ React context providers                │
 * │ @styx-stack/app-kit/components    │ Pre-built UI components                │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * QUICK START (React Native):
 * ```tsx
 * import { StyxProvider, usePrivateMessaging, usePrivatePayments } from '@styx-stack/app-kit';
 * 
 * function App() {
 *   return (
 *     <StyxProvider cluster="mainnet-beta">
 *       <ChatScreen />
 *     </StyxProvider>
 *   );
 * }
 * 
 * function ChatScreen() {
 *   const { sendMessage, messages } = usePrivateMessaging();
 *   const { sendPayment, createPaymentLink } = usePrivatePayments();
 *   
 *   // Signal-like encrypted messaging on Solana
 *   await sendMessage(recipientPubkey, "Hello, privately!");
 *   
 *   // Private payment with claimable link
 *   const link = await createPaymentLink({ amount: 1.0 });
 *   // Share link via SMS/email - recipient claims without wallet
 * }
 * ```
 *
 * COMPATIBILITY:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ✅ React Native (Expo & bare)                                               │
 * │ ✅ Solana Mobile Seeker                                                     │
 * │ ✅ Mobile Wallet Adapter                                                    │
 * │ ✅ Kotlin Multiplatform (via styx-android-kit)                              │
 * │ ✅ Web (Next.js, Vite, etc.)                                                │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * @see https://styxprivacy.app/docs/app-kit
 * @author Bluefoot Labs
 * @license Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export * from './core';

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Messaging - Signal-like encrypted messaging on-chain
export * from './modules/messaging';

// Payments - Private payments, Resolv links, gasless transfers
export * from './modules/payments';

// Governance - Private DAO voting and proposals
export * from './modules/governance';

// Swaps - Private DEX trading with stealth addresses
export * from './modules/swaps';

// NFT - Private NFT/cNFT minting, trading, and collections
export * from './modules/nft';

// Social - Private social features, identity, contacts
export * from './modules/social';

// Airdrop - WhisperDrop private airdrops with merkle proofs & collection gating
export * from './modules/airdrop';

// Games - Private coin flip, dice, RPS with commit-reveal cryptography
export * from './modules/games';

// Voting - Simple private polling and voting for any app
export * from './modules/voting';

// Compression - Inscription compression adapter for compressed SPL tokens
export * from './modules/compression';

// Resolver - Legacy no-wallet payments (use Resolv for new code)
export * from './modules/resolver';

// Resolv - Universal privacy payment system (Send, Pay, Buy, Gig, Invoice, Referrals)
// Privacy routing powered by SilentSwap (https://silentswap.com)
export * from './modules/resolve';

// SDK - Unified Styx SDK (SPS, STS, DAM, WhisperDrop)
export * from './modules/sdk';

// Compliance - Privacy-preserving compliance (Range proofs, Travel Rule, Audit)
export * from './modules/compliance';

// Privacy Cash - ZK-powered shielded pools with Privacy Cash SDK (audited by Zigtur)
// Features: Private lending, whale wallets, private bridging, games/messaging integration
// https://privacycash.org | Privacy Hack 2026 Bounty Submission
export * from './modules/privacy-cash';

// ═══════════════════════════════════════════════════════════════════════════════
// REACT EXPORTS (tree-shakeable)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './hooks';
export * from './providers';
export * from './components';

// ═══════════════════════════════════════════════════════════════════════════════
// REACT NATIVE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export * from './native';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const STYX_APP_KIT_VERSION = '1.0.0';
