import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildElectronReleaseRequest } from "./eveelectron-release-contract.mjs";

const capabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-electron/eve-runtime-capability.json", import.meta.url), "utf8"));
const packageManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-electron/package.json", import.meta.url), "utf8"));

test("builds EveElectron release request from package manifest", () => {
  const request = buildElectronReleaseRequest({
    capabilityManifest,
    packageManifest,
    capabilityManifestPath: "runtimes/incubating/eve-electron/eve-runtime-capability.json",
    packageManifestPath: "runtimes/incubating/eve-electron/package.json",
  });

  assert.equal(request.schema, "gamecult.eve.runtime_release_request.v1");
  assert.equal(request.ownerRepo, "EveElectron");
  assert.equal(request.repository, "GameCult/EveElectron");
  assert.equal(request.packageName, "eve-electron");
  assert.equal(request.version, "0.1.0");
  assert.equal(request.packageRoot, "runtimes/incubating/eve-electron");
  assert.equal(request.versionSource, "runtimes/incubating/eve-electron/package.json");
  assert.equal(request.tagName, "eveelectron-v0.1.0");
  assert.equal(request.artifactKind, "electron-app");
  assert.equal(request.artifactPath, "artifacts/eveelectron-release/0.1.0/eve-electron-0.1.0.zip");
  assert.equal(request.main, "src/eve-electron-shell.mjs");
});

test("rejects package manifests that do not match the Electron release contract", () => {
  const wrongPackage = { ...packageManifest, name: "eve-wrong" };

  assert.throws(
    () => buildElectronReleaseRequest({ capabilityManifest, packageManifest: wrongPackage }),
    /package name mismatch/,
  );
});
