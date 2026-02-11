plugins {
    kotlin("jvm") version "2.0.21"
}

group = "nexus.styx"
version = "1.2.0"

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.17.2")
    testImplementation("com.fasterxml.jackson.core:jackson-databind:2.17.2")

    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}
