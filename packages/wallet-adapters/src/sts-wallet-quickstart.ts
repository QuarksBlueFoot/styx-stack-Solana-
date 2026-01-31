/**
 * STS Wallet Integration - Quick Start
 * 
 * Copy this file into your wallet project to add basic STS support in 10 minutes.
 * 
 * Prerequisites:
 *   npm install @styxstack/sts-sdk @solana/web3.js
 * 
 * @license Apache-2.0
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';

// ============================================================================
// STEP 1: Constants (copy these)
// ============================================================================

export const STYX_PMP_PROGRAM_ID = 'GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9';
export const STYX_PMP_DEVNET_PROGRAM_ID = 'FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW';

// STS instruction tags for parsing
export const STS_TAGS = {
  NOTE_MINT: 80,
  NOTE_TRANSFER: 81,
  NOTE_MERGE: 82,
  NOTE_SPLIT: 83,
  NOTE_BURN: 84,
  NFT_MINT: 107,
  NFT_LIST: 112,
  NFT_BUY: 114,
} as const;

// ============================================================================
// STEP 2: STS Client (minimal implementation)
// ============================================================================

export class STSWalletClient {
  constructor(
    private connection: Connection,
    private programId: string = STYX_PMP_PROGRAM_ID
  ) {}

  /**
   * Check if a transaction involves STS
   */
  isSTSTransaction(tx: { programId: string }): boolean {
    return tx.programId === this.programId;
  }

  /**
   * Parse STS events from transaction logs
   */
  parseTransactionLogs(logs: string[]): STSEvent | null {
    for (const log of logs) {
      if (log.startsWith('Program data:')) {
        const base64Data = log.split('Program data: ')[1];
        if (!base64Data) continue;
        
        const data = Buffer.from(base64Data, 'base64');
        if (data.length < 2) continue;
        
        const tag = data[0];
        
        switch (tag) {
          case STS_TAGS.NOTE_MINT:
            return {
              type: 'mint',
              tag,
              mint: data.slice(2, 34),
              amount: data.length >= 42 ? data.readBigUInt64LE(34) : 0n,
              commitment: data.slice(42, 74),
            };
            
          case STS_TAGS.NOTE_TRANSFER:
            return {
              type: 'transfer',
              tag,
              nullifier: data.slice(2, 34),
              newCommitment: data.slice(34, 66),
              encryptedAmount: data.length >= 74 ? data.readBigUInt64LE(66) : 0n,
            };
            
          case STS_TAGS.NOTE_BURN:
            return {
              type: 'burn',
              tag,
              nullifier: data.slice(2, 34),
              amount: data.length >= 42 ? data.readBigUInt64LE(34) : 0n,
            };
            
          case STS_TAGS.NFT_MINT:
            return {
              type: 'nft_mint',
              tag,
              commitment: data.slice(2, 34),
            };
            
          default:
            return {
              type: 'unknown',
              tag,
              rawData: data,
            };
        }
      }
    }
    return null;
  }
}

// ============================================================================
// STEP 3: Types
// ============================================================================

export interface STSEvent {
  type: 'mint' | 'transfer' | 'burn' | 'nft_mint' | 'unknown';
  tag: number;
  mint?: Uint8Array;
  amount?: bigint;
  commitment?: Uint8Array;
  nullifier?: Uint8Array;
  newCommitment?: Uint8Array;
  encryptedAmount?: bigint;
  rawData?: Uint8Array;
}

export interface STSNote {
  commitment: Uint8Array;
  amount: bigint;
  mint: PublicKey;
  spent: boolean;
}

export interface STSBalance {
  total: bigint;
  notes: STSNote[];
}

// ============================================================================
// STEP 4: Local Balance Tracker (for privacy-preserving wallets)
// ============================================================================

export class STSBalanceTracker {
  private notes: Map<string, STSNote[]> = new Map();

  /**
   * Add a note received by an address
   */
  addNote(address: string, note: STSNote): void {
    if (!this.notes.has(address)) {
      this.notes.set(address, []);
    }
    this.notes.get(address)!.push(note);
  }

  /**
   * Mark a note as spent
   */
  markSpent(commitment: Uint8Array): void {
    const commitmentStr = Buffer.from(commitment).toString('hex');
    for (const notes of this.notes.values()) {
      for (const note of notes) {
        if (Buffer.from(note.commitment).toString('hex') === commitmentStr) {
          note.spent = true;
          return;
        }
      }
    }
  }

  /**
   * Get unspent balance for an address
   */
  getBalance(address: string, mint?: PublicKey): STSBalance {
    const allNotes = this.notes.get(address) || [];
    const unspent = allNotes.filter(n => {
      if (n.spent) return false;
      if (mint && !n.mint.equals(mint)) return false;
      return true;
    });
    
    return {
      total: unspent.reduce((sum, n) => sum + n.amount, 0n),
      notes: unspent,
    };
  }

