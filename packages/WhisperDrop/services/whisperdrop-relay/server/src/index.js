import express from "express";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();

const PORT = parseInt(process.env.PORT || "8787", 10);
const DATA_DIR = process.env.DATA_DIR || "./data";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const MAX_BODY_BYTES = parseInt(process.env.MAX_BODY_BYTES || "262144", 10);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
ensureDir(DATA_DIR);
ensureDir(path.join(DATA_DIR, "envelopes"));
ensureDir(path.join(DATA_DIR, "acks"));

app.use(cors({ origin: CORS_ORIGIN }));
app.use(morgan("tiny"));
app.use(express.json({ limit: MAX_BODY_BYTES }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "whisperdrop-relay", ts: new Date().toISOString() }));

function fileSafeKey(s) { return s.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 200); }
function envelopeFile(recipientPubB64Url) { return path.join(DATA_DIR, "envelopes", fileSafeKey(recipientPubB64Url) + ".jsonl"); }
function ackFile(recipientPubB64Url) { return path.join(DATA_DIR, "acks", fileSafeKey(recipientPubB64Url) + ".json"); }

function loadAcks(recipientPubB64Url) {
  const p = ackFile(recipientPubB64Url);
  try { return new Set((JSON.parse(fs.readFileSync(p, "utf8")).acked) || []); } catch { return new Set(); }
}
function saveAcks(recipientPubB64Url, set) {
  const p = ackFile(recipientPubB64Url);
  fs.writeFileSync(p, JSON.stringify({ acked: Array.from(set) }, null, 2) + "\n");
}
function newId() { return crypto.randomBytes(16).toString("hex"); }

app.post("/v1/envelopes", (req, res) => {
  const { recipientPubB64Url, envelopeJson } = req.body || {};
  if (!recipientPubB64Url || typeof recipientPubB64Url !== "string") return res.status(400).json({ error: "recipientPubB64Url required" });
  if (!envelopeJson || typeof envelopeJson !== "string") return res.status(400).json({ error: "envelopeJson required" });
  const id = newId();
  const createdAt = new Date().toISOString();
  const record = { id, createdAt, envelopeJson };
  const file = envelopeFile(recipientPubB64Url);
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, JSON.stringify(record) + "\n", "utf8");
  res.json({ ok: true, id });
});

app.get("/v1/envelopes", (req, res) => {
  const recipientPubB64Url = req.query.recipientPubB64Url;
  const after = parseInt(req.query.after || "0", 10);
  const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
  if (!recipientPubB64Url || typeof recipientPubB64Url !== "string") return res.status(400).json({ error: "recipientPubB64Url required" });

  const file = envelopeFile(recipientPubB64Url);
  if (!fs.existsSync(file)) return res.json({ ok: true, items: [], nextAfter: after });

  const acks = loadAcks(recipientPubB64Url);
  const raw = fs.readFileSync(file, "utf8").trim();
  if (!raw) return res.json({ ok: true, items: [], nextAfter: after });

  const lines = raw.split(/\n/);
  const items = [];
  let cursor = after;
  for (let i = after; i < lines.length && items.length < limit; i++) {
    const line = lines[i];
    if (!line) { cursor = i + 1; continue; }
    try {
      const rec = JSON.parse(line);
      cursor = i + 1;
      if (!acks.has(rec.id)) items.push({ ...rec, cursor });
    } catch { cursor = i + 1; }
  }
  res.json({ ok: true, items, nextAfter: cursor });
});

app.post("/v1/envelopes/ack", (req, res) => {
  const { recipientPubB64Url, ids } = req.body || {};
  if (!recipientPubB64Url || typeof recipientPubB64Url !== "string") return res.status(400).json({ error: "recipientPubB64Url required" });
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) return res.status(400).json({ error: "ids must be string array" });

  const acks = loadAcks(recipientPubB64Url);
  let n = 0;
  for (const id of ids) { if (!acks.has(id)) { acks.add(id); n++; } }
  saveAcks(recipientPubB64Url, acks);
  res.json({ ok: true, acked: n });
});

app.listen(PORT, () => console.log(`whisperdrop-relay listening on :${PORT}`));
