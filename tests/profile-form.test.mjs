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
  buildProfileUpdatePayload,
  profileDraftHasChanges,
  profileStoreUpdate,
} = await import("../src/pages/profileForm.ts");

test("profile payload normalizes only editable fields", () => {
  assert.deepEqual(
    buildProfileUpdatePayload("  Updated Name  ", "  Updated_User  "),
    { full_name: "Updated Name", username: "updated_user" },
  );
  assert.equal("email" in buildProfileUpdatePayload("Name", "valid_user"), false);
});

test("profile payload rejects an empty full name", () => {
  assert.throws(
    () => buildProfileUpdatePayload("   ", "valid_user"),
    /Full name is required/,
  );
});

test("profile payload rejects invalid usernames", () => {
  for (const username of ["ab", "invalid-name", "spaces fail", "x".repeat(21)]) {
    assert.throws(
      () => buildProfileUpdatePayload("Valid Name", username),
      /Username must use 3-20/,
    );
  }
});

test("profile change detection ignores normalization-only differences", () => {
  const current = { name: "Example User", username: "example_user" };
  assert.equal(
    profileDraftHasChanges(" Example User ", "EXAMPLE_USER", current),
    false,
  );
  assert.equal(
    profileDraftHasChanges("Changed User", "example_user", current),
    true,
  );
});

test("profile response updates only the account that started the request", () => {
  const response = {
    full_name: "Updated Name",
    username: "updated_user",
    email: "fixed@example.test",
    is_email_verified: true,
  };
  assert.equal(profileStoreUpdate("alice", "bob", response), null);
  assert.deepEqual(profileStoreUpdate("alice", "alice", response), {
    name: "Updated Name",
    username: "updated_user",
    email: "fixed@example.test",
    is_email_verified: true,
  });
});
