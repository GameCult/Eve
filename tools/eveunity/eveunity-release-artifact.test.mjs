import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildUnityReleaseRequest } from "./eveunity-release-contract.mjs";
import { buildUnityReleaseArtifactPlan } from "./eveunity-release-artifact.mjs";

const capabilityManifest = JSON.parse(readFileSync(new URL("../../packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json", import.meta.url), "utf8"));
const packageManifest = JSON.parse(readFileSync(new URL("../../packages/org.gamecult.eve.unity-uitoolkit/package.json", import.meta.url), "utf8"));
const sceneCapabilityManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-unity-scene/eve-runtime-capability.json", import.meta.url), "utf8"));
const scenePackageManifest = JSON.parse(readFileSync(new URL("../../runtimes/incubating/eve-unity-scene/package.json", import.meta.url), "utf8"));

test("plans npm pack for the EveUnity UI Toolkit UPM artifact", () => {
  const request = buildUnityReleaseRequest({
    capabilityManifest,
    packageManifest,
    capabilityManifestPath: "packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json",
    packageManifestPath: "packages/org.gamecult.eve.unity-uitoolkit/package.json",
  });
  const plan = buildUnityReleaseArtifactPlan({ request, packageManifest });

  assert.equal(plan.packageRoot, "packages/org.gamecult.eve.unity-uitoolkit");
  assert.equal(plan.artifactPath, "artifacts/eveunity-uitoolkit-release/0.1.0/org.gamecult.eve.unity-uitoolkit-0.1.0.tgz");
  assert.equal(plan.artifactDirectory, "artifacts/eveunity-uitoolkit-release/0.1.0");
  assert.equal(plan.expectedFileName, "org.gamecult.eve.unity-uitoolkit-0.1.0.tgz");
  assert.deepEqual(plan.npmPackArguments, [
    "pack",
    "packages/org.gamecult.eve.unity-uitoolkit",
    "--pack-destination",
    "artifacts/eveunity-uitoolkit-release/0.1.0",
  ]);
});

test("plans npm pack for the EveUnity scene UPM artifact", () => {
  const request = buildUnityReleaseRequest({
    capabilityManifest: sceneCapabilityManifest,
    packageManifest: scenePackageManifest,
    capabilityManifestPath: "runtimes/incubating/eve-unity-scene/eve-runtime-capability.json",
    packageManifestPath: "runtimes/incubating/eve-unity-scene/package.json",
  });
  const plan = buildUnityReleaseArtifactPlan({ request, packageManifest: scenePackageManifest });

  assert.equal(plan.packageRoot, "runtimes/incubating/eve-unity-scene");
  assert.equal(plan.artifactPath, "artifacts/eveunity-scene-release/0.1.0/org.gamecult.eve.unity-scene-0.1.0.tgz");
  assert.equal(plan.artifactDirectory, "artifacts/eveunity-scene-release/0.1.0");
  assert.equal(plan.expectedFileName, "org.gamecult.eve.unity-scene-0.1.0.tgz");
  assert.deepEqual(plan.npmPackArguments, [
    "pack",
    "runtimes/incubating/eve-unity-scene",
    "--pack-destination",
    "artifacts/eveunity-scene-release/0.1.0",
  ]);
});

test("rejects release artifact plans for mismatched package identity", () => {
  const request = buildUnityReleaseRequest({ capabilityManifest, packageManifest });

  assert.throws(
    () => buildUnityReleaseArtifactPlan({
      request,
      packageManifest: { ...packageManifest, name: "org.gamecult.eve.wrong" },
    }),
    /package name mismatch/,
  );
});
