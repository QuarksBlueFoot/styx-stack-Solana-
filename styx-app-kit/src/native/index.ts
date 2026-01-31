/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX REACT NATIVE UTILITIES
 *  
 *  Native-specific utilities for React Native apps
 *  Provides polyfills, secure storage, and mobile-optimized features
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Platform, NativeModules, Linking } from 'react-native';
import { PublicKey, Keypair } from '@solana/web3.js';
import { randomBytes as nobleRandomBytes } from '@noble/ciphers/webcrypto';
import { sha256 } from '@noble/hashes/sha256';
import { x25519 } from '@noble/curves/ed25519';
import bs58 from 'bs58';

// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTO POLYFILLS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cross-platform random bytes generation
 * Uses native crypto when available, falls back to noble
 */
export async function getRandomBytes(length: number): Promise<Uint8Array> {
  // Try native crypto first (React Native Expo Crypto)
  if (typeof global !== 'undefined' && (global as any).crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    (global as any).crypto.getRandomValues(bytes);
    return bytes;
  }
  
  // Try react-native-get-random-values
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }
  
  // Fall back to noble/ciphers (uses webcrypto or node crypto)
  return nobleRandomBytes(length);
}

/**
 * Synchronous random bytes (for Keypair generation)
 */
export function getRandomBytesSync(length: number): Uint8Array {
  if (typeof global !== 'undefined' && (global as any).crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    (global as any).crypto.getRandomValues(bytes);
    return bytes;
  }
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }
  
  // This is a fallback - should install react-native-get-random-values
  console.warn('Styx: Using fallback random - install react-native-get-random-values for production');
  return nobleRandomBytes(length);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURE STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SecureStorageProvider {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

/**
 * Default secure storage using expo-secure-store or react-native-keychain
 */
class DefaultSecureStorage implements SecureStorageProvider {
  private storage: SecureStorageProvider | null = null;
  
  private async getStorage(): Promise<SecureStorageProvider> {
    if (this.storage) return this.storage;
    
    // Try expo-secure-store first
    try {
      const SecureStore = require('expo-secure-store');
      this.storage = {
        setItem: async (k, v) => SecureStore.setItemAsync(k, v),
        getItem: async (k) => SecureStore.getItemAsync(k),
        removeItem: async (k) => SecureStore.deleteItemAsync(k),
        getAllKeys: async () => [], // SecureStore doesn't support getAllKeys
      };
      return this.storage;
    } catch {}
    
    // Try react-native-keychain
    try {
      const Keychain = require('react-native-keychain');
      this.storage = {
        setItem: async (k, v) => Keychain.setGenericPassword(k, v, { service: k }),
        getItem: async (k) => {
          const result = await Keychain.getGenericPassword({ service: k });
          return result ? result.password : null;
        },
        removeItem: async (k) => Keychain.resetGenericPassword({ service: k }),
        getAllKeys: async () => [],
      };
      return this.storage;
    } catch {}
    
    // Fallback to AsyncStorage (not secure, but works for dev)
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      console.warn('Styx: Using AsyncStorage - install expo-secure-store for production');
      this.storage = {
        setItem: async (k, v) => AsyncStorage.setItem(`@styx_${k}`, v),
        getItem: async (k) => AsyncStorage.getItem(`@styx_${k}`),
        removeItem: async (k) => AsyncStorage.removeItem(`@styx_${k}`),
        getAllKeys: async () => {
          const keys = await AsyncStorage.getAllKeys();
          return keys.filter((k: string) => k.startsWith('@styx_')).map((k: string) => k.slice(6));
        },
      };
      return this.storage;
    } catch {}
    
    throw new Error('No secure storage available. Install expo-secure-store or react-native-keychain');
  }
  
  async setItem(key: string, value: string): Promise<void> {
    const storage = await this.getStorage();
    return storage.setItem(key, value);
  }
  
  async getItem(key: string): Promise<string | null> {
    const storage = await this.getStorage();
    return storage.getItem(key);
  }
  
  async removeItem(key: string): Promise<void> {
    const storage = await this.getStorage();
    return storage.removeItem(key);
  }
  
  async getAllKeys(): Promise<string[]> {
    const storage = await this.getStorage();
    return storage.getAllKeys();
  }
}

export const secureStorage = new DefaultSecureStorage();

// ═══════════════════════════════════════════════════════════════════════════════
// KEY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const STYX_KEYPAIR_KEY = 'styx_keypair_v1';
const STYX_VIEWING_KEY = 'styx_viewing_key_v1';
const STYX_SPENDING_KEY = 'styx_spending_key_v1';

export interface StyxKeyBundle {
  /** Main Solana keypair (for signing transactions) */
  mainKeypair: Keypair;
  /** Viewing key (for decrypting messages/payments) */
  viewingKey: Uint8Array;
  /** Spending key (for deriving stealth addresses) */
  spendingKey: Uint8Array;
  /** Public viewing key */
  viewingPublicKey: Uint8Array;
  /** Public spending key */
  spendingPublicKey: Uint8Array;
}

/**
 * Generate a new Styx key bundle
 */
