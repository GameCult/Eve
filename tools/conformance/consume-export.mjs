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
    "  --expect-conformance-handoff",
    "  --expect-plugin-operation <pluginId:operation>",
    "  --expect-plugin-capability <pluginId:capability>",
    "  --expect-plugin-handoff <pluginId>",
    "  --expect-provider-surface <providerId:surfaceId>",
    "  --expect-provider-command <providerId:command>",
    "  --expect-provider-receipt-state <providerId:state>",
    "  --expect-provider-handoff <providerId>",
    "  --expect-runtime-status <runtimeId:status>",
    "  --expect-runtime-feature <runtimeId:feature>",
    "  --expect-runtime-handoff <runtimeId>",
    "  --expect-runtime-command-schema <runtimeId:schema>",
    "  --expect-runtime-capture-status <runtimeId:status>",
    "  --expect-split-target-status <targetId:status>",
    "  --expect-split-target-blocker <targetId:blocker-substring>",
    "  --expect-split-target-proof <targetId:proof-substring>",
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
  const exportedRuntimeTargets = [];
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
      const packRuntimeTargets = Array.isArray(packDocument.runtimeTargets) ? packDocument.runtimeTargets : [];
      if (!packRuntimeTargets.length) errors.push("pack-file:runtime:runtimeTargets:missing");
      for (const runtime of packRuntimeTargets) {
        exportedRuntimeTargets.push(runtime);
        if (!runtime.runtimeId) errors.push("pack-file:runtime:runtimeTarget:runtimeId:missing");
        if (!runtime.status) errors.push(`pack-file:runtime:runtimeTarget:${runtime.runtimeId || "unknown"}:status:missing`);
        if (!runtime.ownerRepo) errors.push(`pack-file:runtime:runtimeTarget:${runtime.runtimeId || "unknown"}:ownerRepo:missing`);
      }
    }
  }

  const plugins = Array.isArray(index.plugins) ? index.plugins : [];
  const providers = Array.isArray(index.providers) ? index.providers : [];
  const runtimes = mergeRuntimeRecords(Array.isArray(index.runtimes) ? index.runtimes : [], exportedRuntimeTargets);
  const splitTargets = Array.isArray(index.splitTargets) ? index.splitTargets : [];

  if (expectations.conformanceHandoff && !index.conformanceHandoffPath) {
    errors.push("conformanceHandoffPath:missing");
  }
  if (expectations.conformanceHandoff) {
    validateExportedHandoff(index.conformanceHandoffExportPath, directory, "conformanceHandoff", errors);
  }

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
  for (const expectedPlugin of expectations.pluginHandoffs) {
    const plugin = plugins.find(candidate => candidate.pluginId === expectedPlugin);
    if (!plugin) {
      errors.push(`plugins:${expectedPlugin}:missing`);
      continue;
    }
    if (!plugin.handoffPath) {
      errors.push(`plugins:${expectedPlugin}:handoffPath:missing`);
    }
    validateExportedHandoff(plugin.handoffExportPath, directory, `plugins:${expectedPlugin}:handoff`, errors);
  }
  for (const expectedProvider of expectations.providers) {
    if (!providers.some(provider => provider.providerId === expectedProvider)) errors.push(`providers:${expectedProvider}:missing`);
  }
  for (const expectation of expectations.providerSurfaces) {
    const provider = providers.find(candidate => candidate.providerId === expectation.providerId);
    if (!provider) {
      errors.push(`providers:${expectation.providerId}:missing`);
      continue;
    }
    if (!Array.isArray(provider.surfaces) || !provider.surfaces.includes(expectation.surfaceId)) {
      errors.push(`providers:${expectation.providerId}:surface:${expectation.surfaceId}:missing`);
    }
  }
  for (const expectation of expectations.providerCommands) {
    const provider = providers.find(candidate => candidate.providerId === expectation.providerId);
    if (!provider) {
      errors.push(`providers:${expectation.providerId}:missing`);
      continue;
    }
    if (!Array.isArray(provider.commands) || !provider.commands.includes(expectation.command)) {
      errors.push(`providers:${expectation.providerId}:command:${expectation.command}:missing`);
    }
  }
  for (const expectation of expectations.providerReceiptStates) {
    const provider = providers.find(candidate => candidate.providerId === expectation.providerId);
    if (!provider) {
      errors.push(`providers:${expectation.providerId}:missing`);
      continue;
    }
    if (!Array.isArray(provider.receiptStates) || !provider.receiptStates.includes(expectation.state)) {
      errors.push(`providers:${expectation.providerId}:receiptState:${expectation.state}:missing`);
    }
  }
  for (const expectedProvider of expectations.providerHandoffs) {
    const provider = providers.find(candidate => candidate.providerId === expectedProvider);
    if (!provider) {
      errors.push(`providers:${expectedProvider}:missing`);
      continue;
    }
    if (!provider.handoffPath) {
      errors.push(`providers:${expectedProvider}:handoffPath:missing`);
    }
    validateExportedHandoff(provider.handoffExportPath, directory, `providers:${expectedProvider}:handoff`, errors);
  }
  for (const expectedRuntime of expectations.runtimes) {
    if (!runtimes.some(runtime => runtime.runtimeId === expectedRuntime)) errors.push(`runtimes:${expectedRuntime}:missing`);
  }
  for (const expectation of expectations.runtimeStatuses) {
    const runtime = runtimes.find(candidate => candidate.runtimeId === expectation.runtimeId);
    if (!runtime) {
      errors.push(`runtimes:${expectation.runtimeId}:missing`);
      continue;
    }
    if (runtime.status !== expectation.status) {
      errors.push(`runtimes:${expectation.runtimeId}:status:expected ${expectation.status} got ${runtime.status || ""}`);
    }
  }
  for (const expectation of expectations.runtimeFeatures) {
    const runtime = runtimes.find(candidate => candidate.runtimeId === expectation.runtimeId);
    if (!runtime) {
      errors.push(`runtimes:${expectation.runtimeId}:missing`);
      continue;
    }
    if (!Array.isArray(runtime.supportedFeatures) || !runtime.supportedFeatures.includes(expectation.feature)) {
      errors.push(`runtimes:${expectation.runtimeId}:feature:${expectation.feature}:missing`);
    }
  }
  for (const expectation of expectations.runtimeCommandSchemas) {
    const runtime = runtimes.find(candidate => candidate.runtimeId === expectation.runtimeId);
    if (!runtime) {
      errors.push(`runtimes:${expectation.runtimeId}:missing`);
      continue;
    }
    if (runtime.commandTransportSchema !== expectation.schema) {
      errors.push(`runtimes:${expectation.runtimeId}:commandTransportSchema:expected ${expectation.schema} got ${runtime.commandTransportSchema || ""}`);
    }
  }
  for (const expectation of expectations.runtimeCaptureStatuses) {
    const runtime = runtimes.find(candidate => candidate.runtimeId === expectation.runtimeId);
    if (!runtime) {
      errors.push(`runtimes:${expectation.runtimeId}:missing`);
      continue;
    }
    if (runtime.captureStatus !== expectation.status) {
      errors.push(`runtimes:${expectation.runtimeId}:captureStatus:expected ${expectation.status} got ${runtime.captureStatus || ""}`);
    }
  }
  for (const expectedRuntime of expectations.runtimeHandoffs) {
    const runtime = runtimes.find(candidate => candidate.runtimeId === expectedRuntime);
    if (!runtime) {
      errors.push(`runtimes:${expectedRuntime}:missing`);
      continue;
    }
    if (!runtime.splitHandoffPath) {
      errors.push(`runtimes:${expectedRuntime}:splitHandoffPath:missing`);
    }
    validateExportedHandoff(runtime.splitHandoffExportPath, directory, `runtimes:${expectedRuntime}:splitHandoff`, errors);
  }
  for (const expectedScenario of expectations.scenarios) {
    if (!providers.some(provider => provider.scenarioId === expectedScenario)) errors.push(`providers:scenario:${expectedScenario}:missing`);
  }
  for (const expectedSplitTarget of expectations.splitTargets) {
    if (!splitTargets.some(target => target.id === expectedSplitTarget)) errors.push(`splitTargets:${expectedSplitTarget}:missing`);
  }
  for (const expectation of expectations.splitTargetStatuses) {
    const target = splitTargets.find(candidate => candidate.id === expectation.targetId);
    if (!target) {
      errors.push(`splitTargets:${expectation.targetId}:missing`);
      continue;
    }
    if (target.status !== expectation.status) {
      errors.push(`splitTargets:${expectation.targetId}:status:expected ${expectation.status} got ${target.status || ""}`);
    }
  }
  for (const expectation of expectations.splitTargetBlockers) {
    const target = splitTargets.find(candidate => candidate.id === expectation.targetId);
    if (!target) {
      errors.push(`splitTargets:${expectation.targetId}:missing`);
      continue;
    }
    const blockers = Array.isArray(target.blockers) ? target.blockers : [];
    if (!blockers.some(blocker => blocker.includes(expectation.blocker))) {
      errors.push(`splitTargets:${expectation.targetId}:blocker:${expectation.blocker}:missing`);
    }
  }
  for (const expectation of expectations.splitTargetProofs) {
    const target = splitTargets.find(candidate => candidate.id === expectation.targetId);
    if (!target) {
      errors.push(`splitTargets:${expectation.targetId}:missing`);
      continue;
    }
    const proofs = Array.isArray(target.proofs) ? target.proofs : [];
    const proof = proofs.find(candidate => candidate.description?.includes(expectation.proof));
    if (!proof) {
      errors.push(`splitTargets:${expectation.targetId}:proof:${expectation.proof}:missing`);
    } else if (proof.status !== "passed") {
      errors.push(`splitTargets:${expectation.targetId}:proof:${expectation.proof}:expected passed got ${proof.status || ""}`);
    }
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

function validateExportedHandoff(exportPath, directory, label, errors) {
  if (!exportPath) {
    errors.push(`${label}:exportPath:missing`);
    return;
  }
  if (!existsSync(path.join(directory, exportPath))) {
    errors.push(`${label}:exportPath:${exportPath}:missing`);
  }
}

function parseArguments(args) {
  const exportPath = args[0] ? path.resolve(args[0]) : "";
  const expectations = {
    packs: [],
    fixtures: [],
    plugins: [],
    pluginOperations: [],
    pluginCapabilities: [],
    pluginHandoffs: [],
    providers: [],
    providerSurfaces: [],
    providerCommands: [],
    providerReceiptStates: [],
    providerHandoffs: [],
    runtimes: [],
    runtimeStatuses: [],
    runtimeFeatures: [],
    runtimeHandoffs: [],
    runtimeCommandSchemas: [],
    runtimeCaptureStatuses: [],
    scenarios: [],
    splitTargets: [],
    splitTargetStatuses: [],
    splitTargetBlockers: [],
    splitTargetProofs: [],
    conformanceHandoff: false,
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
    ["--expect-plugin-handoff", expectations.pluginHandoffs],
    ["--expect-provider-surface", expectations.providerSurfaces],
    ["--expect-provider-command", expectations.providerCommands],
    ["--expect-provider-receipt-state", expectations.providerReceiptStates],
    ["--expect-provider-handoff", expectations.providerHandoffs],
    ["--expect-runtime-status", expectations.runtimeStatuses],
    ["--expect-runtime-feature", expectations.runtimeFeatures],
    ["--expect-runtime-handoff", expectations.runtimeHandoffs],
    ["--expect-runtime-command-schema", expectations.runtimeCommandSchemas],
    ["--expect-runtime-capture-status", expectations.runtimeCaptureStatuses],
    ["--expect-split-target-status", expectations.splitTargetStatuses],
    ["--expect-split-target-blocker", expectations.splitTargetBlockers],
    ["--expect-split-target-proof", expectations.splitTargetProofs],
  ]);

  for (let index = 1; index < args.length; index += 1) {
    const option = args[index];
    if (option === "--expect-conformance-handoff") {
      expectations.conformanceHandoff = true;
      continue;
    }
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
    } else if (option === "--expect-plugin-handoff") {
      target.push(value);
    } else if (option === "--expect-provider-surface") {
      target.push(parseProviderExpectation(value, "surfaceId"));
    } else if (option === "--expect-provider-command") {
      target.push(parseProviderExpectation(value, "command"));
    } else if (option === "--expect-provider-receipt-state") {
      target.push(parseProviderExpectation(value, "state"));
    } else if (option === "--expect-provider-handoff") {
      target.push(value);
    } else if (option === "--expect-runtime-status") {
      target.push(parseRuntimeExpectation(value, "status"));
    } else if (option === "--expect-runtime-feature") {
      target.push(parseRuntimeExpectation(value, "feature"));
    } else if (option === "--expect-runtime-handoff") {
      target.push(value);
    } else if (option === "--expect-runtime-command-schema") {
      target.push(parseRuntimeExpectation(value, "schema"));
    } else if (option === "--expect-runtime-capture-status") {
      target.push(parseRuntimeExpectation(value, "status"));
    } else if (option === "--expect-split-target-status") {
      target.push(parseSplitTargetExpectation(value, "status"));
    } else if (option === "--expect-split-target-blocker") {
      target.push(parseSplitTargetExpectation(value, "blocker"));
    } else if (option === "--expect-split-target-proof") {
      target.push(parseSplitTargetExpectation(value, "proof"));
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

function parseProviderExpectation(value, field) {
  const separator = value.indexOf(":");
  if (separator <= 0 || separator === value.length - 1) {
    console.error(`Expected provider ${field} in <providerId:${field}> form, got: ${value}`);
    process.exit(2);
  }
  return {
    providerId: value.slice(0, separator),
    [field]: value.slice(separator + 1),
  };
}

function parseRuntimeExpectation(value, field) {
  const separator = value.indexOf(":");
  if (separator <= 0 || separator === value.length - 1) {
    console.error(`Expected runtime ${field} in <runtimeId:${field}> form, got: ${value}`);
    process.exit(2);
  }
  return {
    runtimeId: value.slice(0, separator),
    [field]: value.slice(separator + 1),
  };
}

function parseSplitTargetExpectation(value, field) {
  const separator = value.indexOf(":");
  if (separator <= 0 || separator === value.length - 1) {
    console.error(`Expected split target ${field} in <targetId:${field}> form, got: ${value}`);
    process.exit(2);
  }
  return {
    targetId: value.slice(0, separator),
    [field]: value.slice(separator + 1),
  };
}

function mergeRuntimeRecords(topLevelRuntimes, runtimeTargets) {
  const byId = new Map();
  for (const runtime of runtimeTargets) {
    if (runtime.runtimeId) byId.set(runtime.runtimeId, runtime);
  }
  for (const runtime of topLevelRuntimes) {
    if (!runtime.runtimeId) continue;
    byId.set(runtime.runtimeId, {
      ...(byId.get(runtime.runtimeId) || {}),
      ...runtime,
    });
  }
  return [...byId.values()];
}
