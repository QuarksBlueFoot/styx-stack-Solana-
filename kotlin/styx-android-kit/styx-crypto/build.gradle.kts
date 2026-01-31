plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
}

kotlin {
    jvm()

    sourceSets {
        val commonMain by getting {
            dependencies {
                api(project(":styx-core"))
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.1")
            }
        }
        val jvmMain by getting {
            dependencies {
                // JVM uses java.security for SHA-256 and Bouncy Castle for X25519
                implementation("org.bouncycastle:bcprov-jdk18on:1.80")
            }
        }
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.1")
            }
        }
    }
}
