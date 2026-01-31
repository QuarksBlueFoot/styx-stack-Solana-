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
                api(project(":styx-crypto"))
                api(project(":styx-messaging"))
                api(project(":styx-privacy"))
                api(project(":styx-sps"))
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.1")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.0")
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.1")
            }
        }
        val jvmMain by getting {
            dependencies {
                // Ktor for HTTP client (JVM)
                implementation("io.ktor:ktor-client-core:3.1.1")
                implementation("io.ktor:ktor-client-cio:3.1.1")
                implementation("io.ktor:ktor-client-content-negotiation:3.1.1")
                implementation("io.ktor:ktor-serialization-kotlinx-json:3.1.1")
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
