import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { validateContact } from "../src/contact.js";

const valid = { name: " Ada ", email: "ada@example.com", company: "", message: " Hello " };

test("validateContact trims and accepts valid input", () => {
  const r = validateContact(valid);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { name: "Ada", email: "ada@example.com", company: "", message: "Hello" });
});

test("validateContact reports required fields", () => {
  const r = validateContact({ name: "  ", email: "", message: "" });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ["email", "message", "name"]);
});

test("validateContact rejects bad email, long values and non-strings", () => {
  assert.ok(validateContact({ ...valid, email: "nope" }).errors.email);
  assert.ok(validateContact({ ...valid, name: "x".repeat(101) }).errors.name);
  assert.ok(validateContact({ ...valid, company: "x".repeat(101) }).errors.company);
  assert.ok(validateContact({ ...valid, message: "x".repeat(2001) }).errors.message);
  assert.ok(validateContact({ ...valid, email: `${"a".repeat(250)}@b.co` }).errors.email);
  assert.ok(validateContact({ ...valid, name: 5 }).errors.name);
  assert.equal(validateContact(null).ok, false);
});

async function withApp(options, fn) {
  const server = createApp(options).listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/contact`;
    const post = (body) =>
      fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    await fn(post);
  } finally {
    server.close();
  }
}

test("POST /api/contact saves valid submission with 201", async () => {
  const saved = [];
  await withApp({ contactStore: { save: async (v) => saved.push(v) } }, async (post) => {
    const res = await post(valid);
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { ok: true });
  });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, "Ada");
});

test("POST /api/contact returns 400 for invalid input", async () => {
  let calls = 0;
  await withApp({ contactStore: { save: async () => calls++ } }, async (post) => {
    const res = await post({ ...valid, email: "bad" });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.ok(body.errors.email);
  });
  assert.equal(calls, 0);
});

test("POST /api/contact honeypot returns 200 without saving", async () => {
  let calls = 0;
  await withApp({ contactStore: { save: async () => calls++ } }, async (post) => {
    const res = await post({ ...valid, website: "http://spam.example" });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
  assert.equal(calls, 0);
});

test("POST /api/contact returns 503 without a store", async () => {
  await withApp({ contactStore: null }, async (post) => {
    const res = await post(valid);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).ok, false);
  });
});

test("POST /api/contact returns generic 500 when the store throws", async () => {
  const orig = console.error;
  console.error = () => {};
  try {
    await withApp({ contactStore: { save: async () => { throw new Error("secret db detail"); } } }, async (post) => {
      const res = await post(valid);
      assert.equal(res.status, 500);
      const text = await res.text();
      assert.doesNotMatch(text, /secret/);
    });
  } finally {
    console.error = orig;
  }
});

test("POST /api/contact rate limits with 429", async () => {
  await withApp({ contactStore: { save: async () => {} } }, async (post) => {
    for (let i = 0; i < 5; i++) assert.equal((await post(valid)).status, 201);
    const res = await post(valid);
    assert.equal(res.status, 429);
    assert.ok(res.headers.get("retry-after"));
  });
});

test("POST /api/contact rejects oversized bodies with 413", async () => {
  await withApp({ contactStore: { save: async () => {} } }, async (post) => {
    assert.equal((await post({ ...valid, message: "x".repeat(20000) })).status, 413);
  });
});
