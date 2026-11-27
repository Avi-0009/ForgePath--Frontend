import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url).href;
registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith(sourceRoot) && url.endsWith(".ts")) {
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      };
    }
    return nextLoad(url, context);
  },
});

const { createSessionRequestCoordinator } = await import(
  "../src/Api/SessionRequestCoordinator.ts"
);

class UnauthorizedError extends Error {}

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
};

const createHarness = (refresh) => {
  let session = { userId: "account-a", token: "token-a" };
  let clearCount = 0;

  const coordinator = createSessionRequestCoordinator({
    getSession: () => session,
    refresh,
    applyRefresh: (result) => {
      session = {
        userId: result.userId,
        token: result.accessToken,
      };
    },
    clearSession: () => {
      clearCount += 1;
      session = { userId: null, token: null };
    },
    isUnauthorized: (error) => error instanceof UnauthorizedError,
  });

  return {
    coordinator,
    getSession: () => session,
    setSession: (next) => { session = next; },
    getClearCount: () => clearCount,
  };
};

test("a stale failed refresh cannot log out a newly signed-in account", async () => {
  const refresh = deferred();
  const harness = createHarness(() => refresh.promise);
  const request = harness.coordinator.requestWithTokenRefresh(
    "token-a",
    async () => { throw new UnauthorizedError(); },
  );

  await Promise.resolve();
  harness.setSession({ userId: "account-b", token: "token-b" });
  refresh.reject(new UnauthorizedError());

  await assert.rejects(request, UnauthorizedError);
  assert.equal(harness.getClearCount(), 0);
  assert.deepEqual(harness.getSession(), {
    userId: "account-b",
    token: "token-b",
  });
});

test("a stale request cannot retry with another account's token", async () => {
  const firstAttempt = deferred();
  const tokens = [];
  const harness = createHarness(async () => ({
    userId: "account-a",
    accessToken: "refreshed-a",
  }));
  const request = harness.coordinator.requestWithTokenRefresh(
    "token-a",
    async (token) => {
      tokens.push(token);
      if (tokens.length === 1) return firstAttempt.promise;
      return "unexpected retry";
    },
  );

  harness.setSession({ userId: "account-b", token: "token-b" });
  firstAttempt.reject(new UnauthorizedError());

  await assert.rejects(request, /account changed/i);
  assert.deepEqual(tokens, ["token-a"]);
});

test("concurrent requests from one session share one token refresh", async () => {
  const refresh = deferred();
  let refreshCount = 0;
  const harness = createHarness(() => {
    refreshCount += 1;
    return refresh.promise;
  });
  const attempts = new Map();
  const operation = async (name, token) => {
    attempts.set(name, [...(attempts.get(name) ?? []), token]);
    if (token === "token-a") throw new UnauthorizedError();
    return `${name}:${token}`;
  };

  const first = harness.coordinator.requestWithTokenRefresh(
    "token-a",
    (token) => operation("first", token),
  );
  const second = harness.coordinator.requestWithTokenRefresh(
    "token-a",
    (token) => operation("second", token),
  );

  await Promise.resolve();
  refresh.resolve({
    userId: "account-a",
    accessToken: "refreshed-a",
  });

  assert.deepEqual(await Promise.all([first, second]), [
    "first:refreshed-a",
    "second:refreshed-a",
  ]);
  assert.equal(refreshCount, 1);
});
