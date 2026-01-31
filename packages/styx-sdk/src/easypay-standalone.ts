/**
 * EasyPay Standalone Module
 * No custom Solana programs required - just install and go!
 */

// Re-export everything from the standalone implementation
export {
  EasyPayStandalone,
  createEasyPayStandalone,
  quickSendStandalone,
  generatePaymentId,
  generateClaimCredentials,
  verifyClaimSecret,
  encryptPaymentMetadata,
  decryptPaymentMetadata,
  generateStealthReceiver,
  MEMO_PROGRAM_ID,
  DEFAULT_RELAYER_URL,
  DEFAULT_EXPIRY_SECONDS,
  MIN_EXPIRY_SECONDS,
  MAX_EXPIRY_SECONDS,
  type StandalonePaymentConfig,
  type StandalonePayment,
  type StandalonePaymentLink,
  type StandaloneClaimResult,
} from '@styxstack/sps-sdk';
