//! Styx Envelope v1 (Rust)
//!
//! Canonical binary format matches @styx/memo encodeStyxEnvelope.

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;

pub const STYX_MAGIC: [u8; 4] = [0x53, 0x54, 0x59, 0x58]; // "STYX"
pub const STYX_V1: u8 = 1;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Kind {
    Message,
    Reveal,
    Keybundle,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Algo {
    Pmf1,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Env {
    pub v: u8,
    pub kind: Kind,
    pub algo: Algo,
    pub id: [u8; 32],
    pub to_hash: Option<[u8; 32]>,
    pub from: Option<[u8; 32]>,
    pub nonce: Option<Vec<u8>>,
    pub body: Vec<u8>,
    pub aad: Option<Vec<u8>>,
    pub sig: Option<Vec<u8>>,
}

const F_TOHASH: u16 = 1 << 0;
const F_FROM: u16 = 1 << 1;
const F_NONCE: u16 = 1 << 2;
const F_AAD: u16 = 1 << 3;
const F_SIG: u16 = 1 << 4;

fn kind_code(k: &Kind) -> u8 {
    match k {
        Kind::Message => 1,
        Kind::Reveal => 2,
        Kind::Keybundle => 3,
    }
}

fn kind_from_code(c: u8) -> Option<Kind> {
    match c {
        1 => Some(Kind::Message),
        2 => Some(Kind::Reveal),
        3 => Some(Kind::Keybundle),
        _ => None,
    }
}

fn algo_code(a: &Algo) -> u8 {
    match a {
        Algo::Pmf1 => 1,
    }
}

fn algo_from_code(c: u8) -> Option<Algo> {
    match c {
        1 => Some(Algo::Pmf1),
        _ => None,
    }
}

fn u16le(n: u16) -> [u8; 2] {
    [(n & 0xff) as u8, (n >> 8) as u8]
}

fn read_u16le(buf: &[u8], o: usize) -> u16 {
    (buf[o] as u16) | ((buf[o + 1] as u16) << 8)
}

fn uleb128_encode(mut n: usize) -> Vec<u8> {
    let mut out = Vec::new();
    loop {
        let b = (n & 0x7f) as u8;
        n >>= 7;
        if n != 0 {
            out.push(b | 0x80);
        } else {
            out.push(b);
            break;
        }
    }
    out
}

fn uleb128_decode(buf: &[u8], mut o: usize) -> Result<(usize, usize), String> {
    let mut result: usize = 0;
    let mut shift: usize = 0;
    let start = o;
    loop {
        if o >= buf.len() {
            return Err("varint overflow".into());
        }
        let b = buf[o];
        o += 1;
        result |= ((b & 0x7f) as usize) << shift;
        if (b & 0x80) == 0 {
            break;
        }
        shift += 7;
        if shift > 28 {
            return Err("varint too large".into());
        }
    }
    Ok((result, o - start))
}

fn var_bytes_encode(v: &[u8]) -> Vec<u8> {
    let mut out = uleb128_encode(v.len());
    out.extend_from_slice(v);
    out
}

fn var_bytes_decode(buf: &[u8], o: usize) -> Result<(Vec<u8>, usize), String> {
    let (len, read) = uleb128_decode(buf, o)?;
    let start = o + read;
    let end = start + len;
    if end > buf.len() {
        return Err("varBytes out of range".into());
    }
    Ok((buf[start..end].to_vec(), read + len))
}

pub fn encode(env: &Env) -> Result<Vec<u8>, String> {
    if env.v != 1 {
        return Err("encode: only v=1 supported".into());
    }

    let mut flags: u16 = 0;
    if env.to_hash.is_some() {
        flags |= F_TOHASH;
    }
    if env.from.is_some() {
        flags |= F_FROM;
    }
    if env.nonce.is_some() {
        flags |= F_NONCE;
    }
    if env.aad.is_some() {
        flags |= F_AAD;
    }
    if env.sig.is_some() {
        flags |= F_SIG;
    }

    let mut out = Vec::new();
    out.extend_from_slice(&STYX_MAGIC);
    out.push(STYX_V1);
    out.push(kind_code(&env.kind));
    out.extend_from_slice(&u16le(flags));
    out.push(algo_code(&env.algo));
    out.extend_from_slice(&env.id);

    if let Some(th) = &env.to_hash {
        out.extend_from_slice(th);
    }
    if let Some(fr) = &env.from {
        out.extend_from_slice(fr);
    }
    if let Some(nonce) = &env.nonce {
        out.extend_from_slice(&var_bytes_encode(nonce));
    }
    out.extend_from_slice(&var_bytes_encode(&env.body));
    if let Some(aad) = &env.aad {
        out.extend_from_slice(&var_bytes_encode(aad));
    }
    if let Some(sig) = &env.sig {
        out.extend_from_slice(&var_bytes_encode(sig));
    }

    Ok(out)
}

pub fn decode(buf: &[u8]) -> Result<Env, String> {
    let min_len = 4 + 1 + 1 + 2 + 1 + 32;
    if buf.len() < min_len {
        return Err("decode: too short".into());
    }
    if buf[0..4] != STYX_MAGIC {
        return Err("decode: bad magic".into());
    }
    let v = buf[4];
    if v != 1 {
        return Err(format!("decode: unsupported version {}", v));
    }
    let kind = kind_from_code(buf[5]).ok_or("decode: unknown kind")?;
    let flags = read_u16le(buf, 6);
    let algo = algo_from_code(buf[8]).ok_or("decode: unknown algo")?;
    let mut o = 9;

    let mut id = [0u8; 32];
    id.copy_from_slice(&buf[o..o + 32]);
    o += 32;

    let mut to_hash: Option<[u8; 32]> = None;
    let mut from: Option<[u8; 32]> = None;
    let mut nonce: Option<Vec<u8>> = None;
    let mut aad: Option<Vec<u8>> = None;
    let mut sig: Option<Vec<u8>> = None;

    if (flags & F_TOHASH) != 0 {
        let mut th = [0u8; 32];
        th.copy_from_slice(&buf[o..o + 32]);
        o += 32;
        to_hash = Some(th);
    }
    if (flags & F_FROM) != 0 {
        let mut fr = [0u8; 32];
        fr.copy_from_slice(&buf[o..o + 32]);
        o += 32;
        from = Some(fr);
    }
    if (flags & F_NONCE) != 0 {
        let (v, read) = var_bytes_decode(buf, o)?;
        nonce = Some(v);
        o += read;
    }

    let (body, read_body) = var_bytes_decode(buf, o)?;
    o += read_body;

    if (flags & F_AAD) != 0 {
        let (v, read) = var_bytes_decode(buf, o)?;
        aad = Some(v);
        o += read;
    }
    if (flags & F_SIG) != 0 {
        let (v, read) = var_bytes_decode(buf, o)?;
        sig = Some(v);
        o += read;
    }

    if o != buf.len() {
        return Err("decode: trailing bytes".into());
    }

    Ok(Env {
        v,
        kind,
        algo,
        id,
        to_hash,
        from,
        nonce,
        body,
        aad,
        sig,
    })
}

pub fn b64url_encode(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

pub fn b64url_decode(s: &str) -> Result<Vec<u8>, String> {
    URL_SAFE_NO_PAD.decode(s.as_bytes()).map_err(|e| format!("b64url decode: {}", e))
}
