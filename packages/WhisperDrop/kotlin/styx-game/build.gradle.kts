plugins { kotlin("jvm") version "1.9.22" }
repositories { mavenCentral() }
dependencies {
  testImplementation(kotlin("test"))
  testImplementation("com.fasterxml.jackson.core:jackson-databind:2.17.1")
}
kotlin { jvmToolchain(17) }
