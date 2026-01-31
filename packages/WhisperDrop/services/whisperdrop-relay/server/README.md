# WhisperDrop Relay (Step 6)

Minimal relay service for encrypted WhisperDrop envelopes (Railway-friendly).

## Run
```bash
cd services/whisperdrop-relay/server
npm install
cp .env.example .env
npm run dev
```

## API
- `GET /health`
- `POST /v1/envelopes` `{ recipientPubB64Url, envelopeJson }`
- `GET /v1/envelopes?recipientPubB64Url=...&after=0&limit=50`
- `POST /v1/envelopes/ack` `{ recipientPubB64Url, ids: [...] }`
