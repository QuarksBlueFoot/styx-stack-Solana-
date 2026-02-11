@file:Suppress("unused")
package nexus.styx.android.compose

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import nexus.styx.core.PublicKey

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
