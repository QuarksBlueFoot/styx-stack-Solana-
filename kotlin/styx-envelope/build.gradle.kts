plugins {
    kotlin("multiplatform")
    id("maven-publish")
    id("signing")
}

group = "nexus.styx"
version = "0.2.4"

repositories {
    mavenCentral()
    google()
}

kotlin {
    jvm {
        compilations.all {
            kotlinOptions.jvmTarget = "17"
        }
    }
    
    androidNativeArm64()
    androidNativeX64()
    iosArm64()
    iosX64()
    iosSimulatorArm64()
    
    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
            }
        }
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }
    }
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            groupId = "nexus.styx"
            artifactId = "styx-envelope"
            version = project.findProperty("version") as String? ?: "1.0.0"
            
            pom {
                name.set("Styx Envelope")
                description.set("Privacy-preserving envelope protocol for Solana")
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
    }
    
    repositories {
        maven {
            name = "LocalStaging"
            url = uri(project.findProperty("localStagingDir") as String? ?: layout.buildDirectory.dir("staging-deploy").get().asFile.toURI())
        }
        maven {
            name = "GitHubPackages"
            url = uri("https://maven.pkg.github.com/QuarksBlueFoot/styx-stack-Solana-")
            credentials {
                username = project.findProperty("gpr.user") as String? ?: System.getenv("GITHUB_ACTOR")
                password = project.findProperty("gpr.key") as String? ?: System.getenv("GITHUB_TOKEN")
            }
        }
    }
}

signing {
    isRequired = gradle.taskGraph.hasTask("publish")
    sign(publishing.publications["maven"])
}
