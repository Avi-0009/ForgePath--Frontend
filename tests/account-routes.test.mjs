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

const {
  ACCOUNT_ROUTES,
  canAccessProtectedRoute,
} = await import("../src/routing/accountRoutes.ts");

test("Profile and Settings keep stable direct-navigation paths", () => {
  assert.deepEqual(ACCOUNT_ROUTES, {
    profile: "/profile",
    settings: "/settings",
  });
});

test("authenticated sessions can access Profile and Settings after refresh", () => {
  const restoredSession = {
    isAuthenticated: true,
    token: "restored-token",
    user: { id: "restored-user" },
  };
  assert.equal(canAccessProtectedRoute(restoredSession), true);
  assert.equal(canAccessProtectedRoute(restoredSession), true);
});

test("incomplete or signed-out sessions cannot access account routes", () => {
  assert.equal(canAccessProtectedRoute({
    isAuthenticated: false,
    token: null,
    user: null,
  }), false);
  assert.equal(canAccessProtectedRoute({
    isAuthenticated: true,
    token: null,
    user: { id: "user" },
  }), false);
  assert.equal(canAccessProtectedRoute({
    isAuthenticated: true,
    token: "token",
    user: null,
  }), false);
});