  /**
   * Get all notes (for export/backup)
   */
  exportNotes(): Record<string, STSNote[]> {
    const result: Record<string, STSNote[]> = {};
    for (const [address, notes] of this.notes) {
      result[address] = notes;
    }
    return result;
  }

  /**
   * Import notes (from backup)
   */
  importNotes(data: Record<string, STSNote[]>): void {
    for (const [address, notes] of Object.entries(data)) {
      this.notes.set(address, notes);
    }
  }
}

// ============================================================================
// STEP 5: UI Helpers
// ============================================================================

/**
 * Check if a program ID is STS
 */
export function isSTSProgram(programId: string | PublicKey): boolean {
  const id = typeof programId === 'string' ? programId : programId.toBase58();
  return id === STYX_PMP_PROGRAM_ID || id === STYX_PMP_DEVNET_PROGRAM_ID;
}

/**
 * Format STS amount for display
 */
export function formatSTSAmount(amount: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === 0n) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

/**
 * Get STS transaction type label for UI
 */
export function getSTSTransactionLabel(tag: number): string {
  switch (tag) {
    case STS_TAGS.NOTE_MINT: return 'Mint';
    case STS_TAGS.NOTE_TRANSFER: return 'Transfer';
    case STS_TAGS.NOTE_MERGE: return 'Merge Notes';
    case STS_TAGS.NOTE_SPLIT: return 'Split Note';
    case STS_TAGS.NOTE_BURN: return 'Burn';
    case STS_TAGS.NFT_MINT: return 'Mint NFT';
    case STS_TAGS.NFT_LIST: return 'List NFT';
    case STS_TAGS.NFT_BUY: return 'Buy NFT';
    default: return `STS (${tag})`;
  }
}

/**
 * Get STS-specific transaction preview info
 */
export function getSTSTransactionPreview(event: STSEvent): {
  title: string;
  description: string;
  networkFee: string;
  rent: string;
  isPrivate: boolean;
} {
  return {
    title: getSTSTransactionLabel(event.tag),
    description: event.amount 
      ? `Amount: ${formatSTSAmount(event.amount)}` 
      : 'STS Operation',
    networkFee: '~0.001 SOL',
    rent: '0 SOL', // STS is always zero rent
    isPrivate: event.type === 'transfer', // Transfers can be private
  };
}

// ============================================================================
// STEP 6: Full SDK Integration (optional - for complete features)
// ============================================================================

/**
 * Full SDK integration - use when you need all STS features
 * 
 * import { STS, StyxPMP } from '@styxstack/sts-sdk';
 * 
 * const styx = new StyxPMP(connection, STYX_PMP_PROGRAM_ID);
 * const sts = new STS(styx);
 * 
 * // Send tokens (Token-22 compatible UX)
 * await sts.sendTo(wallet, {
 *   to: recipientAddress,
 *   amount: 100n,
 *   mint: tokenMint,
 * });
 */

// ============================================================================
// EXAMPLE: Integrating into your wallet
// ============================================================================

/*
// In your transaction history component:

import { STSWalletClient, getSTSTransactionLabel, isSTSProgram } from './sts-wallet-quickstart';

const stsClient = new STSWalletClient(connection);

function TransactionRow({ tx }) {
  // Check if this is an STS transaction
  if (isSTSProgram(tx.programId)) {
    const event = stsClient.parseTransactionLogs(tx.logs);
    
    return (
      <div className="transaction-row sts-transaction">
        <Badge color="purple">STS</Badge>
        <span>{getSTSTransactionLabel(event?.tag || 0)}</span>
        {event?.amount && (
          <span className="amount">{formatSTSAmount(event.amount)}</span>
        )}
      </div>
    );
  }
  
  // Regular transaction
  return <NormalTransactionRow tx={tx} />;
}

// In your token list:

function TokenList({ tokens }) {
  return tokens.map(token => (
    <TokenRow 
      key={token.mint}
      {...token}
      badge={isSTSProgram(token.programId) ? 'STS' : undefined}
    />
  ));
}

// In your send flow:

async function handleSend(recipient: string, amount: string, mint: PublicKey) {
  // Import full SDK for sending
  const { STS, StyxPMP } = await import('@styxstack/sts-sdk');
  
  const styx = new StyxPMP(connection);
  const sts = new STS(styx);
  
  const { signature } = await sts.sendTo(wallet, {
    to: new PublicKey(recipient),
    amount: BigInt(parseFloat(amount) * 1e6), // Assuming 6 decimals
    mint,
  });
  
  return signature;
}
*/

export default STSWalletClient;
