import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

test("generated TypeScript contracts match authoritative Eve schemas", () => {
  const packageRoot = resolve(import.meta.dirname, "..");
  const result = spawnSync(process.execPath, ["scripts/generate-contracts.mjs", "--check"], {
    cwd: packageRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
