/**
 * Styx Android Kit — Kotlin Multiplatform SDK
 *
 * Root build file for the KMP project targeting:
 *   - Android (Jetpack Compose)
 *   - JVM (server-side / desktop)
 *   - iOS (via Kotlin/Native — future)
 *
 * Modern 2026 architecture:
 *   - Kotlin 2.1.x with K2 compiler
 *   - Coroutines 1.10.x with structured concurrency
 *   - Ktor 3.1.x for HTTP
 *   - kotlinx-datetime, kotlinx-serialization
 *   - CryptoKit via expect/actual pattern
 */

plugins {
    kotlin("multiplatform") version "2.1.0" apply false
    kotlin("plugin.serialization") version "2.1.0" apply false
    id("com.android.library") version "8.7.3" apply false
    id("maven-publish") apply false
    id("signing") apply false
}

allprojects {
    group = "nexus.styx"
    version = "1.3.0"
}

subprojects {
    tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
        compilerOptions {
            freeCompilerArgs.addAll(
                "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi",
                "-opt-in=kotlin.ExperimentalUnsignedTypes",
            )
        }
    }

    // Apply maven-publish to all KMP library modules
    afterEvaluate {
        if (plugins.hasPlugin("org.jetbrains.kotlin.multiplatform")) {
            apply(plugin = "maven-publish")
            apply(plugin = "signing")

            configure<PublishingExtension> {
                publications.withType<MavenPublication>().configureEach {
                    pom {
                        name.set("Styx ${project.name}")
                        description.set("Styx Privacy Standard SDK \u2014 ${project.name}")
                        url.set("https://github.com/QuarksBlueFoot/StyxStack")
                        licenses {
                            license {
                                name.set("Apache License 2.0")
                                url.set("https://www.apache.org/licenses/LICENSE-2.0")
                            }
                        }
                        developers {
                            developer {
                                id.set("moonmanquark")
                                name.set("Bluefoot Labs")
                            }
                        }
                        scm {
                            url.set("https://github.com/QuarksBlueFoot/StyxStack")
                            connection.set("scm:git:git://github.com/QuarksBlueFoot/StyxStack.git")
                        }
                    }
                }

                repositories {
                    maven {
                        name = "LocalStaging"
                        url = uri(project.findProperty("localStagingDir") as String?
                            ?: layout.buildDirectory.dir("staging-deploy").get().asFile.toURI())
                    }
                    maven {
                        name = "GitHubPackages"
                        url = uri("https://maven.pkg.github.com/QuarksBlueFoot/styx-stack-Solana-")
                        credentials {
                            username = project.findProperty("gpr.user") as String?
                                ?: System.getenv("GITHUB_ACTOR")
                            password = project.findProperty("gpr.key") as String?
                                ?: System.getenv("GITHUB_TOKEN")
                        }
                    }
                }
            }

            configure<SigningExtension> {
                isRequired = gradle.taskGraph.hasTask("publish")
                sign(the<PublishingExtension>().publications)
            }
        }
    }
}
