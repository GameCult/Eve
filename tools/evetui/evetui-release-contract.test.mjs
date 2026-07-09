import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildTuiReleaseRequest } from "./evetui-release-contract.mjs";

const capabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-tui/eve-runtime-capability.json", import.meta.url), "utf8"));
const packageManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-tui/package.json", import.meta.url), "utf8"));

test("builds EveTui release request from package manifest", () => {
  const request = buildTuiReleaseRequest({
    capabilityManifest,
    packageManifest,
    capabilityManifestPath: "runtimes/incubating/eve-tui/eve-runtime-capability.json",
    packageManifestPath: "runtimes/incubating/eve-tui/package.json",
  });

  assert.equal(request.schema, "gamecult.eve.runtime_release_request.v1");
  assert.equal(request.ownerRepo, "EveTui");
  assert.equal(request.repository, "GameCult/EveTui");
  assert.equal(request.packageName, "eve-tui");
  assert.equal(request.version, "0.1.0");
  assert.equal(request.packageRoot, "runtimes/incubating/eve-tui");
  assert.equal(request.versionSource, "runtimes/incubating/eve-tui/package.json");
  assert.equal(request.tagName, "evetui-v0.1.0");
  assert.equal(request.artifactKind, "terminal-runtime");
  assert.equal(request.artifactPath, "artifacts/evetui-release/0.1.0/eve-tui-0.1.0.tgz");
  assert.equal(request.main, "src/eve-tui-shell.mjs");
});

test("rejects package manifests that do not match the TUI release contract", () => {
  const wrongPackage = { ...packageManifest, name: "eve-wrong" };

  assert.throws(
    () => buildTuiReleaseRequest({ capabilityManifest, packageManifest: wrongPackage }),
    /package name mismatch/,
  );
});
