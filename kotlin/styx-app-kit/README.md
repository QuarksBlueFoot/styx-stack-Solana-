# Styx App Kit for Android

Privacy-first SDK for Solana mobile apps, compatible with **Solana Seeker** and **Mobile Wallet Adapter**.

## Installation

Add to your `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.styx:app-kit:1.0.0")
}
```

Or include as a module in your project.

## Quick Start

### 1. Initialize in Application

```kotlin
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        StyxAppKit.initialize(
            context = this,
            cluster = Cluster.MAINNET_BETA
        )
    }
}
```

### 2. Wrap with Provider (Compose)

```kotlin
@Composable
fun MyApp() {
    val appKit = StyxAppKit.getInstance()
    
    StyxProvider(appKit) {
        MainScreen()
    }
}
```

### 3. Connect Wallet

```kotlin
@Composable
fun ConnectScreen() {
    val styx = rememberStyx()
    val walletState by rememberWalletState()
    val context = LocalContext.current
    
    StyxConnectButton(
        connected = walletState.connected,
        connecting = walletState.connecting,
        address = walletState.account?.publicKeyBase58,
        onConnect = {
            scope.launch {
                styx.wallet.connect(context as Activity)
                styx.initializeModules(styx.wallet.publicKey!!)
            }
        },
        onDisconnect = { styx.wallet.disconnect() }
    )
}
```

### 4. Send Private Messages

```kotlin
@Composable
fun ChatScreen() {
    val styx = rememberStyx()
    val messages by styx.messaging.messages.collectAsState()
    
    LaunchedEffect(Unit) {
        // Send encrypted message with forward secrecy
        styx.messaging.sendMessage(
            recipientPubkey = "RecipientPubkey...",
            content = "Hello, privately!"
        )
    }
    
    LazyColumn {
        items(messages) { message ->
            MessageBubble(
                message = message.content,
                timestamp = formatTime(message.timestamp),
                isOutgoing = message.sender == styx.wallet.publicKey
            )
        }
    }
}
```

### 5. Create Payment Links (Resolv)

```kotlin
@Composable
fun PaymentScreen() {
    val styx = rememberStyx()
    var paymentLink by remember { mutableStateOf<PaymentLink?>(null) }
    
    Button(onClick = {
        scope.launch {
            // Create payment link - shareable via text/email
            paymentLink = styx.payments.createPaymentLink(
                amountSol = 1.0,
                memo = "Coffee money"
            )
        }
    }) {
        Text("Create Payment Link")
    }
    
    paymentLink?.let { link ->
        PaymentLinkCard(
            url = link.url,
            amount = "${link.amount / 1_000_000_000.0} SOL",
            status = link.status.name.lowercase(),
            onCopy = { /* copy to clipboard */ },
            onShare = { /* share via intent */ }
        )
    }
}
```

## Modules

| Module | Description |
|--------|-------------|
| `core` | Crypto primitives, config, client |
| `messaging` | Signal-like E2E encrypted messaging |
| `payments` | Stealth payments, Resolv links |
| `nft` | Private NFT/cNFT transfers with stealth addressing |
| `airdrop` | WhisperDrop private airdrops with collection gating |
| `compression` | Inscription compression adapter for compressed SPL tokens |
| `wallet` | Mobile Wallet Adapter integration |
| `ui` | Pre-built Compose components |

## Architecture

Follows **KMM 2026** patterns:
- Jetpack Compose UI
- Hilt dependency injection
- ViewModel + StateFlow
- Coroutines for async operations

## Seeker Compatibility

Fully compatible with Solana Seeker:
- Mobile Wallet Adapter 2.0
- Optimized for mobile performance
- Secure key storage with Keystore
- Biometric authentication support

## Security

- AES-256-GCM encryption
- Double Ratchet protocol for messaging
- DKSAP stealth addresses
- Nullifier-based double-spend prevention
- Keys stored in Android Keystore

## License

Apache-2.0