export async function generateKeyBundle(): Promise<StyxKeyBundle> {
  const viewingKey = await getRandomBytes(32);
  const spendingKey = await getRandomBytes(32);
  const mainKeypair = Keypair.generate();
  
  return {
    mainKeypair,
    viewingKey,
    spendingKey,
    viewingPublicKey: x25519.getPublicKey(viewingKey),
    spendingPublicKey: x25519.getPublicKey(spendingKey),
  };
}

/**
 * Save key bundle to secure storage
 */
export async function saveKeyBundle(bundle: StyxKeyBundle): Promise<void> {
  await secureStorage.setItem(STYX_KEYPAIR_KEY, bs58.encode(bundle.mainKeypair.secretKey));
  await secureStorage.setItem(STYX_VIEWING_KEY, bs58.encode(bundle.viewingKey));
  await secureStorage.setItem(STYX_SPENDING_KEY, bs58.encode(bundle.spendingKey));
}

/**
 * Load key bundle from secure storage
 */
export async function loadKeyBundle(): Promise<StyxKeyBundle | null> {
  const keypairStr = await secureStorage.getItem(STYX_KEYPAIR_KEY);
  const viewingStr = await secureStorage.getItem(STYX_VIEWING_KEY);
  const spendingStr = await secureStorage.getItem(STYX_SPENDING_KEY);
  
  if (!keypairStr || !viewingStr || !spendingStr) {
    return null;
  }
  
  const secretKey = bs58.decode(keypairStr);
  const viewingKey = bs58.decode(viewingStr);
  const spendingKey = bs58.decode(spendingStr);
  
  return {
    mainKeypair: Keypair.fromSecretKey(secretKey),
    viewingKey,
    spendingKey,
    viewingPublicKey: x25519.getPublicKey(viewingKey),
    spendingPublicKey: x25519.getPublicKey(spendingKey),
  };
}

/**
 * Delete all Styx keys from storage
 */
