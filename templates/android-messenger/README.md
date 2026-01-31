# Styx Messenger Scaffold (Android)

This template provides a starting point for building a Signal-style private messenger using the Styx App Kit.

## Architecture

- **UI**: Jetpack Compose
- **State**: Hilt ViewModel + Kotlin Flow
- **Privacy**: Styx App Kit (Double Ratchet)
- **Local DB**: Room (for caching conversations)

## Usage

1. Copy the `app/` files to your Android project.
2. Add dependencies in `build.gradle.kts`.
3. Configure `StyxAppKit` in `MessagingApplication.kt`.

## Key Components

- `ConversationScreen.kt`: Chat UI with bubble rendering.
- `MessagingViewModel.kt`: Handles sending/receiving via `appKit.messaging`.
- `MessagingWorker.kt`: Background worker for fetching new messages.

## Dependencies

```kotlin
implementation("com.styx:styx-app-kit:1.0.0")
implementation("androidx.hilt:hilt-navigation-compose:1.0.0")
implementation("androidx.room:room-runtime:2.6.0")
```
