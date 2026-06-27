# URL Shortener Sample App

Node 20 + TypeScript + Express REST API used as the demo system under test. This is the **before** state: no rate limiting is implemented yet.

## API

- `GET /healthz` → `200 { "status": "ok" }`
- `POST /shorten` with `{ "url": "https://example.com" }` → `201 { "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }`
- `GET /:code` for a known code → `302` redirect to the original URL and increments `hits`
- `GET /:code` for an unknown code → `404 { "error": string }`
- `GET /api/links` → `200` array of `{ "code": string, "url": string, "hits": number }`

## Configuration

- `PORT` defaults to `3000`
- `BASE_URL` defaults to `http://localhost:3000`

## Rate limiting

This section is intentionally reserved for a later demo unit. The current app does not include rate limiting.

## Run locally

```powershell
npm install
npm run build
npm start
```

## Verify

```powershell
npm run lint
npm run build
npm test
```
