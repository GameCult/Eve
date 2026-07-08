import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";

const exportDirectory = process.argv[2] ? path.resolve(process.argv[2]) : "";
if (!exportDirectory) {
  console.error("Usage: node tools/conformance/consume-export.mjs <export-directory>");
  process.exit(2);
}

const indexPath = path.join(exportDirectory, "index.json");
const errors = [];

if (!existsSync(indexPath)) {
  errors.push(`index.json:missing:${indexPath}`);
} else {
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  validateIndex(index, exportDirectory, errors);
}

for (const error of errors) console.error(`Conformance consumer error: ${error}`);
if (errors.length) process.exit(1);

console.log(`Conformance consumer smoke passed: ${exportDirectory}`);

function validateIndex(index, directory, errors) {
  if (index.schema !== "gamecult.eve.conformance_export.v1") {
    errors.push(`schema:expected gamecult.eve.conformance_export.v1 got ${index.schema || ""}`);
  }

  const packs = Array.isArray(index.packs) ? index.packs : [];
  const packIds = new Set(packs.map(pack => pack.id));
  for (const requiredPack of ["core", "plugin", "provider", "runtime"]) {
    if (!packIds.has(requiredPack)) errors.push(`pack:${requiredPack}:missing`);
  }

  for (const pack of packs) {
    const packPath = path.join(directory, "packs", `${pack.id}.json`);
    if (!existsSync(packPath)) {
      errors.push(`pack-file:${pack.id}:missing`);
      continue;
    }

    const packDocument = JSON.parse(readFileSyncUtf8(packPath));
    if (packDocument.id !== pack.id) {
      errors.push(`pack-file:${pack.id}:id:expected ${pack.id} got ${packDocument.id || ""}`);
    }
    if ((packDocument.fixtures || []).length !== (pack.fixtures || []).length) {
      errors.push(`pack-file:${pack.id}:fixture-count:expected ${(pack.fixtures || []).length} got ${(packDocument.fixtures || []).length}`);
    }

    for (const fixture of packDocument.fixtures || []) {
      if (!fixture.fixtureId) errors.push(`pack-file:${pack.id}:fixture:fixtureId:missing`);
      if (!fixture.status) errors.push(`pack-file:${pack.id}:fixture:${fixture.fixtureId || "unknown"}:status:missing`);
      if (!fixture.surface?.path) errors.push(`pack-file:${pack.id}:fixture:${fixture.fixtureId || "unknown"}:surface.path:missing`);
      if (!fixture.metadataPath) errors.push(`pack-file:${pack.id}:fixture:${fixture.fixtureId || "unknown"}:metadataPath:missing`);
    }
  }

  if (!Array.isArray(index.plugins) || !index.plugins.some(plugin => plugin.pluginId === "sai.vn" && plugin.abiFixturePath)) {
    errors.push("plugins:sai.vn:abiFixturePath:missing");
  }
  if (!Array.isArray(index.providers) || !index.providers.some(provider => provider.providerId === "aetheria" && provider.scenarioPath)) {
    errors.push("providers:aetheria:scenarioPath:missing");
  }
  if (!Array.isArray(index.runtimes) || !index.runtimes.some(runtime => runtime.runtimeId === "unity-uitoolkit" && runtime.commandTransportSchema === "gamecult.eve.command.v1")) {
    errors.push("runtimes:unity-uitoolkit:commandTransportSchema:missing");
  }
  if (!Array.isArray(index.splitTargets) || !index.splitTargets.some(target => target.id === "EveUnity")) {
    errors.push("splitTargets:EveUnity:missing");
  }
}

function readFileSyncUtf8(filePath) {
  return readFileSync(filePath, "utf8");
}