export async function deleteKeyBundle(): Promise<void> {
  await secureStorage.removeItem(STYX_KEYPAIR_KEY);
  await secureStorage.removeItem(STYX_VIEWING_KEY);
  await secureStorage.removeItem(STYX_SPENDING_KEY);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE WALLET ADAPTER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MobileWalletConfig {
  /** App identity name */
  appName: string;
  /** App identity icon URL */
  iconUrl?: string;
  /** Cluster to connect to */
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
}

/**
 * Check if Mobile Wallet Adapter is available
 */
export async function isMWAAvailable(): Promise<boolean> {
  try {
    const result = await Linking.canOpenURL('solana-wallet://');
    return result;
  } catch {
    return false;
  }
}

/**
 * Get the app identity for MWA connections
 */
export function getMWAAppIdentity(config: MobileWalletConfig) {
  return {
    name: config.appName,
    uri: config.iconUrl || `https://styxprivacy.app/icon.png`,
    icon: config.iconUrl || 'favicon.ico',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIOMETRIC AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    // Try expo-local-authentication
    const LocalAuth = require('expo-local-authentication');
    const hasHardware = await LocalAuth.hasHardwareAsync();
    const isEnrolled = await LocalAuth.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {}
  
  try {
    // Try react-native-biometrics
    const RNBiometrics = require('react-native-biometrics').default;
    const rnBiometrics = new RNBiometrics();
    const { available } = await rnBiometrics.isSensorAvailable();
    return available;
  } catch {}
  
  return false;
}

/**
 * Authenticate with biometrics
 */
export async function authenticateWithBiometrics(
  prompt: string = 'Authenticate to access your Styx wallet'
): Promise<BiometricAuthResult> {
  try {
    // Try expo-local-authentication
    const LocalAuth = require('expo-local-authentication');
    const result = await LocalAuth.authenticateAsync({
      promptMessage: prompt,
      fallbackLabel: 'Use Passcode',
    });
    return { success: result.success, error: result.error };
  } catch {}
  
  try {
    // Try react-native-biometrics
    const RNBiometrics = require('react-native-biometrics').default;
    const rnBiometrics = new RNBiometrics();
    const { success } = await rnBiometrics.simplePrompt({ promptMessage: prompt });
    return { success };
  } catch {}
  
  return { success: false, error: 'No biometric library available' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP LINKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeepLinkHandler {
  onPaymentLink?: (linkId: string, secret: string) => void;
  onAirdropClaim?: (campaignId: string, claimData: string) => void;
  onConnect?: (sessionId: string) => void;
  onMessage?: (chatId: string, previewKey?: string) => void;
}

/**
 * Parse Styx deep links
 */
export function parseStyxDeepLink(url: string): {
  type: 'payment' | 'airdrop' | 'connect' | 'message' | 'unknown';
  params: Record<string, string>;
} {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, '');
    const params: Record<string, string> = {};
    
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    // styx://pay/LINK_ID?secret=SECRET
    if (path.startsWith('pay/')) {
      params.linkId = path.slice(4);
      return { type: 'payment', params };
    }
    
    // styx://claim/CAMPAIGN_ID?data=CLAIM_DATA
    if (path.startsWith('claim/')) {
      params.campaignId = path.slice(6);
      return { type: 'airdrop', params };
    }
    
    // styx://connect?session=SESSION_ID
    if (path === 'connect') {
      return { type: 'connect', params };
    }
    
    // styx://chat/CHAT_ID?preview=KEY
    if (path.startsWith('chat/')) {
      params.chatId = path.slice(5);
      return { type: 'message', params };
    }
    
    return { type: 'unknown', params };
  } catch {
    return { type: 'unknown', params: {} };
  }
}

/**
 * Set up deep link listener
 */
export function setupDeepLinkListener(handler: DeepLinkHandler): () => void {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    const { type, params } = parseStyxDeepLink(url);
    
    switch (type) {
      case 'payment':
        handler.onPaymentLink?.(params.linkId, params.secret);
        break;
      case 'airdrop':
        handler.onAirdropClaim?.(params.campaignId, params.data);
        break;
      case 'connect':
        handler.onConnect?.(params.session);
        break;
      case 'message':
        handler.onMessage?.(params.chatId, params.preview);
        break;
    }
  });
  
  return () => subscription.remove();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PushNotificationConfig {
  onMessage?: (payload: any) => void;
  onToken?: (token: string) => void;
}

/**
 * Request push notification permissions
 */
export async function requestPushPermissions(): Promise<boolean> {
  try {
    // Try expo-notifications
    const Notifications = require('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {}
  
  try {
    // Try @react-native-firebase/messaging
    const messaging = require('@react-native-firebase/messaging').default;
    const status = await messaging().requestPermission();
    return status === 1 || status === 2;
  } catch {}
  
  return false;
}

/**
 * Get push notification token
 */
export async function getPushToken(): Promise<string | null> {
  try {
    // Try expo-notifications
    const Notifications = require('expo-notifications');
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {}
  
  try {
    // Try Firebase
    const messaging = require('@react-native-firebase/messaging').default;
    const token = await messaging().getToken();
    return token;
  } catch {}
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIPBOARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    const Clipboard = require('@react-native-clipboard/clipboard').default;
    Clipboard.setString(text);
  } catch {
    try {
      const { Clipboard } = require('react-native');
      Clipboard.setString(text);
    } catch {
      console.warn('Clipboard not available');
    }
  }
}

/**
 * Read from clipboard
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    const Clipboard = require('@react-native-clipboard/clipboard').default;
    return Clipboard.getString();
  } catch {
    try {
      const { Clipboard } = require('react-native');
      return Clipboard.getString();
    } catch {
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShareOptions {
  title?: string;
  message: string;
  url?: string;
}

/**
 * Share content using native share sheet
 */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  try {
    const { Share } = require('react-native');
    const result = await Share.share({
      title: options.title,
      message: options.url ? `${options.message}\n${options.url}` : options.message,
      url: options.url, // iOS only
    });
    return result.action === 'sharedAction';
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAPTIC FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback
 */
export async function triggerHaptic(type: HapticType = 'light'): Promise<void> {
  try {
    const Haptics = require('expo-haptics');
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NetworkStatus {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown' | 'none';
}

/**
 * Get current network status
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      type: state.type ?? 'unknown',
    };
  } catch {
    return { isConnected: true, type: 'unknown' };
  }
}

/**
 * Subscribe to network status changes
 */
export function subscribeToNetworkStatus(
  callback: (status: NetworkStatus) => void
): () => void {
  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    return NetInfo.addEventListener((state: any) => {
      callback({
        isConnected: state.isConnected ?? false,
        type: state.type ?? 'unknown',
      });
    });
  } catch {
    return () => {};
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export const StyxPlatform = {
  /** Is running on iOS */
  isIOS: Platform.OS === 'ios',
  /** Is running on Android */
  isAndroid: Platform.OS === 'android',
  /** Platform version */
  version: Platform.Version,
  /** Is Seeker device (check for Solana Mobile Stack) */
  isSeeker: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    try {
      // Check for Solana Mobile Stack
      const hasWallet = await isMWAAvailable();
      // Check for Seeker-specific features
      const isSeekerDevice = NativeModules?.SolanaMobile?.isSeeker ?? false;
      return hasWallet || isSeekerDevice;
    } catch {
      return false;
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const StyxNative = {
  // Crypto
  getRandomBytes,
  getRandomBytesSync,
  
  // Storage
  secureStorage,
  
  // Keys
  generateKeyBundle,
  saveKeyBundle,
  loadKeyBundle,
  deleteKeyBundle,
  
  // MWA
  isMWAAvailable,
  getMWAAppIdentity,
  
  // Biometrics
  isBiometricAvailable,
  authenticateWithBiometrics,
  
  // Deep Links
  parseStyxDeepLink,
  setupDeepLinkListener,
  
  // Push
  requestPushPermissions,
  getPushToken,
  
  // Clipboard
  copyToClipboard,
  readFromClipboard,
  
  // Share
  shareContent,
  
  // Haptics
  triggerHaptic,
  
  // Network
  getNetworkStatus,
  subscribeToNetworkStatus,
  
  // Platform
  ...StyxPlatform,
};
