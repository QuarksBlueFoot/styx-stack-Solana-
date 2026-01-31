package com.styx.whisperdrop.wd

object ManifestHasher {
  fun computeCanonicalAndHash(manifestJson: String): Pair<String, String> {
    val canonical = CanonicalJson.canonicalize(manifestJson)
    val hash = Base64Url.encode(Sha256.hashUtf8(canonical))
    return canonical to hash
  }
}
