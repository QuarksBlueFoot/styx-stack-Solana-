plugins {
  id("com.android.library")
  kotlin("android")
}

android {
  namespace = "com.styx.mobile"
  compileSdk = 34

  defaultConfig {
    minSdk = 24
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
  // This module is intentionally lightweight.
  // Bring your own Artemis + Solana Mobile SDK dependencies in the host app.
}
