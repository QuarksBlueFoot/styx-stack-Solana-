# Styx App Kit ProGuard Rules

# Keep Styx classes
-keep class com.styx.appkit.** { *; }

# Keep serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep @Serializable classes
-keep,includedescriptorclasses class com.styx.appkit.**$$serializer { *; }
-keepclassmembers class com.styx.appkit.** {
    *** Companion;
}
-keepclasseswithmembers class com.styx.appkit.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Solana Mobile
-keep class com.solana.mobilewalletadapter.** { *; }

# BouncyCastle
-keep class org.bouncycastle.** { *; }
-dontwarn org.bouncycastle.**

# Ktor
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**
