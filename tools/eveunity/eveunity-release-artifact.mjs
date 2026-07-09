import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function buildUnityReleaseArtifactPlan({ request, packageManifest } = {}) {
  if (!request || typeof request !== "object") {
    throw new Error("release request is required");
  }
  if (!packageManifest || typeof packageManifest !== "object") {
    throw new Error("package manifest is required");
  }
  if (request.artifactKind !== "upm-package") {
    throw new Error(`release artifact kind must be upm-package: ${request.artifactKind || "missing"}`);
  }
  if (packageManifest.name !== request.packageName) {
    throw new Error(`package name mismatch: expected ${request.packageName || "missing"} got ${packageManifest.name || "missing"}`);
  }
  if (packageManifest.version !== request.version) {
    throw new Error(`package version mismatch: expected ${request.version || "missing"} got ${packageManifest.version || "missing"}`);
  }
  if (!request.packageRoot) {
    throw new Error("release request missing packageRoot");
  }
  if (!request.artifactPath || !request.artifactPath.endsWith(".tgz")) {
    throw new Error(`release artifact path must be a .tgz file: ${request.artifactPath || "missing"}`);
  }

  const artifactDirectory = path.dirname(request.artifactPath);
  const expectedFileName = path.basename(request.artifactPath);
  return {
    packageRoot: request.packageRoot,
    artifactPath: request.artifactPath,
    artifactDirectory,
    expectedFileName,
    npmPackArguments: ["pack", request.packageRoot, "--pack-destination", artifactDirectory],
  };
}

export function packUnityReleaseArtifact({
  request,
  projectRoot = process.cwd(),
  npmCommand = "",
} = {}) {
  const packageRoot = resolveProjectPath(projectRoot, request?.packageRoot || "");
  const packageManifestPath = path.join(packageRoot, "package.json");
  if (!existsSync(packageManifestPath)) {
    throw new Error(`release package manifest not found: ${packageManifestPath}`);
  }

  const packageManifest = loadJsonFile(packageManifestPath);
  const plan = buildUnityReleaseArtifactPlan({ request, packageManifest });
  const artifactDirectory = resolveProjectPath(projectRoot, plan.artifactDirectory);
  const artifactPath = resolveProjectPath(projectRoot, plan.artifactPath);
  mkdirSync(artifactDirectory, { recursive: true });

  const npmInvocation = resolveNpmInvocation(npmCommand);
  const packArguments = ["pack", packageRoot, "--pack-destination", artifactDirectory];
  const result = spawnSync(npmInvocation.command, [...npmInvocation.prefixArguments, ...packArguments], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: npmInvocation.shell,
  });
  if (result.status !== 0) {
    throw new Error(`npm pack failed with exit code ${result.status ?? "spawn-error"}: ${result.error?.message || result.stderr || result.stdout || "no output"}`);
  }

  const packedFileName = result.stdout.trim().split(/\r?\n/).filter(Boolean).pop() || plan.expectedFileName;
  const packedPath = path.join(artifactDirectory, packedFileName);
  if (!existsSync(packedPath)) {
    throw new Error(`npm pack did not produce expected output: ${packedPath}`);
  }
  if (path.resolve(packedPath) !== path.resolve(artifactPath)) {
    throw new Error(`npm pack output mismatch: expected ${artifactPath} got ${packedPath}`);
  }

  const stats = statSync(artifactPath);
  if (stats.size <= 0) {
    throw new Error(`release artifact is empty: ${artifactPath}`);
  }

  return {
    schema: "gamecult.eve.runtime_release_artifact.v1",
    ownerRepo: request.ownerRepo,
    repository: request.repository,
    packageName: request.packageName,
    version: request.version,
    artifactKind: request.artifactKind,
    artifactPath: request.artifactPath,
    artifactSizeBytes: stats.size,
    packageRoot: request.packageRoot,
    sourceRequestPath: request.sourceRequestPath || "",
  };
}

export function loadJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeJsonFile(document, outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

function resolveProjectPath(projectRoot, filePath) {
  if (!filePath) return projectRoot;
  return path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);
}

function resolveNpmInvocation(npmCommand) {
  if (npmCommand) {
    return { command: npmCommand, prefixArguments: [], shell: false };
  }

  const npmCliPath = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (existsSync(npmCliPath)) {
    return { command: process.execPath, prefixArguments: [npmCliPath], shell: false };
  }

  return { command: "npm", prefixArguments: [], shell: true };
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
  for (const required of ["request", "proof-output"]) {
    if (!args[required]) {
      throw new Error(`missing required --${required}`);
    }
  }

  const projectRoot = args["project-root"] ? path.resolve(args["project-root"]) : process.cwd();
  const requestPath = resolveProjectPath(projectRoot, args.request);
  const request = {
    ...loadJsonFile(requestPath),
    sourceRequestPath: args.request,
  };
  const proof = packUnityReleaseArtifact({ request, projectRoot });
  const proofOutputPath = resolveProjectPath(projectRoot, args["proof-output"]);
  writeJsonFile(proof, proofOutputPath);
  process.stdout.write(`${proof.artifactPath}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath === modulePath) {
  runCli();
}
