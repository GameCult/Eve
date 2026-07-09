import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";

const { exportDirectory, expectations } = parseArguments(process.argv.slice(2));
if (!exportDirectory) {
  console.error([
    "Usage: node tools/conformance/consume-export.mjs <export-directory> [expectations]",
    "",
    "Expectations:",
    "  --expect-pack <id>",
    "  --expect-fixture <id>",
    "  --expect-plugin <id>",
    "  --expect-provider <id>",
    "  --expect-runtime <id>",
    "  --expect-scenario <id>",
    "  --expect-split-target <id>",
    "  --expect-plugin-operation <pluginId:operation>",
    "  --expect-plugin-capability <pluginId:capability>",
  ].join("\n"));
  process.exit(2);
}

const indexPath = path.join(exportDirectory, "index.json");
const errors = [];

if (!existsSync(indexPath)) {
  errors.push(`index.json:missing:${indexPath}`);
} else {
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  validateIndex(index, exportDirectory, expectations, errors);
}

for (const error of errors) console.error(`Conformance consumer error: ${error}`);
if (errors.length) process.exit(1);

console.log(`Conformance consumer smoke passed: ${exportDirectory}`);

function validateIndex(index, directory, expectations, errors) {
  if (index.schema !== "gamecult.eve.conformance_export.v1") {
    errors.push(`schema:expected gamecult.eve.conformance_export.v1 got ${index.schema || ""}`);
  }

  const packs = Array.isArray(index.packs) ? index.packs : [];
  const packIds = new Set(packs.map(pack => pack.id));
  const fixtureIds = new Set();
  for (const requiredPack of ["core", "plugin", "provider", "runtime"]) {
    if (!packIds.has(requiredPack)) errors.push(`pack:${requiredPack}:missing`);
  }
  for (const expectedPack of expectations.packs) {
    if (!packIds.has(expectedPack)) errors.push(`pack:${expectedPack}:missing`);
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
      if (fixture.fixtureId) fixtureIds.add(fixture.fixtureId);
      if (!fixture.fixtureId) errors.push(`pack-file:${pack.id}:fixture:fixtureId:missing`);
      if (!fixture.status) errors.push(`pack-file:${pack.id}:fixture:${fixture.fixtureId || "unknown"}:status:missing`);
      if (!fixture.surface?.path) errors.push(`pack-file:${pack.id}:fixture:${fixture.fixtureId || "unknown"}:surface.path:missing`);
      if (!fixture.metadataPath) errors.push(`pack-file:${pack.id}:fixture:${fixture.fixtureId || "unknown"}:metadataPath:missing`);
    }

    if (pack.id === "runtime") {
      const runtimeTargets = Array.isArray(packDocument.runtimeTargets) ? packDocument.runtimeTargets : [];
      if (!runtimeTargets.length) errors.push("pack-file:runtime:runtimeTargets:missing");
      for (const runtime of runtimeTargets) {
        if (!runtime.runtimeId) errors.push("pack-file:runtime:runtimeTarget:runtimeId:missing");
        if (!runtime.status) errors.push(`pack-file:runtime:runtimeTarget:${runtime.runtimeId || "unknown"}:status:missing`);
        if (!runtime.ownerRepo) errors.push(`pack-file:runtime:runtimeTarget:${runtime.runtimeId || "unknown"}:ownerRepo:missing`);
      }
    }
  }

  const plugins = Array.isArray(index.plugins) ? index.plugins : [];
  const providers = Array.isArray(index.providers) ? index.providers : [];
  const runtimes = Array.isArray(index.runtimes) ? index.runtimes : [];
  const splitTargets = Array.isArray(index.splitTargets) ? index.splitTargets : [];

  for (const expectedFixture of expectations.fixtures) {
    if (!fixtureIds.has(expectedFixture)) errors.push(`fixture:${expectedFixture}:missing`);
  }
  for (const expectedPlugin of expectations.plugins) {
    if (!plugins.some(plugin => plugin.pluginId === expectedPlugin)) errors.push(`plugins:${expectedPlugin}:missing`);
  }
  for (const expectation of expectations.pluginOperations) {
    const plugin = plugins.find(candidate => candidate.pluginId === expectation.pluginId);
    if (!plugin) {
      errors.push(`plugins:${expectation.pluginId}:missing`);
      continue;
    }
    if (!Array.isArray(plugin.abiOperations) || !plugin.abiOperations.includes(expectation.operation)) {
      errors.push(`plugins:${expectation.pluginId}:operation:${expectation.operation}:missing`);
    }
  }
  for (const expectation of expectations.pluginCapabilities) {
    const plugin = plugins.find(candidate => candidate.pluginId === expectation.pluginId);
    if (!plugin) {
      errors.push(`plugins:${expectation.pluginId}:missing`);
      continue;
    }
    if (!Array.isArray(plugin.capabilities) || !plugin.capabilities.includes(expectation.capability)) {
      errors.push(`plugins:${expectation.pluginId}:capability:${expectation.capability}:missing`);
    }
  }
  for (const expectedProvider of expectations.providers) {
    if (!providers.some(provider => provider.providerId === expectedProvider)) errors.push(`providers:${expectedProvider}:missing`);
  }
  for (const expectedRuntime of expectations.runtimes) {
    if (!runtimes.some(runtime => runtime.runtimeId === expectedRuntime)) errors.push(`runtimes:${expectedRuntime}:missing`);
  }
  for (const expectedScenario of expectations.scenarios) {
    if (!providers.some(provider => provider.scenarioId === expectedScenario)) errors.push(`providers:scenario:${expectedScenario}:missing`);
  }
  for (const expectedSplitTarget of expectations.splitTargets) {
    if (!splitTargets.some(target => target.id === expectedSplitTarget)) errors.push(`splitTargets:${expectedSplitTarget}:missing`);
  }

  if (!plugins.some(plugin => plugin.pluginId === "sai.vn" && plugin.abiFixturePath)) {
    errors.push("plugins:sai.vn:abiFixturePath:missing");
  }
  if (!providers.some(provider => provider.providerId === "aetheria" && provider.scenarioPath)) {
    errors.push("providers:aetheria:scenarioPath:missing");
  }
  if (!runtimes.some(runtime => runtime.runtimeId === "unity-uitoolkit" && runtime.commandTransportSchema === "gamecult.eve.command.v1")) {
    errors.push("runtimes:unity-uitoolkit:commandTransportSchema:missing");
  }
  if (!splitTargets.some(target => target.id === "EveUnity")) {
    errors.push("splitTargets:EveUnity:missing");
  }
}

