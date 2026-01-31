use std::fs;
use serde::Deserialize;

use styx_envelope::{b64url_decode, b64url_encode, decode, encode, Algo, Env, Kind};

#[derive(Debug, Deserialize)]
struct Vector {
    name: String,
    env: EnvJson,
    encoded_b64url: String,
    memo: String,
}

#[derive(Debug, Deserialize)]
struct EnvJson {
    v: u8,
    kind: String,
    algo: String,
    id: String,
   #[serde(default)]
    toHash: Option<String>,
   #[serde(default)]
    from: Option<String>,
   #[serde(default)]
    nonce: Option<String>,
    body: String,
   #[serde(default)]
    aad: Option<String>,
   #[serde(default)]
    sig: Option<String>,
}

fn kind_from_str(s: &str) -> Kind {
    match s {
        "message" => Kind::Message,
        "reveal" => Kind::Reveal,
        "keybundle" => Kind::Keybundle,
        _ => panic!("unknown kind {s}"),
    }
}

fn algo_from_str(s: &str) -> Algo {
    match s {
        "pmf1" => Algo::Pmf1,
        _ => panic!("unknown algo {s}"),
    }
}

fn decode32(s: &str) -> [u8; 32] {
    let v = b64url_decode(s).expect("b64url");
    assert_eq!(v.len(), 32, "expected 32 bytes");
    let mut out = [0u8; 32];
    out.copy_from_slice(&v);
    out
}

#[test]
fn vectors_match_spec() {
    let text = fs::read_to_string("tests/styx-envelope-v1.json").expect("read vectors");
    let vectors: Vec<Vector> = serde_json::from_str(&text).expect("parse json");

    for v in vectors {
        let envj = &v.env;
        let env = Env {
            v: envj.v,
            kind: kind_from_str(&envj.kind),
            algo: algo_from_str(&envj.algo),
            id: decode32(&envj.id),
            to_hash: envj.toHash.as_deref().filter(|s| !s.is_empty()).map(decode32),
            from: envj.from.as_deref().filter(|s| !s.is_empty()).map(decode32),
            nonce: envj.nonce.as_deref().filter(|s| !s.is_empty()).map(|s| b64url_decode(s).unwrap()),
            body: b64url_decode(&envj.body).unwrap(),
            aad: envj.aad.as_deref().filter(|s| !s.is_empty()).map(|s| b64url_decode(s).unwrap()),
            sig: envj.sig.as_deref().filter(|s| !s.is_empty()).map(|s| b64url_decode(s).unwrap()),
        };

        let encoded = encode(&env).expect("encode");
        let enc_b64 = b64url_encode(&encoded);
        assert_eq!(enc_b64, v.encoded_b64url, "{}: encoded mismatch", v.name);
        assert_eq!(format!("styx1:{}", v.encoded_b64url), v.memo, "{}: memo mismatch", v.name);

        let decoded = decode(&encoded).expect("decode");
        assert_eq!(decoded.v, 1, "{}: version", v.name);
        assert_eq!(decoded.kind, env.kind, "{}: kind", v.name);
        assert_eq!(decoded.algo, env.algo, "{}: algo", v.name);
        assert_eq!(decoded.id, env.id, "{}: id", v.name);
        assert_eq!(decoded.body, env.body, "{}: body", v.name);
    }
}
