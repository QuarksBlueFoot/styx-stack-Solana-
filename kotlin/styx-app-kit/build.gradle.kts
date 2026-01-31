plugins {
    id("com.android.library")
    kotlin("android")
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.0"
    id("com.google.dagger.hilt.android") version "2.51" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.1.0"
    id("maven-publish")
    id("signing")
}

android {
    namespace = "nexus.styx.appkit"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
        
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = "17"
    }
    
    buildFeatures {
        compose = true
    }
    
    publishing {
        singleVariant("release") {
            withSourcesJar()
            withJavadocJar()
        }
    }
}

dependencies {
    // Kotlin
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    
    // Compose
    val composeBom = platform("androidx.compose:compose-bom:2024.09.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.runtime:runtime")
    debugImplementation("androidx.compose.ui:ui-tooling")
    
    // Lifecycle & ViewModel
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.1")
    
    // Hilt (optional - for DI)
    compileOnly("com.google.dagger:hilt-android:2.51")
    
    // Crypto
    implementation("org.bouncycastle:bcprov-jdk18on:1.78")
    implementation("cash.z.ecc.android:kotlin-bip39:1.0.8")
    
    // Solana Mobile (use latest stable versions)
    implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.0.3")
    implementation("com.solanamobile:rpc-core:0.2.5")
    implementation("com.solanamobile:web3-solana:0.2.5")
    
    // Security
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("androidx.biometric:biometric:1.2.0-alpha05")
    
    // Network
    implementation("io.ktor:ktor-client-android:2.3.11")
    implementation("io.ktor:ktor-client-content-negotiation:2.3.11")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.11")
    
    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}

afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("release") {
                from(components["release"])
                
                groupId = "nexus.styx"
                artifactId = "styx-app-kit"
                version = project.findProperty("version") as String? ?: "1.0.0"
                
                pom {
                    name.set("Styx App Kit")
                    description.set("Complete privacy SDK for Solana mobile apps - Kotlin/Android")
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
        sign(publishing.publications["release"])
    }
}
