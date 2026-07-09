import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EveTuiShell } from "../../runtimes/incubating/eve-tui/src/eve-tui-shell.mjs";
import { buildTuiCaptureRequest, loadJsonFile, writeCaptureRequest } from "./evetui-capture-contract.mjs";

export function buildTuiCaptureArtifact({
  advertisement,
  capabilityManifest,
  surfaceDocument,
  advertisementPath = "",
  capabilityManifestPath = "",
  captureSurfaceId = "",
  stamp = "latest",
  width = 80,
} = {}) {
  const request = buildTuiCaptureRequest({
    advertisement,
    capabilityManifest,
    advertisementPath,
    capabilityManifestPath,
    captureSurfaceId,
    stamp,
  });
  const shell = new EveTuiShell({ width });
  const grid = shell.lowerSurface(surfaceDocument, advertisement, request.surfaceId);
  validateGridArtifact(grid, request);

  return {
    request,
    grid: {
      ...grid,
      artifactKind: request.artifactKind,
      captureKind: request.captureKind,
      sourceAdvertisementPath: request.sourceAdvertisementPath,
      sourceCapabilityManifestPath: request.sourceCapabilityManifestPath,
      issuedAtUtc: request.issuedAtUtc,
    },
  };
}

export function writeTuiCaptureArtifact({ request, grid }, { outputPath, requestOutputPath = "" } = {}) {
  if (!outputPath) throw new Error("outputPath is required");
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(grid, null, 2)}\n`, "utf8");
  if (requestOutputPath) {
    writeCaptureRequest(request, requestOutputPath);
  }
}

function validateGridArtifact(grid, request) {
  if (grid.schema !== "gamecult.eve.tui_grid.v1") {
    throw new Error(`Unexpected TUI grid schema: ${grid.schema || ""}`);
  }
  for (const [field, expected] of [
    ["runtimeId", request.runtimeId],
    ["providerId", request.providerId],
    ["surfaceId", request.surfaceId],
    ["projectionKind", request.projectionKind],
    ["commandBoundary", request.commandBoundary],
    ["receiptSchema", request.receiptSchema],
  ]) {
    if ((grid[field] || "") !== (expected || "")) {
      throw new Error(`TUI grid ${field} expected ${expected || ""} got ${grid[field] || ""}`);
    }
  }
  if (!Array.isArray(grid.lines) || !grid.lines.length) {
    throw new Error("TUI grid artifact must contain at least one line");
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
  const artifact = buildTuiCaptureArtifact({
    advertisement: loadJsonFile(args.advertisement),
    capabilityManifest: loadJsonFile(args.capability),
    surfaceDocument: loadJsonFile(args.surface),
    advertisementPath: args.advertisement,
    capabilityManifestPath: args.capability,
    captureSurfaceId: args["surface-id"] || "",
    stamp,
    width: Number(args.width || 80),
  });
  writeTuiCaptureArtifact(artifact, {
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
