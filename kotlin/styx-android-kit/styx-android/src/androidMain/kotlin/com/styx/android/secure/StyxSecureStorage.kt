package com.styx.android.secure

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Android Keystore-backed secure storage for Styx secrets.
 *
 * Uses EncryptedSharedPreferences (AES-256-SIV for keys, AES-256-GCM for values)
 * backed by the Android hardware Keystore.
 *
 * Follows Solana Foundation Android security guidelines:
 * - Uses MasterKey.Builder (non-deprecated API, replacing MasterKeys)
 * - AES-256-GCM key scheme backed by hardware Keystore
 * - Separate storage namespace per Styx feature (ratchet, keys, outbox)
 */
class StyxSecureStorage(private val context: Context) {

    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    private val prefs: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            context,
            "styx_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    /**
     * Store raw bytes securely (hex-encoded).
     */
    fun putBytes(key: String, data: ByteArray) {
        prefs.edit().putString(key, data.toHexString()).apply()
    }

    /**
     * Retrieve raw bytes.
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
     * Store a long value.
     */
    fun putLong(key: String, value: Long) {
        prefs.edit().putLong(key, value).apply()
    }

    /**
     * Retrieve a long value.
     */
    fun getLong(key: String, default: Long = 0L): Long {
        return prefs.getLong(key, default)
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

    /**
     * Get all keys in storage (useful for ratchet enumeration).
     */
    fun allKeys(): Set<String> = prefs.all.keys

    /**
     * Get all keys matching a prefix (e.g. all ratchet states).
     */
    fun keysWithPrefix(prefix: String): Set<String> =
        prefs.all.keys.filter { it.startsWith(prefix) }.toSet()

    // ── Namespaced Storage ──────────────────────────────────────────────

    /**
     * Create a namespaced view of this storage.
     * All keys will be prefixed with the namespace.
     */
    fun namespace(ns: String): NamespacedStorage = NamespacedStorage(this, ns)

    class NamespacedStorage(
        private val store: StyxSecureStorage,
        private val prefix: String,
    ) {
        fun putBytes(key: String, data: ByteArray) = store.putBytes("${prefix}_$key", data)
        fun getBytes(key: String): ByteArray? = store.getBytes("${prefix}_$key")
        fun putString(key: String, value: String) = store.putString("${prefix}_$key", value)
        fun getString(key: String): String? = store.getString("${prefix}_$key")
        fun contains(key: String): Boolean = store.contains("${prefix}_$key")
        fun remove(key: String) = store.remove("${prefix}_$key")
        fun allKeys(): Set<String> = store.keysWithPrefix("${prefix}_")
    }

    // ── Storage Keys ────────────────────────────────────────────────────
    companion object Keys {
        const val X25519_SECRET = "styx_x25519_secret"
        const val X25519_PUBLIC = "styx_x25519_public"
        const val ED25519_SECRET = "styx_ed25519_secret"
        const val RATCHET_STATE_PREFIX = "styx_ratchet_"
        const val OUTBOX_PREFIX = "styx_outbox_"
        const val AUTH_TOKEN = "styx_auth_token"
        const val WALLET_PUBKEY = "styx_wallet_pubkey"
    }
}
