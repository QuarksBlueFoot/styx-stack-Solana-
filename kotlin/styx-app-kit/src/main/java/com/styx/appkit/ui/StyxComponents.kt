package com.styx.appkit.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX UI COMPONENTS
 *  
 *  Pre-built Compose components for privacy-first apps
 *  Follows Material 3 design with Styx branding
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════════════════════

object StyxColors {
    val Styx = Color(0xFF9945FF)
    val River = Color(0xFF14F195)
    val Dark950 = Color(0xFF0A0A0F)
    val Dark900 = Color(0xFF12121A)
    val Dark800 = Color(0xFF1A1A26)
    val Dark700 = Color(0xFF252535)
    val Dark500 = Color(0xFF6B6B8A)
    val Dark400 = Color(0xFF8B8BAA)
    val Dark200 = Color(0xFFCCCCDD)
    
    val GradientStyx = Brush.horizontalGradient(
        colors = listOf(Styx, River)
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECT BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun StyxConnectButton(
    connected: Boolean,
    connecting: Boolean,
    address: String?,
    onConnect: () -> Unit,
    onDisconnect: () -> Unit,
    modifier: Modifier = Modifier
) {
    val label = when {
        connecting -> "Connecting..."
        connected && address != null -> "${address.take(4)}...${address.takeLast(4)}"
        connected -> "Connected"
        else -> "Connect Wallet"
    }
    
    Button(
        onClick = { if (connected) onDisconnect() else onConnect() },
        enabled = !connecting,
        modifier = modifier.height(48.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (connected) StyxColors.River else StyxColors.Styx,
            contentColor = Color.White
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Text(
            text = label,
            fontWeight = FontWeight.SemiBold
        )
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun AddressDisplay(
    address: String,
    truncate: Boolean = true,
    onCopy: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val displayAddress = if (truncate && address.length > 12) {
        "${address.take(4)}...${address.takeLast(4)}"
    } else address
    
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .then(if (onCopy != null) Modifier.clickable { onCopy() } else Modifier),
        color = StyxColors.Dark800
    ) {
        Text(
            text = displayAddress,
            color = StyxColors.Dark200,
            fontSize = 14.sp,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
        )
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun BalanceDisplay(
    balance: String,
    symbol: String = "SOL",
    hidden: Boolean = false,
    onToggleVisibility: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = if (hidden) "••••••" else balance,
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = symbol,
            fontSize = 18.sp,
            color = StyxColors.Dark400
        )
        if (onToggleVisibility != null) {
            IconButton(onClick = onToggleVisibility) {
                Text(
                    text = if (hidden) "👁️" else "🙈",
                    fontSize = 20.sp
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT LINK CARD
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun PaymentLinkCard(
    url: String,
    amount: String,
    status: String,
    onCopy: () -> Unit,
    onShare: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = StyxColors.Dark800,
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Payment Link",
                    color = StyxColors.Dark400,
                    fontSize = 14.sp
                )
                Surface(
                    color = when (status) {
                        "pending" -> Color(0xFF3B82F6).copy(alpha = 0.2f)
                        "claimed" -> StyxColors.River.copy(alpha = 0.2f)
                        else -> StyxColors.Dark700
                    },
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = status.replaceFirstChar { it.uppercase() },
                        color = when (status) {
                            "pending" -> Color(0xFF3B82F6)
                            "claimed" -> StyxColors.River
                            else -> StyxColors.Dark400
                        },
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            
            Text(
                text = amount,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Text(
                text = url,
                color = StyxColors.Dark400,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onCopy,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Copy")
                }
                Button(
                    onClick = onShare,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = StyxColors.Styx
                    )
                ) {
                    Text("Share")
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun MessageBubble(
    message: String,
    timestamp: String,
    isOutgoing: Boolean,
    isEncrypted: Boolean = true,
    modifier: Modifier = Modifier
) {
    val alignment = if (isOutgoing) Alignment.End else Alignment.Start
    val backgroundColor = if (isOutgoing) StyxColors.Styx else StyxColors.Dark700
    val shape = RoundedCornerShape(
        topStart = 16.dp,
        topEnd = 16.dp,
        bottomStart = if (isOutgoing) 16.dp else 4.dp,
        bottomEnd = if (isOutgoing) 4.dp else 16.dp
    )
    
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = alignment
    ) {
        Surface(
            color = backgroundColor,
            shape = shape,
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(
                modifier = Modifier.padding(12.dp)
            ) {
                if (isEncrypted) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text("🔒", fontSize = 10.sp)
                        Text(
                            "End-to-end encrypted",
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 10.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }
                
                Text(
                    text = message,
                    color = Color.White,
                    fontSize = 15.sp
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = timestamp,
                    color = Color.White.copy(alpha = 0.5f),
                    fontSize = 11.sp,
                    modifier = Modifier.align(Alignment.End)
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVACY TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun PrivacyToggle(
    label: String,
    description: String? = null,
    enabled: Boolean,
    onToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = StyxColors.Dark800,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    color = Color.White,
                    fontWeight = FontWeight.Medium
                )
                if (description != null) {
                    Text(
                        text = description,
                        color = StyxColors.Dark400,
                        fontSize = 13.sp
                    )
                }
            }
            Switch(
                checked = enabled,
                onCheckedChange = onToggle,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = StyxColors.River,
                    uncheckedThumbColor = StyxColors.Dark400,
                    uncheckedTrackColor = StyxColors.Dark700
                )
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION STATUS
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun TransactionStatus(
    status: String, // pending, confirming, confirmed, failed
    signature: String? = null,
    onViewExplorer: (() -> Unit)? = null,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val (emoji, statusText, color) = when (status) {
        "pending" -> Triple("⏳", "Pending", Color(0xFFFBBF24))
        "confirming" -> Triple("🔄", "Confirming", Color(0xFF3B82F6))
        "confirmed" -> Triple("✅", "Confirmed", StyxColors.River)
        "failed" -> Triple("❌", "Failed", Color(0xFFEF4444))
        else -> Triple("❓", "Unknown", StyxColors.Dark400)
    }
    
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = StyxColors.Dark800,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(emoji, fontSize = 20.sp)
                Text(
                    text = statusText,
                    color = color,
                    fontWeight = FontWeight.Medium
                )
            }
            
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (signature != null && onViewExplorer != null) {
                    TextButton(onClick = onViewExplorer) {
                        Text("View", color = StyxColors.River)
                    }
                }
                if (status == "failed" && onRetry != null) {
                    TextButton(onClick = onRetry) {
                        Text("Retry", color = StyxColors.Styx)
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADIENT BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
fun StyxGradientButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    loading: Boolean = false,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.height(52.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            disabledContainerColor = StyxColors.Dark700
        ),
        contentPadding = PaddingValues(0.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    if (enabled) StyxColors.GradientStyx else Brush.horizontalGradient(
                        listOf(StyxColors.Dark700, StyxColors.Dark700)
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            if (loading) {
                CircularProgressIndicator(
                    color = Color.White,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(24.dp)
                )
            } else {
                Text(
                    text = text,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
            }
        }
    }
}
