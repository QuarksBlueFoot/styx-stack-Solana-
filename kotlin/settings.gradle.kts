rootProject.name = "styx-kotlin"

include(":styx-android")
include(":styx-app-kit")
include(":styx-envelope")

project(":styx-android").projectDir = file("styx-android")
project(":styx-app-kit").projectDir = file("styx-app-kit")
project(":styx-envelope").projectDir = file("styx-envelope")
