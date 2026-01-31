plugins {
    kotlin("jvm") version "1.9.25"
}

group = "com.styx"
version = "0.2.4"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.json:json:20231013")
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}
