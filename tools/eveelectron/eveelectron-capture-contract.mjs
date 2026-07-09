import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function buildElectronCaptureRequest({
  advertisement,
  capabilityManifest,
  advertisementPath = "",
  capabilityManifestPath = "",
  captureSurfaceId = "",
  stamp = new Date().toISOString().replace(/[:.]/g, "-"),
} = {}) {
  if (!advertisement || typeof advertisement !== "object") {
    throw new Error("advertisement is required");
  }
  if (!capabilityManifest || typeof capabilityManifest !== "object") {
    throw new Error("capabilityManifest is required");
  }

  const captureContract = capabilityManifest.lifecycle?.capture?.captureContract;
  if (!captureContract) {
    throw new Error("capability manifest is missing lifecycle.capture.captureContract");
  }

  const captureSurface = selectCaptureSurface(captureContract, advertisement.providerId, captureSurfaceId);
  if (!captureSurface) {
    if (captureSurfaceId) {
      throw new Error(
        `capture surface mismatch: expected ${captureSurfaceList(captureContract)} got ${advertisement.providerId || "missing"}:${captureSurfaceId}`,
      );
    }
    throw new Error(
      `capture provider mismatch: expected ${captureProviderList(captureContract)} got ${advertisement.providerId || "missing"}`,
    );
  }

  const targetId = captureContract.targetId || captureContract.runtimeId;
  const surface = (advertisement.surfaces || []).find(candidate => candidate.surfaceId === captureSurface.surfaceId);
  if (!surface) {
    throw new Error(`capture surface not advertised: ${captureSurface.surfaceId}`);
  }

  const loweringTargets = surface.worldInteraction?.loweringTargets || [];
  if (!loweringTargets.includes(targetId)) {
    throw new Error(`surface ${surface.surfaceId} does not advertise lowering target ${targetId}`);
  }

  const artifactPath = replaceStamp(captureContract.artifactPattern, stamp);

  return {
    schema: captureContract.requestSchema || "gamecult.eve.runtime_capture_request.v1",
    runtimeId: capabilityManifest.runtimeId,
    ownerRepo: captureContract.ownerRepo,
    providerId: advertisement.providerId,
    surfaceId: surface.surfaceId,
    surfaceKind: surface.surfaceKind || "",
    targetId,
    projectionKind: surface.worldInteraction?.projectionKind || "",
    commandBoundary: surface.worldInteraction?.commandBoundary || "",
    receiptSchema: surface.worldInteraction?.receiptSchema || "",
    captureKind: captureContract.captureKind,
    artifactKind: captureContract.artifactKind,
    artifactPath,
    conformanceAttachment: captureContract.conformanceAttachment,
    authority: captureContract.authority,
    sourceAdvertisementPath: advertisementPath,
    sourceCapabilityManifestPath: capabilityManifestPath,
    issuedAtUtc: stamp,
  };
}

export function loadJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeCaptureRequest(request, outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(request, null, 2)}\n`, "utf8");
}

function replaceStamp(pattern, stamp) {
  if (!pattern || !pattern.includes("{stamp}")) {
    throw new Error(`capture artifact pattern must include {stamp}: ${pattern || "missing"}`);
  }
  return pattern.replace("{stamp}", stamp);
}

function selectCaptureSurface(captureContract, providerId, surfaceId = "") {
  const claims = captureSurfaceClaims(captureContract).filter(claim => claim.providerId === providerId);
  if (surfaceId) return claims.find(claim => claim.surfaceId === surfaceId) || null;
  return claims[0] || null;
}

function captureProviderList(captureContract) {
  return captureSurfaceClaims(captureContract).map(claim => claim.providerId).filter(Boolean).join(", ") || "missing";
}

function captureSurfaceList(captureContract) {
  return captureSurfaceClaims(captureContract).map(claim => `${claim.providerId}:${claim.surfaceId}`).join(", ") || "missing";
}

function captureSurfaceClaims(captureContract) {
  return [
    {
      providerId: captureContract.requiredProvider || "",
      surfaceId: captureContract.requiredSurface || "",
    },
    ...(Array.isArray(captureContract.additionalProviderSurfaces) ? captureContract.additionalProviderSurfaces : []),
  ]
    .filter(claim => claim && typeof claim === "object")
    .map(claim => ({
      providerId: String(claim.providerId || ""),
      surfaceId: String(claim.surfaceId || ""),
    }))
    .filter(claim => claim.providerId && claim.surfaceId);
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
  for (const required of ["advertisement", "capability", "output"]) {
    if (!args[required]) {
      throw new Error(`missing required --${required}`);
    }
  }

  const stamp = args.stamp || new Date().toISOString().replace(/[:.]/g, "-");
  const request = buildElectronCaptureRequest({
    advertisement: loadJsonFile(args.advertisement),
    capabilityManifest: loadJsonFile(args.capability),
    advertisementPath: args.advertisement,
    capabilityManifestPath: args.capability,
    captureSurfaceId: args["surface-id"] || "",
    stamp,
  });
  writeCaptureRequest(request, args.output);
  process.stdout.write(`${args.output}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath === modulePath) {
  runCli();
}
