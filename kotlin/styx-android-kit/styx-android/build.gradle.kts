plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
    id("com.android.library")
}

android {
    namespace = "com.styx.android"
    compileSdk = 35
    defaultConfig {
        minSdk = 26
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.15"
    }
}

kotlin {
    androidTarget {
        compilations.all {
            kotlinOptions {
                jvmTarget = "17"
            }
        }
    }
    jvm()

    sourceSets {
        val commonMain by getting {
            dependencies {
                api(project(":styx-core"))
                api(project(":styx-crypto"))
                api(project(":styx-messaging"))
                api(project(":styx-privacy"))
                api(project(":styx-sps"))
                api(project(":styx-client"))
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.1")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.0")
            }
        }
        val androidMain by getting {
            dependencies {
                // Jetpack Compose
                implementation("androidx.compose.ui:ui:1.7.6")
                implementation("androidx.compose.foundation:foundation:1.7.6")
                implementation("androidx.compose.material3:material3:1.3.1")
                implementation("androidx.compose.runtime:runtime:1.7.6")
                implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
                implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
                // Security
                implementation("androidx.security:security-crypto:1.1.0-alpha06")
                // Solana Mobile MWA 2.1
                implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.1.0")
                // Serialization (PSIN1 payloads, outbox persistence)
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.0")
            }
        }
        val jvmMain by getting
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }
    }
}
