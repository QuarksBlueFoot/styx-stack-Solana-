package com.styx.whisperdrop.wd

object CommitmentMemo {
  fun format(manifestHashB64Url: String, merkleRootB64Url: String): String {
    require(manifestHashB64Url.isNotBlank()) { "manifestHash is blank" }
    require(merkleRootB64Url.isNotBlank()) { "merkleRoot is blank" }
    return "whisperdrop:commitment:v1:$manifestHashB64Url:$merkleRootB64Url"
  }
}
