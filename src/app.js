import express from "express";
import { fileURLToPath } from "node:url";
import { dbStatus } from "./db.js";
import { createPgContactStore, createRateLimiter, validateContact } from "./contact.js";

export function createApp({ contactStore, rateLimit } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "10kb" }));
  app.use(express.static(fileURLToPath(new URL("../public", import.meta.url))));

  app.get("/health", async (_req, res) => {
    const db = await dbStatus();
    const healthy = !Object.values(db).includes("error");
    res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "degraded", ...db });
  });

  app.post("/api/contact", createRateLimiter(rateLimit), async (req, res) => {
    if (typeof req.body?.website === "string" && req.body.website.trim() !== "") {
      return res.json({ ok: true });
    }
    const result = validateContact(req.body);
    if (!result.ok) return res.status(400).json({ ok: false, errors: result.errors });
    const store = contactStore === undefined ? createPgContactStore() : contactStore;
    if (!store) {
      return res.status(503).json({ ok: false, error: "Contact form is temporarily unavailable." });
    }
    try {
      await store.save(result.value);
      return res.status(201).json({ ok: true });
    } catch (err) {
      console.error("contact save failed:", err);
      return res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
    }
  });

  app.use((err, _req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    res.status(status).json({ ok: false, error: status === 500 ? "Server error." : "Invalid request." });
  });

  return app;
}
