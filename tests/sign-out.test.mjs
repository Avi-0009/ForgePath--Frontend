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

const { revokeAndClearSession } = await import("../src/services/signOut.ts");

test("sign-out revokes the refresh session before clearing local state", async () => {
  const events = [];
  await revokeAndClearSession(
    async () => { events.push("revoked"); },
    () => { events.push("cleared"); },
  );
  assert.deepEqual(events, ["revoked", "cleared"]);
});

test("sign-out still clears local state when server revocation fails", async () => {
  let cleared = false;
  await assert.rejects(
    revokeAndClearSession(
      async () => { throw new Error("offline"); },
      () => { cleared = true; },
    ),
    /server could not confirm refresh-session revocation/,
  );
  assert.equal(cleared, true);
});
