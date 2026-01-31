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
