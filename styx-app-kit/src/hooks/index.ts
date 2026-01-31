/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX REACT HOOKS
 *  
 *  React hooks for building privacy-first Solana mobile apps
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef, useContext, useMemo } from 'react';
import { PublicKey, Keypair, Connection } from '@solana/web3.js';
import { StyxClient, StyxConfig, Cluster } from '../core';
import { 
  PrivateMessagingClient, 
  PrivateMessage, 
  Conversation,
  MessagingSession,
} from '../modules/messaging';
import { 
  PrivatePaymentsClient, 
  PaymentLink, 
  StealthPayment,
  PaymentReceipt,
} from '../modules/payments';
import { 
  PrivateGovernanceClient, 
  Proposal, 
  Vote,
  VotingPower,
} from '../modules/governance';
import { 
  PrivateSwapsClient, 
  SwapQuote, 
  LimitOrder,
} from '../modules/swaps';
import { 
  PrivateNFTClient, 
  PrivateNFT, 
  NFTListing,
} from '../modules/nft';
import { 
  PrivateSocialClient, 
  PrivateProfile, 
  Contact,
} from '../modules/social';
import { 
  PrivateAirdropClient, 
  Airdrop, 
  ClaimResult,
} from '../modules/airdrop';

// Context import (defined in providers)
import { StyxContext } from '../providers';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Access the Styx context
 */
export function useStyx() {
  const context = useContext(StyxContext);
  if (!context) {
    throw new Error('useStyx must be used within a StyxProvider');
  }
  return context;
}

/**
 * Get Styx connection info
 */
