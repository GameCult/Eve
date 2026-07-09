import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildUnityReleaseRequest } from "./eveunity-release-contract.mjs";

const capabilityManifest = JSON.parse(readFileSync(new URL("../../packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json", import.meta.url), "utf8"));
const packageManifest = JSON.parse(readFileSync(new URL("../../packages/org.gamecult.eve.unity-uitoolkit/package.json", import.meta.url), "utf8"));
const sceneCapabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-unity-scene/eve-runtime-capability.json", import.meta.url), "utf8"));
const scenePackageManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-unity-scene/package.json", import.meta.url), "utf8"));

test("builds EveUnity UPM release request from package manifest", () => {
  const request = buildUnityReleaseRequest({
    capabilityManifest,
    packageManifest,
    capabilityManifestPath: "packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json",
    packageManifestPath: "packages/org.gamecult.eve.unity-uitoolkit/package.json",
  });

  assert.equal(request.schema, "gamecult.eve.runtime_release_request.v1");
  assert.equal(request.ownerRepo, "EveUnity");
  assert.equal(request.repository, "GameCult/EveUnity");
  assert.equal(request.packageName, "org.gamecult.eve.unity-uitoolkit");
  assert.equal(request.version, "0.1.0");
  assert.equal(request.packageRoot, "packages/org.gamecult.eve.unity-uitoolkit");
  assert.equal(request.versionSource, "packages/org.gamecult.eve.unity-uitoolkit/package.json");
  assert.equal(request.tagName, "eveunity-uitoolkit-v0.1.0");
  assert.equal(request.artifactKind, "upm-package");
  assert.equal(request.artifactPath, "artifacts/eveunity-uitoolkit-release/0.1.0/org.gamecult.eve.unity-uitoolkit-0.1.0.tgz");
  assert.equal(request.dependencies["org.gamecult.eve.surface"], "0.1.0");
});

test("rejects package manifests that do not match the release contract package", () => {
  const wrongPackage = { ...packageManifest, name: "org.gamecult.eve.wrong" };

  assert.throws(
    () => buildUnityReleaseRequest({ capabilityManifest, packageManifest: wrongPackage }),
    /package name mismatch/,
  );
});

test("builds EveUnity scene UPM release request from package manifest", () => {
  const request = buildUnityReleaseRequest({
    capabilityManifest: sceneCapabilityManifest,
    packageManifest: scenePackageManifest,
    capabilityManifestPath: "runtimes/incubating/eve-unity-scene/eve-runtime-capability.json",
    packageManifestPath: "runtimes/incubating/eve-unity-scene/package.json",
  });

  assert.equal(request.schema, "gamecult.eve.runtime_release_request.v1");
  assert.equal(request.ownerRepo, "EveUnity");
  assert.equal(request.repository, "GameCult/EveUnity");
  assert.equal(request.packageName, "org.gamecult.eve.unity-scene");
  assert.equal(request.version, "0.1.0");
  assert.equal(request.packageRoot, "runtimes/incubating/eve-unity-scene");
  assert.equal(request.versionSource, "runtimes/incubating/eve-unity-scene/package.json");
  assert.equal(request.tagName, "eveunity-scene-v0.1.0");
  assert.equal(request.artifactKind, "upm-package");
  assert.equal(request.artifactPath, "artifacts/eveunity-scene-release/0.1.0/org.gamecult.eve.unity-scene-0.1.0.tgz");
  assert.equal(request.dependencies["org.gamecult.eve.surface"], "0.1.0");
});
