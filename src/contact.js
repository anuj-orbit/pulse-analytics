import { getPg } from "./db.js";

export const LIMITS = { name: 100, email: 254, company: 100, message: 2000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(body) {
  const src = body && typeof body === "object" ? body : {};
  const errors = {};
  const value = {};
  for (const field of Object.keys(LIMITS)) {
    const raw = src[field];
    if (raw !== undefined && raw !== null && typeof raw !== "string") {
      errors[field] = `${field} must be text`;
      continue;
    }
    value[field] = (raw ?? "").trim();
    if (!value[field] && field !== "company") errors[field] = `${field} is required`;
    else if (value[field].length > LIMITS[field]) {
      errors[field] = `${field} must be at most ${LIMITS[field]} characters`;
    }
  }
  if (!errors.email && !EMAIL_RE.test(value.email)) errors.email = "email is invalid";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value };
}

let schemaReady;

export function ensureSchema(pool = getPg()) {
  if (!pool) return Promise.resolve(false);
  schemaReady ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS contact_submissions (
         id serial PRIMARY KEY,
         name text NOT NULL,
         email text NOT NULL,
         company text,
         message text NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now()
       )`,
    )
    .then(() => true)
    .catch((err) => {
      schemaReady = undefined;
      throw err;
    });
  return schemaReady;
}

/** Default store backed by Postgres; null when DATABASE_URL is unset. */
export function createPgContactStore() {
  const pool = getPg();
  if (!pool) return null;
  return {
    async save({ name, email, company, message }) {
      await ensureSchema(pool);
      await pool.query(
        "INSERT INTO contact_submissions (name, email, company, message) VALUES ($1, $2, $3, $4)",
        [name, email, company || null, message],
      );
    },
  };
}

export function createRateLimiter({ max = 5, windowMs = 60_000 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [ip, entry] of hits) if (entry.reset <= now) hits.delete(ip);
    const key = req.ip ?? "unknown";
    const entry = hits.get(key) ?? { count: 0, reset: now + windowMs };
    entry.count += 1;
    hits.set(key, entry);
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ ok: false, error: "Too many requests, try again soon." });
    }
    next();
  };
}
