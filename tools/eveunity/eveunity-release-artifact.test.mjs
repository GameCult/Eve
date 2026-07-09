import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildUnityReleaseRequest } from "./eveunity-release-contract.mjs";
import { buildUnityReleaseArtifactPlan } from "./eveunity-release-artifact.mjs";

const capabilityManifest = JSON.parse(readFileSync(new URL("../../packages/org.gamecult.eve.unity-uitoolkit/eve-runtime-capability.json", import.meta.url), "utf8"));
const packageManifest = JSON.parse(readFileSync(new URL("../../packages/org.gamecult.eve.unity-uitoolkit/package.json", import.meta.url), "utf8"));

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
