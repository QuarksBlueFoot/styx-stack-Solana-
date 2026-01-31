/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX UI COMPONENTS
 *  
 *  Pre-built React/React Native components for privacy-first apps
 *  Note: These are headless components - bring your own styling
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECT BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectButtonProps extends ComponentProps {
  onConnect?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  connectLabel?: string;
  disconnectLabel?: string;
  loadingLabel?: string;
  connected?: boolean;
  connecting?: boolean;
  address?: string;
  renderButton?: (props: {
    onClick: () => void;
    label: string;
    loading: boolean;
    connected: boolean;
  }) => ReactNode;
}

/**
 * Headless connect wallet button
 */
export function ConnectButton({
  onConnect,
  onDisconnect,
  connectLabel = 'Connect Wallet',
  disconnectLabel = 'Disconnect',
  loadingLabel = 'Connecting...',
  connected = false,
  connecting = false,
  address,
  renderButton,
  className,
  style,
}: ConnectButtonProps) {
  const handleClick = useCallback(async () => {
    if (connected) {
      await onDisconnect?.();
    } else {
      await onConnect?.();
    }
  }, [connected, onConnect, onDisconnect]);

  const label = connecting 
    ? loadingLabel 
    : connected 
      ? (address ? `${address.slice(0, 4)}...${address.slice(-4)}` : disconnectLabel)
      : connectLabel;

  if (renderButton) {
    return <>{renderButton({ onClick: handleClick, label, loading: connecting, connected })}</>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className={className}
      style={style}
    >
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT LINK
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaymentLinkDisplayProps extends ComponentProps {
  url: string;
  amount: string;
  onCopy?: () => void;
  onShare?: () => void;
  renderLink?: (props: {
    url: string;
    amount: string;
    onCopy: () => void;
    onShare: () => void;
  }) => ReactNode;
}

/**
 * Display a payment link with copy/share actions
 */
export function PaymentLinkDisplay({
  url,
  amount,
  onCopy,
  onShare,
  renderLink,
  className,
  style,
}: PaymentLinkDisplayProps) {
  const handleCopy = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
    onCopy?.();
  }, [url, onCopy]);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: `Payment for ${amount}`,
        text: 'Claim your payment',
        url,
      });
    }
    onShare?.();
  }, [url, amount, onShare]);

  if (renderLink) {
    return <>{renderLink({ url, amount, onCopy: handleCopy, onShare: handleShare })}</>;
  }

  return (
    <div className={className} style={style}>
      <p>Payment Link: {amount}</p>
      <input type="text" value={url} readOnly />
      <button onClick={handleCopy}>Copy</button>
      <button onClick={handleShare}>Share</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface MessageInputProps extends ComponentProps {
  onSend: (message: string) => Promise<void>;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  renderInput?: (props: {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled: boolean;
    sending: boolean;
  }) => ReactNode;
}

/**
 * Message input with send action
 */
export function MessageInput({
  onSend,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  sending = false,
  renderInput,
  className,
  style,
}: MessageInputProps) {
  const [value, setValue] = useState('');

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    onTyping?.();
  }, [onTyping]);

  const handleSend = useCallback(async () => {
    if (value.trim() && !disabled && !sending) {
      await onSend(value.trim());
      setValue('');
    }
  }, [value, onSend, disabled, sending]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (renderInput) {
    return <>{renderInput({ value, onChange: handleChange, onSend: handleSend, disabled, sending })}</>;
  }

  return (
    <div className={className} style={style}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled || sending}
      />
      <button onClick={handleSend} disabled={disabled || sending || !value.trim()}>
        {sending ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

export interface BalanceDisplayProps extends ComponentProps {
  balance: string | number;
  symbol?: string;
  hidden?: boolean;
  onToggleVisibility?: () => void;
  renderBalance?: (props: {
    balance: string;
    symbol: string;
    hidden: boolean;
    onToggle: () => void;
  }) => ReactNode;
}

/**
 * Balance display with privacy toggle
 */
export function BalanceDisplay({
  balance,
  symbol = 'SOL',
  hidden = false,
  onToggleVisibility,
  renderBalance,
  className,
  style,
}: BalanceDisplayProps) {
  const displayBalance = hidden ? '••••••' : String(balance);

  const handleToggle = useCallback(() => {
    onToggleVisibility?.();
  }, [onToggleVisibility]);

  if (renderBalance) {
    return <>{renderBalance({ balance: displayBalance, symbol, hidden, onToggle: handleToggle })}</>;
  }

  return (
    <div className={className} style={style}>
      <span>{displayBalance} {symbol}</span>
      <button onClick={handleToggle}>{hidden ? '👁️' : '🙈'}</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

export interface AddressDisplayProps extends ComponentProps {
  address: string | PublicKey;
  truncate?: boolean;
  truncateLength?: number;
  onCopy?: () => void;
  renderAddress?: (props: {
    full: string;
    truncated: string;
    onCopy: () => void;
  }) => ReactNode;
}

/**
 * Address display with copy action
 */
export function AddressDisplay({
  address,
  truncate = true,
  truncateLength = 4,
  onCopy,
  renderAddress,
  className,
  style,
}: AddressDisplayProps) {
  const fullAddress = typeof address === 'string' ? address : address.toBase58();
  const truncatedAddress = truncate
    ? `${fullAddress.slice(0, truncateLength)}...${fullAddress.slice(-truncateLength)}`
    : fullAddress;

  const handleCopy = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(fullAddress);
    }
    onCopy?.();
  }, [fullAddress, onCopy]);

  if (renderAddress) {
    return <>{renderAddress({ full: fullAddress, truncated: truncatedAddress, onCopy: handleCopy })}</>;
  }

  return (
    <span className={className} style={style} onClick={handleCopy} title={fullAddress}>
      {truncatedAddress}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TransactionStatusProps extends ComponentProps {
  status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  signature?: string;
  explorerUrl?: string;
  onRetry?: () => void;
  renderStatus?: (props: {
    status: string;
    signature?: string;
    explorerUrl?: string;
    onRetry?: () => void;
  }) => ReactNode;
}

/**
 * Transaction status indicator
 */
export function TransactionStatus({
  status,
  signature,
  explorerUrl,
  onRetry,
  renderStatus,
  className,
  style,
}: TransactionStatusProps) {
  const statusEmoji = {
    pending: '⏳',
    confirming: '🔄',
    confirmed: '✅',
    failed: '❌',
  }[status];

  const statusText = {
    pending: 'Pending',
    confirming: 'Confirming',
    confirmed: 'Confirmed',
    failed: 'Failed',
  }[status];

  if (renderStatus) {
    return <>{renderStatus({ status, signature, explorerUrl, onRetry })}</>;
  }

  return (
    <div className={className} style={style}>
      <span>{statusEmoji} {statusText}</span>
      {signature && explorerUrl && (
        <a href={`${explorerUrl}/tx/${signature}`} target="_blank" rel="noopener noreferrer">
          View
        </a>
      )}
      {status === 'failed' && onRetry && (
        <button onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVACY TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════

export interface PrivacyToggleProps extends ComponentProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  renderToggle?: (props: {
    label: string;
    description?: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
  }) => ReactNode;
}

/**
 * Privacy setting toggle
 */
export function PrivacyToggle({
  label,
  description,
  enabled,
  onChange,
  renderToggle,
  className,
  style,
}: PrivacyToggleProps) {
  if (renderToggle) {
    return <>{renderToggle({ label, description, enabled, onChange })}</>;
  }

  return (
    <div className={className} style={style}>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
      {description && <p>{description}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SWAP INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SwapInterfaceProps extends ComponentProps {
  inputToken: { symbol: string; balance: string };
  outputToken: { symbol: string; balance: string };
  inputAmount: string;
  outputAmount: string;
  onInputChange: (amount: string) => void;
  onSwap: () => Promise<void>;
  onTokenFlip: () => void;
  loading?: boolean;
  priceImpact?: string;
  renderSwap?: (props: {
    inputToken: { symbol: string; balance: string };
    outputToken: { symbol: string; balance: string };
    inputAmount: string;
    outputAmount: string;
    onInputChange: (amount: string) => void;
    onSwap: () => void;
    onTokenFlip: () => void;
    loading: boolean;
    priceImpact?: string;
  }) => ReactNode;
}

/**
 * Swap interface component
 */
export function SwapInterface({
  inputToken,
  outputToken,
  inputAmount,
  outputAmount,
  onInputChange,
  onSwap,
  onTokenFlip,
  loading = false,
  priceImpact,
  renderSwap,
  className,
  style,
}: SwapInterfaceProps) {
  if (renderSwap) {
    return <>{renderSwap({
      inputToken,
      outputToken,
      inputAmount,
      outputAmount,
      onInputChange,
      onSwap,
      onTokenFlip,
      loading,
      priceImpact,
    })}</>;
  }

  return (
    <div className={className} style={style}>
      <div>
        <input
          type="number"
          value={inputAmount}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="0.0"
        />
        <span>{inputToken.symbol}</span>
        <small>Balance: {inputToken.balance}</small>
      </div>
      
      <button onClick={onTokenFlip}>↕️</button>
      
      <div>
        <input type="text" value={outputAmount} readOnly placeholder="0.0" />
        <span>{outputToken.symbol}</span>
        <small>Balance: {outputToken.balance}</small>
      </div>
      
      {priceImpact && <p>Price Impact: {priceImpact}%</p>}
      
      <button onClick={onSwap} disabled={loading || !inputAmount}>
        {loading ? 'Swapping...' : 'Swap'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const StyxComponents = {
  ConnectButton,
  PaymentLinkDisplay,
  MessageInput,
  BalanceDisplay,
  AddressDisplay,
  TransactionStatus,
  PrivacyToggle,
  SwapInterface,
};
