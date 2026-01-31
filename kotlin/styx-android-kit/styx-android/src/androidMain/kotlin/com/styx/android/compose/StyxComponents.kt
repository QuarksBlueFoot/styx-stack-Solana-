@file:Suppress("unused")
package com.styx.android.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.styx.core.PublicKey

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET CONNECT BUTTON (Solana App Kit parity)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Solana App Kit–style wallet connect button.
 *
 * Shows "Connect Wallet" when disconnected, abbreviated address when connected.
 * Follows the Solana Mobile Compose scaffold pattern.
 */
@Composable
fun WalletConnectButton(
    connected: Boolean,
    walletAddress: String?,
    onConnect: () -> Unit,
    onDisconnect: () -> Unit,
    modifier: Modifier = Modifier,
    loading: Boolean = false,
    walletName: String? = null,
) {
    if (connected && walletAddress != null) {
        OutlinedButton(
            onClick = onDisconnect,
            modifier = modifier,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Green dot indicator
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    if (walletName != null) {
                        Text(
                            walletName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        abbreviateAddress(walletAddress),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 13.sp,
                    )
                }
            }
        }
    } else {
        Button(
            onClick = onConnect,
            enabled = !loading,
            modifier = modifier,
        ) {
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text("Connect Wallet")
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS DISPLAY (Solana App Kit parity)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Display a Solana address with copy-to-clipboard and optional label.
 *
 * Matches the Solana App Kit `AddressDisplay` component pattern.
 */
@Composable
fun AddressDisplay(
    address: String,
    modifier: Modifier = Modifier,
    label: String? = null,
    abbreviated: Boolean = true,
    copyable: Boolean = true,
) {
    val clipboard = LocalClipboardManager.current
    var showCopied by remember { mutableStateOf(false) }

    LaunchedEffect(showCopied) {
        if (showCopied) {
            kotlinx.coroutines.delay(1500)
            showCopied = false
        }
    }

    Surface(
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = modifier,
        onClick = if (copyable) {
            {
                clipboard.setText(AnnotatedString(address))
                showCopied = true
            }
        } else {
            {}
        },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                if (label != null) {
                    Text(
                        label,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                }
                Text(
                    text = if (abbreviated) abbreviateAddress(address) else address,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (copyable) {
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    if (showCopied) "✓" else "📋",
                    fontSize = 14.sp,
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION STATUS CARD (Solana App Kit parity)
// ═══════════════════════════════════════════════════════════════════════════════

enum class TransactionState {
    BUILDING, SIGNING, SENDING, CONFIRMING, CONFIRMED, FAILED
}

/**
 * Displays the current status of a Styx transaction lifecycle.
 *
 * Covers the full flow: build → sign (MWA) → send → confirm.
 */
@Composable
fun TransactionStatusCard(
    state: TransactionState,
    signature: String? = null,
    errorMessage: String? = null,
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null,
) {
    val (icon, label, color) = when (state) {
        TransactionState.BUILDING -> Triple("🔧", "Building transaction…", MaterialTheme.colorScheme.onSurfaceVariant)
        TransactionState.SIGNING -> Triple("✍️", "Awaiting wallet signature…", MaterialTheme.colorScheme.primary)
        TransactionState.SENDING -> Triple("📡", "Sending to network…", MaterialTheme.colorScheme.primary)
        TransactionState.CONFIRMING -> Triple("⏳", "Confirming…", MaterialTheme.colorScheme.tertiary)
        TransactionState.CONFIRMED -> Triple("✅", "Confirmed", MaterialTheme.colorScheme.primary)
        TransactionState.FAILED -> Triple("❌", "Failed", MaterialTheme.colorScheme.error)
    }

    Card(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(icon, fontSize = 20.sp)
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        label,
                        style = MaterialTheme.typography.titleSmall,
                        color = color,
                    )
                    if (signature != null) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            abbreviateAddress(signature),
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (state == TransactionState.BUILDING || state == TransactionState.SIGNING ||
                    state == TransactionState.SENDING || state == TransactionState.CONFIRMING
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                    )
                }
            }
            if (state == TransactionState.FAILED && errorMessage != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    errorMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
            if (state == TransactionState.FAILED && onRetry != null) {
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = onRetry) {
                    Text("Retry")
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHIELD BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Composable button that triggers a shield (deposit) operation.
 */
@Composable
fun ShieldButton(
    mint: PublicKey,
    amount: Long,
    onShield: (mint: PublicKey, amount: Long) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false
) {
    Button(
        onClick = { onShield(mint, amount) },
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth()
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text("Shield ${formatAmount(amount)}")
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNSHIELD BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun UnshieldButton(
    amount: Long,
    onUnshield: (amount: Long) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false
) {
    OutlinedButton(
        onClick = { onUnshield(amount) },
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth()
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text("Unshield ${formatAmount(amount)}")
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVACY STATUS CARD
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun PrivacyStatusCard(
    shieldedBalance: Long,
    publicBalance: Long,
    poolCount: Int,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Privacy Status",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Shielded", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(formatAmount(shieldedBalance), fontWeight = FontWeight.Bold)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Public", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(formatAmount(publicBalance), fontWeight = FontWeight.Bold)
                }
            }
            Spacer(modifier = Modifier.height(8.dp))

            val total = shieldedBalance + publicBalance
            val shieldedPct = if (total > 0) shieldedBalance.toFloat() / total else 0f

            LinearProgressIndicator(
                progress = { shieldedPct },
                modifier = Modifier.fillMaxWidth().height(6.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "${(shieldedPct * 100).toInt()}% private · $poolCount pools",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun EncryptedMessageBubble(
    content: String,
    isSentByMe: Boolean,
    timestamp: Long,
    modifier: Modifier = Modifier
) {
    val alignment = if (isSentByMe) Alignment.End else Alignment.Start
    val containerColor = if (isSentByMe)
        MaterialTheme.colorScheme.primaryContainer
    else
        MaterialTheme.colorScheme.surfaceVariant

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = alignment
    ) {
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = containerColor,
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = content,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "🔒",
                        fontSize = 10.sp
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        formatTimestamp(timestamp),
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

private fun formatAmount(lamports: Long): String {
    val sol = lamports / 1_000_000_000.0
    return if (sol >= 1.0) {
        "%.4f SOL".format(sol)
    } else {
        "$lamports lamports"
    }
}

private fun formatTimestamp(epochMs: Long): String {
    val seconds = epochMs / 1000
    val minutes = (seconds / 60) % 60
    val hours = (seconds / 3600) % 24
    return "%02d:%02d".format(hours, minutes)
}

/**
 * Abbreviate a Solana base58 address: "AbCd...xYzW"
 */
private fun abbreviateAddress(address: String, prefixLen: Int = 4, suffixLen: Int = 4): String {
    if (address.length <= prefixLen + suffixLen + 3) return address
    return "${address.take(prefixLen)}…${address.takeLast(suffixLen)}"
}
