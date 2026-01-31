/**
 * SPS Module - Styx Privacy Standard
 * Full-featured privacy SDK (requires Styx Program)
 */

// Re-export from sps-sdk
export * from '@styxstack/sps-sdk';

// Explicit re-exports for clarity
export {
  SpsClient,
  SPS_PROGRAM_ID,
  SPS_DEVNET_PROGRAM_ID,
} from '@styxstack/sps-sdk';

// DAM
export {
  DAMClient,
  type DAMPoolConfig,
  type VirtualBalance,
  type MaterializationProof,
  type MaterializationResult,
  type DematerializationResult,
} from '@styxstack/sps-sdk';

// EasyPay (with program)
export {
  EasyPayClient,
  createEasyPayClient,
  type ClaimablePayment,
  type StealthKeys,
  type PaymentLink,
  type RelayerConfig,
  type MetaTransaction,
} from '@styxstack/sps-sdk';

// Private Swap
export {
  PrivateSwapClient,
  createPrivateSwapClient,
  SWAP_OPS,
} from '@styxstack/sps-sdk';

// Domains - All 16 privacy domains + 3 special domains
export {
  // Special domains (extension mechanisms)
  DOMAIN_EXTENDED,
  DOMAIN_TLV,
  DOMAIN_SCHEMA,
  // Core domains (0x01-0x0D)
  DOMAIN_STS,
  DOMAIN_MESSAGING,
  DOMAIN_ACCOUNT,
  DOMAIN_VSL,
  DOMAIN_NOTES,
  DOMAIN_COMPLIANCE,
  DOMAIN_PRIVACY,
  DOMAIN_DEFI,
  DOMAIN_NFT,
  DOMAIN_DERIVATIVES,
  DOMAIN_BRIDGE,
  DOMAIN_SECURITIES,
  DOMAIN_GOVERNANCE,
  // SPS-unique domains (0x0E-0x11)
  DOMAIN_DAM,
  DOMAIN_IC,
  DOMAIN_SWAP,
  DOMAIN_EASYPAY,
  // Domain operation modules (all 16!)
  sts,
  messaging,
  account,
  vsl,
  notes,
  compliance,
  privacy,
  defi,
  nft,
  derivatives,
  bridge,
  securities,
  governance,
  dam,
  ic,
  swap,
  easypay,
  // Extension types
  extensions,
  poolTypes,
  // Helpers
  buildInstructionPrefix,
  getDomainName,
} from '@styxstack/sps-sdk/domains';

// Factory functions
export function createSpsClient(connection: import('@solana/web3.js').Connection) {
  const { SpsClient } = require('@styxstack/sps-sdk');
  return new SpsClient({ connection });
}

export function createDAMClient(connection: import('@solana/web3.js').Connection) {
  const { DAMClient } = require('@styxstack/sps-sdk');
  return new DAMClient(connection);
}
