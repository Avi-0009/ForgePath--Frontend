import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const app = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const main = readFileSync(
  new URL("../src/main.tsx", import.meta.url),
  "utf8",
);
const boundary = readFileSync(
  new URL(
    "../src/components/errors/AppErrorBoundary.tsx",
    import.meta.url,
  ),
  "utf8",
);
const notFound = readFileSync(
  new URL("../src/pages/NotFoundPage.tsx", import.meta.url),
  "utf8",
);

test("authenticated unknown routes render a useful fallback page", () => {
  assert.match(app, /path="\*" element=\{<NotFoundPage \/>\}/);
  assert.match(notFound, /Page not found/);
  assert.match(notFound, /href="\/"/);
});

test("root rendering failures expose recovery actions", () => {
  assert.match(main, /<AppErrorBoundary>/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /role="alert"/);
  assert.match(boundary, /window\.location\.reload\(\)/);
  assert.match(boundary, /href="\/"/);
});
