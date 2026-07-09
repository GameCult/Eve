import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function buildUnityReleaseRequest({
  capabilityManifest,
  packageManifest,
  capabilityManifestPath = "",
  packageManifestPath = "",
  repository = "GameCult/EveUnity",
} = {}) {
  if (!capabilityManifest || typeof capabilityManifest !== "object") {
    throw new Error("capabilityManifest is required");
  }
  if (!packageManifest || typeof packageManifest !== "object") {
    throw new Error("packageManifest is required");
  }

  const releaseContract = capabilityManifest.lifecycle?.release?.releaseContract;
  if (!releaseContract) {
    throw new Error("capability manifest is missing lifecycle.release.releaseContract");
  }

  if (packageManifest.name !== releaseContract.packageName) {
    throw new Error(`package name mismatch: expected ${releaseContract.packageName} got ${packageManifest.name || "missing"}`);
  }
  if (!packageManifest.version || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(packageManifest.version)) {
    throw new Error(`package version is not a SemVer-compatible release version: ${packageManifest.version || "missing"}`);
  }
  if (packageManifest.dependencies && !packageManifest.dependencies["org.gamecult.eve.surface"]) {
    throw new Error("Unity UI Toolkit package must depend on org.gamecult.eve.surface");
  }

  const tagName = replaceVersion(releaseContract.tagPattern, packageManifest.version);
  const artifactPath = replaceVersion(
    releaseContract.artifactPattern || `artifacts/eveunity-uitoolkit-release/{version}/${releaseContract.packageName}-{version}.tgz`,
    packageManifest.version,
  );

  return {
    schema: releaseContract.requestSchema || "gamecult.eve.runtime_release_request.v1",
    ownerRepo: releaseContract.ownerRepo,
    repository,
    packageName: releaseContract.packageName,
    displayName: packageManifest.displayName || "",
    version: packageManifest.version,
    unity: packageManifest.unity || "",
    packageRoot: releaseContract.packageRoot,
    versionSource: releaseContract.versionSource,
    tagName,
    artifactKind: releaseContract.artifactKind,
    artifactPath,
    publishProof: releaseContract.publishProof,
    sourceCapabilityManifestPath: capabilityManifestPath,
    sourcePackageManifestPath: packageManifestPath,
    dependencies: packageManifest.dependencies || {},
  };
}

export function loadJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeReleaseRequest(request, outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(request, null, 2)}\n`, "utf8");
}

function replaceVersion(pattern, version) {
  if (!pattern || !pattern.includes("{version}")) {
    throw new Error(`release pattern must include {version}: ${pattern || "missing"}`);
  }
  return pattern.replaceAll("{version}", version);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  for (const required of ["capability", "package", "output"]) {
    if (!args[required]) {
      throw new Error(`missing required --${required}`);
    }
  }

  const request = buildUnityReleaseRequest({
    capabilityManifest: loadJsonFile(args.capability),
    packageManifest: loadJsonFile(args.package),
    capabilityManifestPath: args.capability,
    packageManifestPath: args.package,
    repository: args.repository || "GameCult/EveUnity",
  });
  writeReleaseRequest(request, args.output);
  process.stdout.write(`${args.output}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath === modulePath) {
  runCli();
}
