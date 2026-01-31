plugins {
  id("com.android.library")
  kotlin("android")
  id("maven-publish")
  id("signing")
}

group = "nexus.styx"
version = project.findProperty("version") as String? ?: "1.0.0"

android {
  namespace = "nexus.styx.mobile"
  compileSdk = 35

  defaultConfig {
    minSdk = 24
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions {
    jvmTarget = "17"
    freeCompilerArgs += listOf(
      "-opt-in=kotlin.RequiresOptIn",
      "-Xjvm-default=all"
    )
  }
  
  publishing {
    singleVariant("release") {
      withSourcesJar()
      withJavadocJar()
    }
  }
}

dependencies {
  // This module is intentionally lightweight.
  // Bring your own Artemis + Solana Mobile SDK dependencies in the host app.
}

afterEvaluate {
  publishing {
    publications {
      create<MavenPublication>("release") {
        from(components["release"])
        
        groupId = "nexus.styx"
        artifactId = "styx-android"
        version = project.version.toString()
        
        pom {
          name.set("Styx Android SDK")
          description.set("Styx privacy SDK for Android - Solana Mobile integration")
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
