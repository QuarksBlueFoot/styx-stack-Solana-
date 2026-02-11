package nexus.styx.android.secure

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

/**
 * Android Keystore-backed secure storage for Styx secrets.
 *
 * Uses EncryptedSharedPreferences (AES-256-SIV for keys, AES-256-GCM for values)
 * backed by the Android hardware Keystore.
 */
class StyxSecureStorage(context: Context) {

    private val prefs: SharedPreferences by lazy {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            "styx_secure_prefs",
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    /**
     * Store a key securely.
     */
    fun putBytes(key: String, data: ByteArray) {
        prefs.edit().putString(key, data.toHexString()).apply()
    }

    /**
     * Retrieve a key.
     */
    fun getBytes(key: String): ByteArray? {
        return prefs.getString(key, null)?.hexToByteArray()
    }

    /**
     * Store a string securely.
     */
    fun putString(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    /**
     * Retrieve a string.
     */
    fun getString(key: String): String? {
        return prefs.getString(key, null)
    }

    /**
     * Check if a key exists.
     */
    fun contains(key: String): Boolean = prefs.contains(key)

    /**
     * Remove a key.
     */
    fun remove(key: String) {
        prefs.edit().remove(key).apply()
    }

    /**
     * Clear all secure storage.
     */
    fun clear() {
        prefs.edit().clear().apply()
    }

    // ── Storage Keys ────────────────────────────────────────────────────
    companion object Keys {
        const val X25519_SECRET = "styx_x25519_secret"
        const val X25519_PUBLIC = "styx_x25519_public"
        const val ED25519_SECRET = "styx_ed25519_secret"
        const val RATCHET_STATE_PREFIX = "styx_ratchet_"
    }
}

private fun ByteArray.toHexString(): String =
    joinToString("") { b -> (b.toInt() and 0xFF).toString(16).padStart(2, '0') }

private fun String.hexToByteArray(): ByteArray {
    require(length % 2 == 0) { "Hex string must have even length" }
    return ByteArray(length / 2) { i ->
        substring(i * 2, i * 2 + 2).toInt(16).toByte()
    }
}