export function useStyxConnection() {
  const { client } = useStyx();
  
  return useMemo(() => ({
    connection: client.connection,
    cluster: client.cluster,
    programId: client.programId,
    indexerUrl: client.getIndexerUrl(),
    relayUrl: client.getRelayUrl(),
  }), [client]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGING HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseMessagingOptions {
  autoConnect?: boolean;
  onMessage?: (message: PrivateMessage) => void;
}

export interface UseMessagingReturn {
  messages: Map<string, PrivateMessage[]>;
  conversations: Conversation[];
  isConnected: boolean;
  isLoading: boolean;
  sendMessage: (recipient: PublicKey, recipientKey: Uint8Array, content: string) => Promise<PrivateMessage>;
  sendTyping: (to: PublicKey) => void;
  markAsRead: (messageId: string, from: PublicKey) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Hook for private messaging
 */
export function usePrivateMessaging(options?: UseMessagingOptions): UseMessagingReturn {
  const { client, wallet } = useStyx();
  const [messages, setMessages] = useState<Map<string, PrivateMessage[]>>(new Map());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef<PrivateMessagingClient | null>(null);

  // Initialize messaging client
  useEffect(() => {
    if (wallet.publicKey && wallet.signTransaction) {
      // Create keypair from wallet (in real app, would use MWA)
      const signer = Keypair.generate(); // Placeholder
      
      clientRef.current = new PrivateMessagingClient({
        client,
        signer,
        onMessage: (message) => {
          setMessages(prev => {
            const key = message.sender.toBase58();
            const existing = prev.get(key) ?? [];
            return new Map(prev).set(key, [...existing, message]);
          });
          options?.onMessage?.(message);
        },
      });
    }
    
    return () => {
      clientRef.current?.disconnect();
    };
  }, [client, wallet, options?.onMessage]);

  // Auto-connect
  useEffect(() => {
    if (options?.autoConnect && clientRef.current && !isConnected) {
      clientRef.current.connectToRelay()
        .then(() => setIsConnected(true))
        .catch(console.error);
    }
  }, [options?.autoConnect, isConnected]);

  const sendMessage = useCallback(async (
    recipient: PublicKey,
    recipientKey: Uint8Array,
    content: string
  ): Promise<PrivateMessage> => {
    if (!clientRef.current) {
      throw new Error('Messaging client not initialized');
    }
    
    setIsLoading(true);
    try {
      const message = await clientRef.current.sendMessage(recipient, recipientKey, content);
      
      // Add to local state
      setMessages(prev => {
        const key = recipient.toBase58();
        const existing = prev.get(key) ?? [];
        return new Map(prev).set(key, [...existing, message]);
      });
      
      return message;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connect = useCallback(async () => {
    if (clientRef.current && !isConnected) {
      await clientRef.current.connectToRelay();
      setIsConnected(true);
    }
  }, [isConnected]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    setIsConnected(false);
  }, []);

  const sendTyping = useCallback((to: PublicKey) => {
    clientRef.current?.sendTypingIndicator(to);
  }, []);

  const markAsRead = useCallback((messageId: string, from: PublicKey) => {
    clientRef.current?.sendReadReceipt(messageId, from);
  }, []);

  return {
    messages,
    conversations,
    isConnected,
    isLoading,
    sendMessage,
    sendTyping,
    markAsRead,
    connect,
    disconnect,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsePaymentsReturn {
  isLoading: boolean;
  createPaymentLink: (amount: bigint, options?: { memo?: string; expiresIn?: number }) => Promise<PaymentLink>;
  claimPaymentLink: (url: string) => Promise<PaymentReceipt>;
  sendStealthPayment: (recipientViewKey: Uint8Array, recipientSpendKey: PublicKey, amount: bigint) => Promise<StealthPayment>;
  scanPayments: () => Promise<StealthPayment[]>;
  getViewKey: () => Uint8Array | null;
}

/**
 * Hook for private payments
 */
export function usePrivatePayments(): UsePaymentsReturn {
  const { client, wallet } = useStyx();
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef<PrivatePaymentsClient | null>(null);

  useEffect(() => {
    if (wallet.publicKey) {
      const signer = Keypair.generate(); // Placeholder
      clientRef.current = new PrivatePaymentsClient(client, signer);
    }
  }, [client, wallet]);

  const createPaymentLink = useCallback(async (
    amount: bigint,
    options?: { memo?: string; expiresIn?: number }
  ): Promise<PaymentLink> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.createPaymentLink({ amount, ...options });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const claimPaymentLink = useCallback(async (url: string): Promise<PaymentReceipt> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.claimPaymentLink(url);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendStealthPayment = useCallback(async (
    recipientViewKey: Uint8Array,
    recipientSpendKey: PublicKey,
    amount: bigint
  ): Promise<StealthPayment> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.sendPayment(recipientViewKey, recipientSpendKey, amount);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scanPayments = useCallback(async (): Promise<StealthPayment[]> => {
    if (!clientRef.current) throw new Error('Not initialized');
    return clientRef.current.scanIncomingPayments();
  }, []);

  const getViewKey = useCallback((): Uint8Array | null => {
    return clientRef.current?.getViewKey() ?? null;
  }, []);

  return {
    isLoading,
    createPaymentLink,
    claimPaymentLink,
    sendStealthPayment,
    scanPayments,
    getViewKey,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseGovernanceOptions {
  dao: PublicKey;
}

export interface UseGovernanceReturn {
  proposals: Proposal[];
  votingPower: VotingPower | null;
  isLoading: boolean;
  createProposal: (options: {
    title: string;
    description: string;
    options: string[];
    duration: number;
    quorum: bigint;
  }) => Promise<Proposal>;
  castVote: (proposalId: string, optionIndex: number) => Promise<Vote>;
  delegate: (to: PublicKey, amount: bigint) => Promise<void>;
  refreshProposals: () => Promise<void>;
}

/**
 * Hook for private governance
 */
export function usePrivateGovernance(options: UseGovernanceOptions): UseGovernanceReturn {
  const { client, wallet } = useStyx();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef<PrivateGovernanceClient | null>(null);

  useEffect(() => {
    if (wallet.publicKey) {
      const signer = Keypair.generate();
      clientRef.current = new PrivateGovernanceClient({
        client,
        signer,
        dao: options.dao,
      });
      
      // Fetch initial data
      clientRef.current.getVotingPower().then(setVotingPower).catch(console.error);
      clientRef.current.getActiveProposals().then(setProposals).catch(console.error);
    }
  }, [client, wallet, options.dao]);

  const createProposal = useCallback(async (proposalOptions: {
    title: string;
    description: string;
    options: string[];
    duration: number;
    quorum: bigint;
  }): Promise<Proposal> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      const proposal = await clientRef.current.createProposal(proposalOptions);
      setProposals(prev => [...prev, proposal]);
      return proposal;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const castVote = useCallback(async (proposalId: string, optionIndex: number): Promise<Vote> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.castVote(proposalId, optionIndex);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const delegate = useCallback(async (to: PublicKey, amount: bigint): Promise<void> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      await clientRef.current.delegate(to, amount);
      const power = await clientRef.current.getVotingPower();
      setVotingPower(power);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProposals = useCallback(async (): Promise<void> => {
    if (!clientRef.current) return;
    
    setIsLoading(true);
    try {
      const props = await clientRef.current.getActiveProposals();
      setProposals(props);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    proposals,
    votingPower,
    isLoading,
    createProposal,
    castVote,
    delegate,
    refreshProposals,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SWAPS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseSwapsReturn {
  isLoading: boolean;
  getQuote: (inputMint: PublicKey, outputMint: PublicKey, inputAmount: bigint) => Promise<SwapQuote>;
  executeSwap: (quote: SwapQuote) => Promise<{ signature: string }>;
  createLimitOrder: (inputMint: PublicKey, outputMint: PublicKey, inputAmount: bigint, price: number) => Promise<LimitOrder>;
  cancelOrder: (orderId: string) => Promise<void>;
  getMyOrders: () => Promise<LimitOrder[]>;
}

/**
 * Hook for private swaps
 */
export function usePrivateSwaps(): UseSwapsReturn {
  const { client, wallet } = useStyx();
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef<PrivateSwapsClient | null>(null);

  useEffect(() => {
    if (wallet.publicKey) {
      const signer = Keypair.generate();
      clientRef.current = new PrivateSwapsClient({ client, signer });
    }
  }, [client, wallet]);

  const getQuote = useCallback(async (
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: bigint
  ): Promise<SwapQuote> => {
    if (!clientRef.current) throw new Error('Not initialized');
    return clientRef.current.getQuote(inputMint, outputMint, inputAmount);
  }, []);

  const executeSwap = useCallback(async (quote: SwapQuote) => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.executeSwap(quote);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createLimitOrder = useCallback(async (
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: bigint,
    price: number
  ): Promise<LimitOrder> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.createLimitOrder(inputMint, outputMint, inputAmount, price);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelOrder = useCallback(async (orderId: string): Promise<void> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      await clientRef.current.cancelOrder(orderId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMyOrders = useCallback(async (): Promise<LimitOrder[]> => {
    if (!clientRef.current) throw new Error('Not initialized');
    return clientRef.current.getMyOrders();
  }, []);

  return {
    isLoading,
    getQuote,
    executeSwap,
    createLimitOrder,
    cancelOrder,
    getMyOrders,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NFT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseNFTReturn {
  nfts: PrivateNFT[];
  isLoading: boolean;
  mint: (metadata: { name: string; symbol: string; description: string; image: string }) => Promise<PrivateNFT>;
  transfer: (nftMint: PublicKey, recipientViewKey: Uint8Array, recipientSpendKey: PublicKey) => Promise<{ signature: string }>;
  list: (nftMint: PublicKey, price: bigint) => Promise<NFTListing>;
  buy: (listingId: string) => Promise<{ signature: string }>;
  refreshNFTs: () => Promise<void>;
}

/**
 * Hook for private NFTs
 */
export function usePrivateNFT(): UseNFTReturn {
  const { client, wallet } = useStyx();
  const [nfts, setNfts] = useState<PrivateNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef<PrivateNFTClient | null>(null);

  useEffect(() => {
    if (wallet.publicKey) {
      const signer = Keypair.generate();
      clientRef.current = new PrivateNFTClient({ client, signer });
      
      // Fetch initial NFTs
      clientRef.current.getMyNFTs().then(setNfts).catch(console.error);
    }
  }, [client, wallet]);

  const mint = useCallback(async (metadata: {
    name: string;
    symbol: string;
    description: string;
    image: string;
  }): Promise<PrivateNFT> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      const nft = await clientRef.current.mint(metadata);
      setNfts(prev => [...prev, nft]);
      return nft;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const transfer = useCallback(async (
    nftMint: PublicKey,
    recipientViewKey: Uint8Array,
    recipientSpendKey: PublicKey
  ) => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.transferPrivately(nftMint, recipientViewKey, recipientSpendKey);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const list = useCallback(async (nftMint: PublicKey, price: bigint): Promise<NFTListing> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.listForSale(nftMint, price);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const buy = useCallback(async (listingId: string) => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.buy(listingId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshNFTs = useCallback(async (): Promise<void> => {
    if (!clientRef.current) return;
    
    setIsLoading(true);
    try {
      const [owned, stealth] = await Promise.all([
        clientRef.current.getMyNFTs(),
        clientRef.current.scanStealthNFTs(),
      ]);
      setNfts([...owned, ...stealth]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    nfts,
    isLoading,
    mint,
    transfer,
    list,
    buy,
    refreshNFTs,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseSocialReturn {
  profile: PrivateProfile | null;
  contacts: Contact[];
  isLoading: boolean;
  updateProfile: (profile: { displayName: string; avatar?: string; bio?: string }) => Promise<PrivateProfile>;
  addContact: (address: PublicKey, options?: { nickname?: string }) => Promise<Contact>;
  getProfile: (address: PublicKey) => Promise<PrivateProfile | null>;
}

/**
 * Hook for private social features
 */
export function usePrivateSocial(): UseSocialReturn {
  const { client, wallet } = useStyx();
  const [profile, setProfile] = useState<PrivateProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef<PrivateSocialClient | null>(null);

  useEffect(() => {
    if (wallet.publicKey) {
      const signer = Keypair.generate();
      clientRef.current = new PrivateSocialClient({ client, signer });
      
      // Fetch profile
      clientRef.current.getProfile(wallet.publicKey as PublicKey)
        .then(setProfile)
        .catch(console.error);
    }
  }, [client, wallet]);

  const updateProfile = useCallback(async (profileData: {
    displayName: string;
    avatar?: string;
    bio?: string;
  }): Promise<PrivateProfile> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      const updated = await clientRef.current.updateProfile(profileData);
      setProfile(updated);
      return updated;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addContact = useCallback(async (
    address: PublicKey,
    options?: { nickname?: string }
  ): Promise<Contact> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      const contact = await clientRef.current.addContact(address, options);
      setContacts(prev => [...prev, contact]);
      return contact;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProfile = useCallback(async (address: PublicKey): Promise<PrivateProfile | null> => {
    if (!clientRef.current) throw new Error('Not initialized');
    return clientRef.current.getProfile(address);
  }, []);

  return {
    profile,
    contacts,
    isLoading,
    updateProfile,
    addContact,
    getProfile,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AIRDROP HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseAirdropReturn {
  claimableAirdrops: Airdrop[];
  isLoading: boolean;
  claim: (airdropId: string) => Promise<ClaimResult>;
  checkEligibility: (airdropId: string) => Promise<{ eligible: boolean; amount: bigint }>;
  createAirdrop: (options: {
    name: string;
    recipients: Array<{ address: PublicKey; amount: bigint }>;
  }) => Promise<Airdrop>;
  refreshAirdrops: () => Promise<void>;
}

/**
 * Hook for private airdrops
 */
export function usePrivateAirdrop(): UseAirdropReturn {
  const { client, wallet } = useStyx();
  const [claimableAirdrops, setClaimableAirdrops] = useState<Airdrop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef<PrivateAirdropClient | null>(null);

  useEffect(() => {
    if (wallet.publicKey) {
      const signer = Keypair.generate();
      clientRef.current = new PrivateAirdropClient({ client, signer });
      
      // Fetch claimable
      clientRef.current.getClaimableAirdrops().then(setClaimableAirdrops).catch(console.error);
    }
  }, [client, wallet]);

  const claim = useCallback(async (airdropId: string): Promise<ClaimResult> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.claim(airdropId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkEligibility = useCallback(async (airdropId: string) => {
    if (!clientRef.current) throw new Error('Not initialized');
    return clientRef.current.checkEligibility(airdropId);
  }, []);

  const createAirdrop = useCallback(async (options: {
    name: string;
    recipients: Array<{ address: PublicKey; amount: bigint }>;
  }): Promise<Airdrop> => {
    if (!clientRef.current) throw new Error('Not initialized');
    
    setIsLoading(true);
    try {
      return await clientRef.current.createAirdrop(options);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAirdrops = useCallback(async (): Promise<void> => {
    if (!clientRef.current) return;
    
    setIsLoading(true);
    try {
      const airdrops = await clientRef.current.getClaimableAirdrops();
      setClaimableAirdrops(airdrops);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    claimableAirdrops,
    isLoading,
    claim,
    checkEligibility,
    createAirdrop,
    refreshAirdrops,
  };
}
