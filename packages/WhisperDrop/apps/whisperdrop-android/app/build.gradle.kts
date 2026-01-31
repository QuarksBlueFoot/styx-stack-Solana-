plugins {
  id("com.android.application") version "8.5.2"
  id("org.jetbrains.kotlin.android") version "2.0.20"
  id("org.jetbrains.kotlin.plugin.serialization") version "2.0.20"
}

android {
  namespace = "com.styx.whisperdrop"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.styx.whisperdrop"
    minSdk = 26
    targetSdk = 35
    versionCode = 1
    versionName = "0.0.1-step3b"
  }

  buildFeatures {
    compose = true
  }

  composeOptions {
    kotlinCompilerExtensionVersion = "1.5.14"
  }

  packaging {
    resources {
      excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions {
    jvmTarget = "17"
  }
}

dependencies {
  val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
  implementation(composeBom)
  androidTestImplementation(composeBom)

  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.activity:activity-compose:1.9.2")
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.compose.material3:material3:1.3.0")
  debugImplementation("androidx.compose.ui:ui-tooling")

  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
  implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")

  implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

  // Networking (Step 6)
  implementation("com.squareup.okhttp3:okhttp:4.12.0")

  // Crypto (Step 4): X25519 + HKDF + AES-GCM
  implementation("org.bouncycastle:bcprov-jdk15to18:1.78.1")
  implementation("org.bouncycastle:bcpkix-jdk15to18:1.78.1")

// Solana Mobile Stack (Step 9): MWA + web3 + rpc
implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.1.0")
implementation("com.solanamobile:web3-solana:0.2.5")
implementation("com.solanamobile:rpc-core:0.2.6")
implementation("com.solanamobile:rpc-solana:0.2.6")
implementation("com.solanamobile:rpc-ktordriver:0.2.6")

}
