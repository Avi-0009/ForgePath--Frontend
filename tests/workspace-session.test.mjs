import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
// Initialize toast's server-safe entry before providing the storage-only window.
import "react-hot-toast";

// Transpile the actual stores in memory with the existing TypeScript dependency.
// Node 24 runs these tests without a browser, generated files, or new packages.
const sourceRoot = new URL("../src/", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(sourceRoot) && specifier.startsWith(".")) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(sourceRoot) && url.endsWith(".ts")) {
      return {
        format: "module", shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      };
    }
    return nextLoad(url, context);
  },
});

function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: memoryStorage(), configurable: true });
Object.defineProperty(globalThis, "window", {
  value: { localStorage: globalThis.localStorage }, configurable: true,
});
sessionStorage.setItem("forgepath-workspace", JSON.stringify({ state: { patchResult: { proposed_code: "old private source" } }, version: 0 }));

const { useAuthStore } = await import("../src/store/useAuthStore.ts");
const { useWorkspaceStore, createWorkspaceRequestGuard } = await import("../src/store/useWorkspaceStore.ts");
const alice = { id: "alice", name: "Alice", username: "alice", email: "alice@example.test" };
const bob = { ...alice, id: "bob", username: "bob" };
const privateState = {
  treeData: { name: "private-project" }, selectedFile: { name: "private.py" },
  reviewResult: { reviewed_code: "private source" },
  patchResult: { proposed_code: "private patch" }, selectedFinding: { title: "private finding" },
};
function assertEmpty() {
  for (const key of Object.keys(privateState)) assert.equal(useWorkspaceStore.getState()[key], null, key);
}
beforeEach(() => useAuthStore.getState().logout());

test("legacy browser cache is discarded without hydrating private results", () => {
  assert.equal(sessionStorage.getItem("forgepath-workspace"), null);
  assertEmpty();
});

test("logout clears every workspace field and does not persist source", () => {
  useAuthStore.getState().login(alice, "token-a");
  useWorkspaceStore.setState(privateState);
  useAuthStore.getState().logout();
  assertEmpty();
  assert.equal(sessionStorage.getItem("forgepath-workspace"), null);
  assert.equal(JSON.parse(localStorage.getItem("forgepath-auth")).state.user, null);
});

test("direct account switch clears private data and invalidates old requests", () => {
  useAuthStore.getState().login(alice, "token-a");
  useWorkspaceStore.setState(privateState);
  const isCurrent = createWorkspaceRequestGuard();
  useAuthStore.getState().login(bob, "token-b");
  assertEmpty();
  assert.equal(isCurrent(), false);
});

test("same-account token refresh preserves workspace and outstanding requests", () => {
  useAuthStore.getState().login(alice, "token-a");
  useWorkspaceStore.setState(privateState);
  const isCurrent = createWorkspaceRequestGuard();
  useAuthStore.getState().login(alice, "refreshed-token");
  assert.equal(useWorkspaceStore.getState().patchResult, privateState.patchResult);
  assert.equal(isCurrent(), true);
});

test("late results cannot restore data after logout and same-account login", async () => {
  useAuthStore.getState().login(alice, "token-a");
  const isCurrent = createWorkspaceRequestGuard();
  let finish;
  const response = new Promise((resolve) => { finish = resolve; });
  const pending = response.then((patch) => {
    if (isCurrent()) useWorkspaceStore.getState().setPatchResult(patch);
  });
  useAuthStore.getState().logout();
  useAuthStore.getState().login(alice, "new-session");
  finish(privateState.patchResult);
  await pending;
  assertEmpty();
});
