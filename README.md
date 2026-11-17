# app-template

Starter for apps built by the Orbit AI Dev Team and deployed with Coolify on the Oracle server.

## Contract every app keeps

| Rule | Why |
|---|---|
| Listens on `PORT` (default 3000), host `0.0.0.0` | Coolify/Traefik routes to it |
| `GET /health` returns 200 when healthy | Docker healthcheck and deploy verification |
| Config only from env vars: `DATABASE_URL`, `MONGODB_URI`, ... | Secrets live in Coolify, never in git |
| `Dockerfile` at repo root | Coolify builds it on the ARM server |
| `npm run lint` and `npm test` pass | CI gate before deploy |

## Run locally

```bash
npm ci
npm test
npm start          # http://localhost:3000
```

## CI/CD

`.github/workflows/ci.yml` runs lint and tests, then a Docker build. On `main` it then calls the Coolify deploy API. That last step needs:

- repo **variable** `COOLIFY_APP_UUID`
- repo **secrets** `COOLIFY_API_URL` and `COOLIFY_DEPLOY_TOKEN`

Without them, the deploy step is skipped.

## Pulse (product analytics landing page)

Marketing landing page for Pulse with a contact form. Static page in `public/` (`index.html`, `styles.css`, `app.js`).

- `POST /api/contact` — JSON `{name, email, company?, message}` (limits 100/254/100/2000 chars; hidden `website` honeypot). Returns `201 {ok:true}`, `400 {ok:false,errors}`, `429` (5 requests/min/IP), `503` when `DATABASE_URL` is unset, `500` on DB error.
- Env: `DATABASE_URL` (Postgres; the `contact_submissions` table is created automatically on first submission), `PORT`.
- Submissions are written with parameterised queries only.
