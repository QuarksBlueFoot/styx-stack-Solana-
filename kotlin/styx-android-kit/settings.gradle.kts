pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolution {
    @Suppress("UnstableApiUsage")
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "styx-android-kit"

include(":styx-core")
include(":styx-crypto")
include(":styx-messaging")
include(":styx-privacy")
include(":styx-sps")
include(":styx-client")
include(":styx-android")
