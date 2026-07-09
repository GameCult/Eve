import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EveElectronShell } from "../../runtimes/incubating/eve-electron/src/eve-electron-shell.mjs";
import { buildElectronCaptureRequest, loadJsonFile, writeCaptureRequest } from "./eveelectron-capture-contract.mjs";

export function buildElectronCaptureArtifact({
  advertisement,
  capabilityManifest,
  surfaceDocument,
  advertisementPath = "",
  capabilityManifestPath = "",
  captureSurfaceId = "",
  stamp = "latest",
} = {}) {
  const request = buildElectronCaptureRequest({
    advertisement,
    capabilityManifest,
    advertisementPath,
    capabilityManifestPath,
    captureSurfaceId,
    stamp,
  });
  const shell = new EveElectronShell();
  const projection = shell.lowerSurface(surfaceDocument, advertisement, request.surfaceId);
  validateProjectionArtifact(projection, request);

  return {
    request,
    projection: {
      ...projection,
      runtimeId: request.runtimeId,
      artifactKind: "json-projection",
      captureKind: "electron-shell-projection-json",
      sourceAdvertisementPath: request.sourceAdvertisementPath,
      sourceCapabilityManifestPath: request.sourceCapabilityManifestPath,
      issuedAtUtc: request.issuedAtUtc,
    },
  };
}

export function writeElectronCaptureArtifact({ request, projection }, { outputPath, requestOutputPath = "" } = {}) {
  if (!outputPath) throw new Error("outputPath is required");
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(projection, null, 2)}\n`, "utf8");
  if (requestOutputPath) {
    writeCaptureRequest(request, requestOutputPath);
  }
}

function validateProjectionArtifact(projection, request) {
  if (projection.schema !== "gamecult.eve.electron_shell_projection.v1") {
    throw new Error(`Unexpected Electron projection schema: ${projection.schema || ""}`);
  }
  for (const [field, expected] of [
    ["providerId", request.providerId],
    ["surfaceId", request.surfaceId],
    ["projectionKind", request.projectionKind],
    ["commandBoundary", request.commandBoundary],
    ["receiptSchema", request.receiptSchema],
  ]) {
    if ((projection[field] || "") !== (expected || "")) {
      throw new Error(`Electron projection ${field} expected ${expected || ""} got ${projection[field] || ""}`);
    }
  }
  if (!projection.root || !projection.root.id) {
    throw new Error("Electron projection artifact must contain a root shell node");
  }
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
  for (const required of ["advertisement", "capability", "surface", "output"]) {
    if (!args[required]) {
      throw new Error(`missing required --${required}`);
    }
  }
  const stamp = args.stamp || "latest";
  const artifact = buildElectronCaptureArtifact({
    advertisement: loadJsonFile(args.advertisement),
    capabilityManifest: loadJsonFile(args.capability),
    surfaceDocument: loadJsonFile(args.surface),
    advertisementPath: args.advertisement,
    capabilityManifestPath: args.capability,
    captureSurfaceId: args["surface-id"] || "",
    stamp,
  });
  writeElectronCaptureArtifact(artifact, {
    outputPath: args.output,
    requestOutputPath: args["request-output"] || "",
  });
  process.stdout.write(`${args.output}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath === modulePath) {
  runCli();
}
