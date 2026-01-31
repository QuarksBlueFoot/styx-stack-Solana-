/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX REACT PROVIDERS
 *  
 *  Context providers for React/React Native apps
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { StyxClient, Cluster, getClusterConfig, StyxConfig } from '../core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WalletState {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  signTransaction?: <T>(transaction: T) => Promise<T>;
  signAllTransactions?: <T>(transactions: T[]) => Promise<T[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

export interface StyxContextValue {
  client: StyxClient;
  config: StyxConfig;
  wallet: WalletState;
  setWallet: (wallet: Partial<WalletState>) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYX CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export const StyxContext = createContext<StyxContextValue | null>(null);

export interface StyxProviderProps {
  children: ReactNode;
  /** Solana cluster */
  cluster?: Cluster;
  /** Custom RPC URL */
  rpcUrl?: string;
  /** Custom indexer URL */
  indexerUrl?: string;
  /** Custom relay URL */
  relayUrl?: string;
  /** Auto-detect cluster from environment */
  autoDetect?: boolean;
}

/**
 * Main Styx provider - wrap your app with this
 * 
 * @example
 * ```tsx
 * import { StyxProvider } from '@styx-stack/app-kit';
 * 
 * function App() {
 *   return (
 *     <StyxProvider cluster="mainnet-beta">
 *       <YourApp />
 *     </StyxProvider>
 *   );
 * }
 * ```
 */
export function StyxProvider({
  children,
  cluster = 'devnet',
  rpcUrl,
  indexerUrl,
  relayUrl,
  autoDetect = false,
}: StyxProviderProps) {
  const [wallet, setWalletState] = useState<WalletState>({
    publicKey: null,
    connected: false,
    connecting: false,
  });

  // Detect cluster from environment
  const effectiveCluster = useMemo(() => {
    if (autoDetect) {
      if (typeof process !== 'undefined' && process.env) {
        const envCluster = process.env.REACT_APP_SOLANA_CLUSTER ?? 
                          process.env.NEXT_PUBLIC_SOLANA_CLUSTER ??
                          process.env.SOLANA_CLUSTER;
        if (envCluster && ['mainnet-beta', 'devnet', 'testnet', 'localnet'].includes(envCluster)) {
          return envCluster as Cluster;
        }
      }
    }
    return cluster;
  }, [cluster, autoDetect]);

  // Create config
  const config = useMemo(() => {
    const baseConfig = getClusterConfig(effectiveCluster, rpcUrl);
    return {
      ...baseConfig,
      indexerUrl: indexerUrl ?? baseConfig.indexerUrl,
      relayUrl: relayUrl ?? baseConfig.relayUrl,
    };
  }, [effectiveCluster, rpcUrl, indexerUrl, relayUrl]);

  // Create client
  const client = useMemo(() => new StyxClient(config), [config]);

  const setWallet = (partialWallet: Partial<WalletState>) => {
    setWalletState(prev => ({ ...prev, ...partialWallet }));
  };

  const value: StyxContextValue = useMemo(() => ({
    client,
    config,
    wallet,
    setWallet,
  }), [client, config, wallet]);

  return (
    <StyxContext.Provider value={value}>
      {children}
    </StyxContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET ADAPTER PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface WalletAdapterContextValue {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  select: (walletName: string) => void;
  wallets: WalletInfo[];
  selectedWallet: string | null;
}

export interface WalletInfo {
  name: string;
  icon: string;
  installed: boolean;
  adapter: unknown;
}

const WalletAdapterContext = createContext<WalletAdapterContextValue | null>(null);

export interface WalletAdapterProviderProps {
  children: ReactNode;
  /** Mobile Wallet Adapter configuration */
  mwaConfig?: {
    appIdentity: {
      name: string;
      uri: string;
      icon: string;
    };
  };
  /** Auto-connect on mount */
  autoConnect?: boolean;
}

/**
 * Wallet adapter provider for Mobile Wallet Adapter
 * 
 * @example
 * ```tsx
 * import { StyxProvider, WalletAdapterProvider } from '@styx-stack/app-kit';
 * 
 * function App() {
 *   return (
 *     <StyxProvider cluster="mainnet-beta">
 *       <WalletAdapterProvider
 *         mwaConfig={{
 *           appIdentity: {
 *             name: 'My App',
 *             uri: 'https://myapp.com',
 *             icon: 'icon.png',
 *           },
 *         }}
 *       >
 *         <YourApp />
 *       </WalletAdapterProvider>
 *     </StyxProvider>
 *   );
 * }
 * ```
 */
export function WalletAdapterProvider({
  children,
  mwaConfig,
  autoConnect = false,
}: WalletAdapterProviderProps) {
  const styxContext = useContext(StyxContext);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  // Detect installed wallets
  useEffect(() => {
    const detected: WalletInfo[] = [];
    
    // Check for mobile wallet adapter support
    if (typeof window !== 'undefined') {
      // Mobile Wallet Adapter (Solana Mobile)
      detected.push({
        name: 'Mobile Wallet Adapter',
        icon: '📱',
        installed: true,
        adapter: null,
      });
    }
    
    setWallets(detected);
    
    if (autoConnect && detected.length > 0) {
      setSelectedWallet(detected[0].name);
    }
  }, [autoConnect]);

  const connect = async () => {
    if (!mwaConfig) {
      throw new Error('MWA config required for mobile wallet connection');
    }

    // In a real implementation, this would use @solana-mobile/mobile-wallet-adapter-protocol
    // For now, this is a placeholder
    console.log('Connecting with MWA...', mwaConfig.appIdentity);
    
    // Simulate connection
    const mockPublicKey = Keypair.generate().publicKey;
    styxContext?.setWallet({
      publicKey: mockPublicKey,
      connected: true,
      connecting: false,
    });
  };

  const disconnect = async () => {
    styxContext?.setWallet({
      publicKey: null,
      connected: false,
      connecting: false,
    });
    setSelectedWallet(null);
  };

  const select = (walletName: string) => {
    setSelectedWallet(walletName);
  };

  const value: WalletAdapterContextValue = useMemo(() => ({
    connect,
    disconnect,
    select,
    wallets,
    selectedWallet,
  }), [wallets, selectedWallet, connect, disconnect]);

  return (
    <WalletAdapterContext.Provider value={value}>
      {children}
    </WalletAdapterContext.Provider>
  );
}

/**
 * Hook to access wallet adapter
 */
export function useWalletAdapter() {
  const context = useContext(WalletAdapterContext);
  if (!context) {
    throw new Error('useWalletAdapter must be used within a WalletAdapterProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVACY SETTINGS PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface PrivacySettings {
  /** Use stealth addresses by default */
  defaultStealth: boolean;
  /** Use encrypted messaging by default */
  encryptedMessaging: boolean;
  /** MEV protection for swaps */
  mevProtection: boolean;
  /** Anonymous governance voting */
  anonymousVoting: boolean;
  /** Add decoy transactions */
  decoyTransactions: boolean;
  /** Hide balances in UI */
  hideBalances: boolean;
}

const defaultPrivacySettings: PrivacySettings = {
  defaultStealth: true,
  encryptedMessaging: true,
  mevProtection: true,
  anonymousVoting: true,
  decoyTransactions: false,
  hideBalances: false,
};

const PrivacyContext = createContext<{
  settings: PrivacySettings;
  updateSettings: (settings: Partial<PrivacySettings>) => void;
}>({
  settings: defaultPrivacySettings,
  updateSettings: () => {},
});

export interface PrivacyProviderProps {
  children: ReactNode;
  initialSettings?: Partial<PrivacySettings>;
}

/**
 * Privacy settings provider
 */
export function PrivacyProvider({ children, initialSettings }: PrivacyProviderProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    ...defaultPrivacySettings,
    ...initialSettings,
  });

  const updateSettings = (newSettings: Partial<PrivacySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <PrivacyContext.Provider value={{ settings, updateSettings }}>
      {children}
    </PrivacyContext.Provider>
  );
}

/**
 * Hook to access privacy settings
 */
export function usePrivacySettings() {
  return useContext(PrivacyContext);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface StyxAppKitProviderProps extends StyxProviderProps {
  walletConfig?: WalletAdapterProviderProps['mwaConfig'];
  autoConnectWallet?: boolean;
  privacySettings?: Partial<PrivacySettings>;
}

/**
 * All-in-one provider for Styx App Kit
 * Combines StyxProvider, WalletAdapterProvider, and PrivacyProvider
 * 
 * @example
 * ```tsx
 * import { StyxAppKitProvider } from '@styx-stack/app-kit';
 * 
 * function App() {
 *   return (
 *     <StyxAppKitProvider
 *       cluster="mainnet-beta"
 *       walletConfig={{
 *         appIdentity: {
 *           name: 'My Privacy App',
 *           uri: 'https://myapp.com',
 *           icon: 'icon.png',
 *         },
 *       }}
 *       autoConnectWallet={true}
 *       privacySettings={{
 *         defaultStealth: true,
 *         mevProtection: true,
 *       }}
 *     >
 *       <YourApp />
 *     </StyxAppKitProvider>
 *   );
 * }
 * ```
 */
export function StyxAppKitProvider({
  children,
  walletConfig,
  autoConnectWallet,
  privacySettings,
  ...styxProps
}: StyxAppKitProviderProps) {
  return (
    <StyxProvider {...styxProps}>
      <WalletAdapterProvider
        mwaConfig={walletConfig}
        autoConnect={autoConnectWallet}
      >
        <PrivacyProvider initialSettings={privacySettings}>
          {children}
        </PrivacyProvider>
      </WalletAdapterProvider>
    </StyxProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RPC PROVIDER EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export * from './rpc';