function readFileSyncUtf8(filePath) {
  return readFileSync(filePath, "utf8");
}

function parseArguments(args) {
  const exportPath = args[0] ? path.resolve(args[0]) : "";
  const expectations = {
    packs: [],
    fixtures: [],
    plugins: [],
    pluginOperations: [],
    pluginCapabilities: [],
    providers: [],
    runtimes: [],
    scenarios: [],
    splitTargets: [],
  };
  const optionTargets = new Map([
    ["--expect-pack", expectations.packs],
    ["--expect-fixture", expectations.fixtures],
    ["--expect-plugin", expectations.plugins],
    ["--expect-provider", expectations.providers],
    ["--expect-runtime", expectations.runtimes],
    ["--expect-scenario", expectations.scenarios],
    ["--expect-split-target", expectations.splitTargets],
    ["--expect-plugin-operation", expectations.pluginOperations],
    ["--expect-plugin-capability", expectations.pluginCapabilities],
  ]);

  for (let index = 1; index < args.length; index += 1) {
    const option = args[index];
    const target = optionTargets.get(option);
    if (!target) {
      console.error(`Unknown option: ${option}`);
      process.exit(2);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      console.error(`Missing value for option: ${option}`);
      process.exit(2);
    }
    if (option === "--expect-plugin-operation") {
      target.push(parsePluginExpectation(value, "operation"));
    } else if (option === "--expect-plugin-capability") {
      target.push(parsePluginExpectation(value, "capability"));
    } else {
      target.push(value);
    }
    index += 1;
  }

  return { exportDirectory: exportPath, expectations };
}

function parsePluginExpectation(value, field) {
  const separator = value.indexOf(":");
  if (separator <= 0 || separator === value.length - 1) {
    console.error(`Expected plugin ${field} in <pluginId:${field}> form, got: ${value}`);
    process.exit(2);
  }
  return {
    pluginId: value.slice(0, separator),
    [field]: value.slice(separator + 1),
  };
}
