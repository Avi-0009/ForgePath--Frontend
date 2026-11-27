import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");
const dockerignore = await readFile(new URL("../.dockerignore", import.meta.url), "utf8");
const nginx = await readFile(new URL("../nginx.conf", import.meta.url), "utf8");

test("production image uses a locked install and unprivileged web server", () => {
  assert.match(dockerfile, /RUN npm ci/);
  assert.match(dockerfile, /nginxinc\/nginx-unprivileged:/);
  assert.doesNotMatch(dockerfile, /npm install(?:\s|$)/);
});

test("container build context excludes credentials and local artifacts", () => {
  for (const entry of [".env", ".env.*", ".git", "node_modules", "dist"]) {
    assert.match(dockerignore, new RegExp(`^${entry.replace(".", "\\.")}$`, "m"));
  }
});

test("reverse proxy applies security headers and bounded upload settings", () => {
  assert.match(nginx, /client_max_body_size 22m/);
  assert.match(nginx, /X-Content-Type-Options "nosniff" always/);
  assert.match(nginx, /X-Frame-Options "DENY" always/);
  assert.match(nginx, /Content-Security-Policy/);
  assert.match(nginx, /frame-ancestors 'none'/);
});

test("reverse proxy supports SPA navigation and long AI requests", () => {
  assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html/);
  assert.match(nginx, /proxy_pass http:\/\/backend:8000/);
  assert.match(nginx, /proxy_read_timeout 300s/);
  assert.match(nginx, /proxy_send_timeout 300s/);
});
