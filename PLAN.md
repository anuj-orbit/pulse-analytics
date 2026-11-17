# Pulse Analytics: landing page + contact form

slug: pulse-analytics | db: pulse_analytics (Postgres)

## Goal / audience
Marketing landing page for Pulse, a product analytics startup. Audience: product teams and founders. Primary CTA: contact form.

## Pages / endpoints
- `GET /` static landing page (public/index.html, styles.css, app.js): hero, features, how it works, pricing teaser, contact form, footer
- `POST /api/contact` validates (name, email, company optional, message), stores in Postgres, returns JSON
- `GET /health` (template contract)

## Data model (Postgres)
`contact_submissions(id serial pk, name text, email text, company text, message text, created_at timestamptz default now())`. Table auto-created at startup via `DATABASE_URL`.

## Stack
Node 22 + Express (app-template), `pg`, static HTML/CSS/JS, basic rate limit + input validation, parameterised queries.

## Team
Simple: 1 `lead` leader, 3 `worker`s
- Worker 1: `public/*` (landing page, responsive, form JS)
- Worker 2: `src/` contact API + db module
- Worker 3: tests (validation, API with mocked db)

## Acceptance
- lint + tests pass in CI
- form submit stores a row in Postgres
- invalid input returns 400, no secrets in git
- `/health` OK after deploy

## Estimated cost
About 0.30–0.80 USD (limit 5 USD)
