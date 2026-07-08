import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileEveDsl } from "../../web/eve-dsl.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "tools/parity/parity-manifest.json");
const outputRoot = process.env.EVE_PARITY_OUTPUT
  ? path.resolve(process.env.EVE_PARITY_OUTPUT)
  : path.join(repoRoot, "artifacts/parity");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDirectory = path.join(outputRoot, stamp);

await mkdir(runDirectory, { recursive: true });

const fixtureResults = [];
for (const fixture of manifest.fixtures) {
  fixtureResults.push(await evaluateFixture(fixture));
}

const pluginResults = await Promise.all((manifest.pluginManifests || []).map(plugin => evaluatePlugin(plugin, fixtureResults)));
const providerResults = await Promise.all((manifest.providerAdvertisements || []).map(provider => evaluateProvider(provider, fixtureResults)));
const runtimeResults = await Promise.all(manifest.runtimes.map(runtime => evaluateRuntime(runtime, fixtureResults)));
const splitTargetResults = evaluateSplitTargets(manifest.splitTargets || [], runtimeResults);
const report = {
  schema: "gamecult.eve.parity_report.v1",
  generatedAt: new Date().toISOString(),
  manifest: path.relative(repoRoot, manifestPath).replaceAll("\\", "/"),
  repoStrategy: manifest.repoStrategy || {},
  conformancePacks: manifest.conformancePacks || [],
  responsiveCases: manifest.responsiveCases || [],
  summary: summarize(fixtureResults, runtimeResults, pluginResults, providerResults, splitTargetResults),
  fixtures: fixtureResults,
  plugins: pluginResults,
  providers: providerResults,
  splitTargets: splitTargetResults,
  runtimes: runtimeResults,
};

await writeFile(path.join(runDirectory, "parity-report.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(runDirectory, "parity-report.md"), renderMarkdown(report));
await writeFile(path.join(outputRoot, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(outputRoot, "latest.md"), renderMarkdown(report));

console.log(`Parity report: ${path.relative(repoRoot, path.join(runDirectory, "parity-report.md"))}`);
if (report.summary.failedFixtures > 0) process.exitCode = 1;
if (report.summary.failedProviders > 0) process.exitCode = 1;

async function evaluateFixture(fixture) {
  const startedAt = Date.now();
  const state = await loadSurface(fixture.surface);
  const root = state.surface?.root;
  const nodes = root ? flattenSurface(root) : [];
  const kindCounts = countBy(nodes, node => node.kind || "unknown");
  const bindings = [...new Set(nodes.flatMap(readBindings))].sort();
  const embeddedDocuments = [...new Set(nodes
    .flatMap(node => node.embeddedDocuments || [])
    .map(slot => slot.slotId || slot.documentId)
    .filter(Boolean))].sort();
  const controlSkins = state.surface?.styles?.controlSkins || {};
  const skinNames = Object.keys(controlSkins);
  const skinNodes = Object.values(controlSkins).flatMap(skin => skin.children || []);
  const controlPartNames = [...new Set([...nodes, ...skinNodes]
    .filter(node => node.kind === "control.part")
    .map(node => node.props?.name)
    .filter(Boolean))].sort();
  const tokenNames = Object.keys(state.surface?.styles?.tokens || {}).sort();
  const commandDescriptors = readCommandDescriptors(state.commands || []);
  const commandIds = commandDescriptors.map(command => command.command).sort();
  const commandReferences = readCommandReferences(nodes);
  const commandDescriptorErrors = await validateCommandDescriptors(fixture, commandDescriptors);
  const authorityWitnesses = readAuthorityWitnesses(nodes);
  const authorityStates = [...new Set(authorityWitnesses.map(witness => witness.state))].filter(Boolean).sort();
  const authorityOwners = [...new Set(authorityWitnesses.map(witness => witness.owner))].filter(Boolean).sort();
  const receiptRefs = [...new Set(authorityWitnesses.map(witness => witness.receiptRef))].filter(Boolean).sort();
  const witnessRefs = [...new Set(authorityWitnesses.map(witness => witness.witnessRef))].filter(Boolean).sort();
  const metadataResult = await evaluateFixtureMetadata(fixture);
  const checks = [];

  addCheck(checks, "providerId", state.providerId === fixture.expect.providerId, {
    expected: fixture.expect.providerId,
    actual: state.providerId,
  });

  for (const kind of fixture.expect.componentKinds || []) {
    addCheck(checks, `component:${kind}`, Boolean(kindCounts[kind]), {
      expected: "present",
      actual: kindCounts[kind] || 0,
    });
  }

  for (const [kind, minimum] of Object.entries(fixture.expect.minimumCounts || {})) {
    addCheck(checks, `minimum:${kind}`, (kindCounts[kind] || 0) >= minimum, {
      expected: minimum,
      actual: kindCounts[kind] || 0,
    });
  }

  for (const skin of fixture.expect.controlSkins || []) {
    addCheck(checks, `skin:${skin}`, skinNames.includes(skin), {
      expected: "present",
      actual: skinNames,
    });
  }

  for (const part of fixture.expect.controlParts || []) {
    addCheck(checks, `controlPart:${part}`, controlPartNames.includes(part), {
      expected: "present",
      actual: controlPartNames,
    });
  }

  for (const token of fixture.expect.styleTokens || []) {
    addCheck(checks, `styleToken:${token}`, tokenNames.includes(token), {
      expected: "present",
      actual: tokenNames,
    });
  }

  for (const binding of fixture.expect.bindings || []) {
    addCheck(checks, `binding:${binding}`, bindings.includes(binding), {
      expected: "present",
      actual: bindings,
    });
  }

  for (const slot of fixture.expect.embeddedDocuments || []) {
    addCheck(checks, `embedded:${slot}`, embeddedDocuments.includes(slot), {
      expected: "present",
      actual: embeddedDocuments,
    });
  }

  for (const command of fixture.expect.commandDescriptors || []) {
    addCheck(checks, `command:${command}`, commandIds.includes(command), {
      expected: "present",
      actual: commandIds,
    });
  }

  for (const error of commandDescriptorErrors) {
    addCheck(checks, `commandDescriptor:${error}`, false, {
      expected: "valid command descriptor",
      actual: error,
    });
  }

  if (fixture.expect.commandReferencesDeclared) {
    for (const reference of commandReferences) {
      addCheck(checks, `commandReference:${reference.nodeId}:${reference.command}`, commandIds.includes(reference.command), {
        expected: "declared command descriptor",
        actual: commandIds,
      });
    }
  }

  for (const state of fixture.expect.authorityStates || []) {
    addCheck(checks, `authorityState:${state}`, authorityStates.includes(state), {
      expected: "present",
      actual: authorityStates,
    });
  }

  for (const owner of fixture.expect.authorityOwners || []) {
    addCheck(checks, `authorityOwner:${owner}`, authorityOwners.includes(owner), {
      expected: "present",
      actual: authorityOwners,
    });
  }

  if (fixture.expect.receiptRefs) {
    addCheck(checks, "receiptRefs", receiptRefs.length >= fixture.expect.receiptRefs, {
      expected: fixture.expect.receiptRefs,
      actual: receiptRefs.length,
    });
  }

  if (fixture.expect.witnessRefs) {
    addCheck(checks, "witnessRefs", witnessRefs.length >= fixture.expect.witnessRefs, {
      expected: fixture.expect.witnessRefs,
      actual: witnessRefs.length,
    });
  }

  for (const error of metadataResult.errors) {
    addCheck(checks, `metadata:${error}`, false, {
      expected: "valid fixture metadata",
      actual: error,
    });
  }

  const knownPacks = new Set((manifest.conformancePacks || []).map(pack => pack.id));
  if (fixture.pack) {
    addCheck(checks, "conformancePack", knownPacks.has(fixture.pack), {
      expected: [...knownPacks].sort(),
      actual: fixture.pack,
    });
  } else {
    addCheck(checks, "conformancePack", false, {
      expected: "fixture declares pack",
      actual: "",
    });
  }

  return {
    id: fixture.id,
    title: fixture.title,
    pack: fixture.pack || "",
    ownerRepo: fixture.ownerRepo || "",
    requiredPlugins: fixture.requiredPlugins || [],
    status: checks.every(check => check.pass) ? "pass" : "fail",
    durationMs: Date.now() - startedAt,
    providerId: state.providerId,
    componentCount: nodes.length,
    kindCounts,
    styleTokens: tokenNames,
    controlSkins: skinNames,
    controlParts: controlPartNames,
    bindings,
    embeddedDocuments,
    commands: commandIds,
    commandReferences,
    commandDescriptorErrors,
    authorityStates,
    authorityOwners,
    receiptRefs,
    witnessRefs,
    authorityWitnesses,
    metadataPath: fixture.metadataPath || "",
    metadata: metadataResult.metadata,
    metadataErrors: metadataResult.errors,
    checks,
  };
}

async function loadSurface(surface) {
  const absolutePath = path.join(repoRoot, surface.path);
  const source = await readFile(absolutePath, "utf8");
  if (surface.transport === "local-eve-dsl") return compileEveDsl(source);
  if (surface.transport === "local-json") return JSON.parse(source);
  throw new Error(`Unsupported parity surface transport: ${surface.transport}`);
}

async function evaluateRuntime(runtime, fixtureResults) {
  const expectedPaths = runtime.expectedPaths || [];
  const missingPaths = expectedPaths.filter(candidate => !existsSync(path.join(repoRoot, candidate)));
  const expectedExternalPaths = runtime.expectedExternalPaths || [];
  const missingExternalPaths = expectedExternalPaths.filter(candidate => !existsSync(candidate));
  const expectedSourceSymbols = runtime.expectedSourceSymbols || [];
  const missingSourceSymbols = [];
  for (const expectation of expectedSourceSymbols) {
    const sourcePath = expectation.path || "";
    const absolutePath = path.join(repoRoot, sourcePath);
    if (!existsSync(absolutePath)) {
      missingSourceSymbols.push(`${sourcePath}:missing`);
      continue;
    }

    const source = await readFile(absolutePath, "utf8");
    for (const symbol of expectation.contains || []) {
      if (!source.includes(symbol)) missingSourceSymbols.push(`${sourcePath}:${symbol}`);
    }
  }
  const expectedExternalSourceSymbols = runtime.expectedExternalSourceSymbols || [];
  const missingExternalSourceSymbols = [];
  for (const expectation of expectedExternalSourceSymbols) {
    const sourcePath = expectation.path || "";
    if (!existsSync(sourcePath)) {
      missingExternalSourceSymbols.push(`${sourcePath}:missing`);
      continue;
    }

    const source = await readFile(sourcePath, "utf8");
    for (const symbol of expectation.contains || []) {
      if (!source.includes(symbol)) missingExternalSourceSymbols.push(`${sourcePath}:${symbol}`);
    }
  }
  const requiredFixtures = runtime.requiredFixtures || [];
  const missingRequiredFixtures = requiredFixtures.filter(id => !fixtureResults.some(fixture => fixture.id === id && fixture.status === "pass"));
  const supportedFeatures = runtime.supportedFeatures || [];
  const supportedPlugins = runtime.supportedPlugins || [];
  const missingRequiredFeatures = [];
  if (requiredFixtures.includes("embedded-surface") && !supportedFeatures.includes("embeddedDocuments")) {
    missingRequiredFeatures.push("embeddedDocuments");
  }
  const commandTransportSmokeErrors = await validateRuntimeCommandTransportSmoke(runtime);
  const missingIncubationFields = requiredIncubationFields(runtime).filter(field => !runtime[field]);
  const pluginCapabilityGaps = collectPluginCapabilityGaps(runtime, fixtureResults);
  let status = runtime.kind === "active" ? "active" : "pending";
  if (missingPaths.length) status = "missing-body";
  if (runtime.kind === "active" && missingSourceSymbols.length) status = "missing-source-symbol";
  if (runtime.kind === "active" && missingRequiredFixtures.length) status = "missing-required-fixture";
  if (runtime.kind === "active" && missingRequiredFeatures.length) status = "missing-required-feature";
  if (runtime.kind === "active" && commandTransportSmokeErrors.length) status = "missing-command-transport-smoke";
  if (runtime.kind === "active" && missingIncubationFields.length) status = "missing-incubation-metadata";
  if (runtime.kind === "active" && pluginCapabilityGaps.length && status === "active") status = "active-with-capability-gaps";
  if (runtime.kind === "pending" && runtime.adapterSpike === "external" && !missingExternalPaths.length && !missingExternalSourceSymbols.length) {
    status = "external-adapter-spike";
  }
  if (["ssh-png", "adb-png", "golden"].includes(runtime.capture?.status) && status === "pending") {
    status = "capture-ready";
  }
  return {
    id: runtime.id,
    title: runtime.title,
    kind: runtime.kind,
    status,
    semanticHarness: Boolean(runtime.semanticHarness),
    expectedPaths,
    missingPaths,
    expectedExternalPaths,
    missingExternalPaths,
    expectedSourceSymbols,
    missingSourceSymbols,
    expectedExternalSourceSymbols,
    missingExternalSourceSymbols,
    requiredFixtures,
    pluginFixtures: runtime.pluginFixtures || [],
    missingRequiredFixtures,
    supportedFeatures,
    supportedPlugins,
    missingRequiredFeatures,
    commandTransportSmoke: runtime.commandTransportSmoke || null,
    commandTransportSmokeErrors,
    ownerRepo: runtime.ownerRepo || "",
    repoRole: runtime.repoRole || "",
    graduationTrigger: runtime.graduationTrigger || "",
    splitTarget: runtime.splitTarget || "",
    adapterSpike: runtime.adapterSpike || "",
    demotionReason: runtime.demotionReason || "",
    activationCriteria: runtime.activationCriteria || [],
    missingIncubationFields,
    pluginCapabilityGaps,
    capture: runtime.capture,
  };
}

async function evaluatePlugin(plugin, fixtureResults) {
  const expectedPaths = plugin.expectedPaths || [];
  const missingPaths = expectedPaths.filter(candidate => !existsSync(path.join(repoRoot, candidate)));
  const requiredFixtures = plugin.requiredFixtures || [];
  const missingRequiredFixtures = requiredFixtures.filter(id => !fixtureResults.some(fixture => fixture.id === id && fixture.status === "pass"));
  const missingIncubationFields = requiredIncubationFields(plugin).filter(field => !plugin[field]);
  const schemaErrors = await validateJsonDocument(plugin.schemaPath, plugin.manifestPath, {
    schema: "gamecult.eve.plugin.v1",
    pluginId: plugin.pluginId,
  });
  const advertisementErrors = await validateJsonDocument(plugin.advertisementSchemaPath, plugin.advertisementPath, {
    schema: "gamecult.eve.plugin_advertisement.v1",
    pluginId: plugin.pluginId,
  });
  const abiErrors = await validatePluginAbiFixture(plugin);
  const status = missingPaths.length
    ? "missing-body"
    : missingRequiredFixtures.length
      ? "missing-required-fixture"
      : missingIncubationFields.length
        ? "missing-incubation-metadata"
        : schemaErrors.length
          ? "invalid-plugin-manifest"
          : advertisementErrors.length
            ? "invalid-plugin-advertisement"
            : abiErrors.length
              ? "invalid-plugin-abi-fixture"
              : plugin.kind === "incubating"
                ? "incubating"
                : "external-owner-planned";

  return {
    pluginId: plugin.pluginId,
    title: plugin.title,
    kind: plugin.kind,
    ownerRepo: plugin.ownerRepo || "",
    repoRole: plugin.repoRole || "",
    graduationTrigger: plugin.graduationTrigger || "",
    splitTarget: plugin.splitTarget || "",
    capabilities: plugin.capabilities || [],
    optionalPlugins: plugin.optionalPlugins || [],
    requiredFixtures,
    missingRequiredFixtures,
    schemaPath: plugin.schemaPath || "",
    manifestPath: plugin.manifestPath || "",
    abiFixturePath: plugin.abiFixturePath || "",
    advertisementSchemaPath: plugin.advertisementSchemaPath || "",
    advertisementPath: plugin.advertisementPath || "",
    schemaErrors,
    advertisementErrors,
    abiErrors,
    expectedPaths,
    missingPaths,
    missingIncubationFields,
    status,
  };
}

async function evaluateFixtureMetadata(fixture) {
  const errors = [];
  if (!fixture.metadataPath) return { metadata: null, errors: ["metadataPath:missing"] };

  errors.push(...await validateJsonDocument(
    manifest.schemas?.["gamecult.eve.conformance_fixture.v1"],
    fixture.metadataPath,
    {
      schema: "gamecult.eve.conformance_fixture.v1",
      fixtureId: fixture.id,
    },
  ));
  if (errors.length) return { metadata: null, errors };

  const metadata = await readJsonDocument(fixture.metadataPath);
  if (metadata.pack !== fixture.pack) errors.push(`pack:expected ${fixture.pack} got ${metadata.pack}`);
  if (metadata.ownerRepo !== fixture.ownerRepo) errors.push(`ownerRepo:expected ${fixture.ownerRepo} got ${metadata.ownerRepo}`);
  if (metadata.surface?.transport !== fixture.surface?.transport) {
    errors.push(`surface.transport:expected ${fixture.surface?.transport} got ${metadata.surface?.transport}`);
  }
  if (metadata.surface?.path !== fixture.surface?.path) {
    errors.push(`surface.path:expected ${fixture.surface?.path} got ${metadata.surface?.path}`);
  }
  if (!Array.isArray(metadata.asserts) || metadata.asserts.length === 0) errors.push("asserts:empty");

  return { metadata, errors };
}

async function evaluateProvider(provider, fixtureResults) {
  const expectedPaths = provider.expectedPaths || [];
  const missingPaths = expectedPaths.filter(candidate => !existsSync(path.join(repoRoot, candidate)));
  const requiredFixtures = provider.requiredFixtures || [];
  const missingRequiredFixtures = requiredFixtures.filter(id => !fixtureResults.some(fixture => fixture.id === id && fixture.status === "pass"));
  const missingIncubationFields = requiredIncubationFields(provider).filter(field => !provider[field]);
  const advertisementErrors = await validateJsonDocument(provider.schemaPath, provider.advertisementPath, {
    schema: "gamecult.eve.provider_advertisement.v1",
    providerId: provider.providerId,
  });
  const advertisement = advertisementErrors.length ? null : await readJsonDocument(provider.advertisementPath);
  const schemaIds = advertisement ? extractProviderSchemaIds(advertisement.schemas || []) : [];
  const advertisedSchemaIds = advertisement ? [...new Set([
    ...schemaIds,
    ...(advertisement.surfaces || []).map(surface => surface.schema).filter(Boolean),
    ...(advertisement.commands || []).map(command => command.schema).filter(Boolean),
  ])].sort() : [];
  const surfaceIds = advertisement ? (advertisement.surfaces || []).map(surface => surface.surfaceId).filter(Boolean).sort() : [];
  const commandIds = advertisement ? (advertisement.commands || []).map(command => command.command).filter(Boolean).sort() : [];
  const witnessKinds = advertisement ? (advertisement.witnesses || []).map(witness => witness.kind).filter(Boolean).sort() : [];
  const missingSchemas = (provider.expectedSchemas || []).filter(schema => !advertisedSchemaIds.includes(schema));
  const missingSurfaces = (provider.expectedSurfaces || []).filter(surface => !surfaceIds.includes(surface));
  const missingCommands = (provider.expectedCommands || []).filter(command => !commandIds.includes(command));
  const scenarioErrors = await validateProviderScenario(provider, advertisement, fixtureResults, advertisedSchemaIds, surfaceIds, commandIds);
  const scenario = scenarioErrors.length || !provider.scenarioPath ? null : await readJsonDocument(provider.scenarioPath);
  const status = missingPaths.length
    ? "missing-body"
    : missingRequiredFixtures.length
      ? "missing-required-fixture"
      : missingIncubationFields.length
        ? "missing-ownership-metadata"
        : advertisementErrors.length
          ? "invalid-provider-advertisement"
          : missingSchemas.length || missingSurfaces.length || missingCommands.length
            ? "capability-gap"
            : scenarioErrors.length
              ? "invalid-provider-scenario"
              : "advertised";

  return {
    providerId: provider.providerId,
    title: provider.title,
    kind: provider.kind,
    ownerRepo: provider.ownerRepo || "",
    repoRole: provider.repoRole || "",
    graduationTrigger: provider.graduationTrigger || "",
    requiredFixtures,
    missingRequiredFixtures,
    schemaPath: provider.schemaPath || "",
    advertisementPath: provider.advertisementPath || "",
    scenarioPath: provider.scenarioPath || "",
    advertisementErrors,
    scenarioErrors,
    expectedPaths,
    missingPaths,
    missingIncubationFields,
    expectedSchemas: provider.expectedSchemas || [],
    expectedSurfaces: provider.expectedSurfaces || [],
    expectedCommands: provider.expectedCommands || [],
    schemaIds,
    advertisedSchemaIds,
    surfaceIds,
    commandIds,
    witnessKinds,
    missingSchemas,
    missingSurfaces,
    missingCommands,
    scenarioId: scenario?.scenarioId || "",
    scenarioReceiptStates: scenario ? [...new Set((scenario.expectedReceipts || []).map(receipt => receipt.state).filter(Boolean))].sort() : [],
    status,
  };
}

async function readJsonDocument(documentPath) {
  return JSON.parse(await readFile(path.join(repoRoot, documentPath), "utf8"));
}

async function validateProviderScenario(provider, advertisement, fixtureResults, advertisedSchemaIds, surfaceIds, commandIds) {
  if (!provider.scenarioPath) return [];

  const errors = await validateJsonDocument(
    manifest.schemas?.["gamecult.eve.provider_scenario.v1"],
    provider.scenarioPath,
    {
      schema: "gamecult.eve.provider_scenario.v1",
      providerId: provider.providerId,
    },
  );
  if (errors.length) return errors;

  try {
    const scenario = await readJsonDocument(provider.scenarioPath);
    if (scenario.ownerRepo !== provider.ownerRepo) {
      errors.push(`${provider.scenarioPath}:ownerRepo:expected ${provider.ownerRepo} got ${scenario.ownerRepo}`);
    }
    if (scenario.advertisementPath !== provider.advertisementPath) {
      errors.push(`${provider.scenarioPath}:advertisementPath:expected ${provider.advertisementPath} got ${scenario.advertisementPath}`);
    }

    const advertisedScenario = (advertisement?.conformanceScenarios || []).find(candidate =>
      candidate.scenarioId === scenario.scenarioId && candidate.path === provider.scenarioPath);
    if (!advertisedScenario) {
      errors.push(`${provider.advertisementPath}:conformanceScenarios:${scenario.scenarioId}:missing`);
    }

    for (const fixtureId of scenario.requires?.fixtures || []) {
      if (!fixtureResults.some(fixture => fixture.id === fixtureId && fixture.status === "pass")) {
        errors.push(`${provider.scenarioPath}:requires.fixtures:${fixtureId}:missing`);
      }
    }
    errors.push(...missingMembers(scenario.requires?.surfaces || [], surfaceIds, `${provider.scenarioPath}:requires.surfaces`));
    errors.push(...missingMembers(scenario.requires?.commands || [], commandIds, `${provider.scenarioPath}:requires.commands`));
    errors.push(...missingMembers(scenario.requires?.schemas || [], advertisedSchemaIds, `${provider.scenarioPath}:requires.schemas`));

    const receipts = scenario.expectedReceipts || [];
    const receiptKeys = new Set(receipts.map(receipt => `${receipt.command}:${receipt.commandId}`));
    for (const intent of scenario.commandIntents || []) {
      if (!commandIds.includes(intent.command)) {
        errors.push(`${provider.scenarioPath}:commandIntents:${intent.command}:unadvertised`);
      }
      if (!receiptKeys.has(`${intent.command}:${intent.commandId}`)) {
        errors.push(`${provider.scenarioPath}:expectedReceipts:${intent.command}:${intent.commandId}:missing`);
      }
    }

    for (const receipt of receipts) {
      if (!commandIds.includes(receipt.command)) {
        errors.push(`${provider.scenarioPath}:expectedReceipts:${receipt.command}:unadvertised`);
      }
      if (receipt.ownerRepo !== provider.ownerRepo) {
        errors.push(`${provider.scenarioPath}:expectedReceipts:${receipt.receiptId}:ownerRepo:expected ${provider.ownerRepo} got ${receipt.ownerRepo}`);
      }
      if (!["accepted", "denied", "pending", "reconciled"].includes(receipt.state)) {
        errors.push(`${provider.scenarioPath}:expectedReceipts:${receipt.receiptId}:state:${receipt.state}:unknown`);
      }
      if (receipt.schema && !advertisedSchemaIds.includes(receipt.schema)) {
        errors.push(`${provider.scenarioPath}:expectedReceipts:${receipt.receiptId}:schema:${receipt.schema}:unadvertised`);
      }
    }
  } catch (error) {
    errors.push(`${provider.scenarioPath}:invalid-json:${error instanceof Error ? error.message : String(error)}`);
  }

  return errors;
}

async function validatePluginAbiFixture(plugin) {
  const errors = await validateJsonDocument(
    manifest.schemas?.["gamecult.eve.plugin_abi_fixture.v1"],
    plugin.abiFixturePath,
    {
      schema: "gamecult.eve.plugin_abi_fixture.v1",
      pluginId: plugin.pluginId,
    },
  );
  if (errors.length) return errors;

  try {
    const abiFixture = await readJsonDocument(plugin.abiFixturePath);
    const pluginManifest = await readJsonDocument(plugin.manifestPath);
    const operations = new Map((abiFixture.operations || []).map(operation => [operation.operation, operation]));

    if (abiFixture.ownerRepo !== plugin.ownerRepo) {
      errors.push(`${plugin.abiFixturePath}:ownerRepo:expected ${plugin.ownerRepo} got ${abiFixture.ownerRepo}`);
    }
    if (abiFixture.contract !== "gamecult.eve.plugin_abi.v1") {
      errors.push(`${plugin.abiFixturePath}:contract:expected gamecult.eve.plugin_abi.v1 got ${abiFixture.contract}`);
    }

    for (const operation of ["describe", "validate", "project", "apply"]) {
      if (!operations.has(operation)) errors.push(`${plugin.abiFixturePath}:operation:${operation}:missing`);
    }

    if (!(pluginManifest.abiFixtures || []).includes(plugin.abiFixturePath)) {
      errors.push(`${plugin.manifestPath}:abiFixtures:${plugin.abiFixturePath}:missing`);
    }

    const manifestCommands = (pluginManifest.commands || []).map(command => command.command);
    const manifestComponentKinds = pluginManifest.componentKinds || [];
    const manifestCommandEffects = new Map((pluginManifest.commands || []).map(command => [command.command, command.effect]));

    const describe = operations.get("describe")?.expect || {};
    if (describe.pluginId !== plugin.pluginId) {
      errors.push(`${plugin.abiFixturePath}:describe.pluginId:expected ${plugin.pluginId} got ${describe.pluginId}`);
    }
    errors.push(...missingMembers(manifestComponentKinds, describe.componentKinds || [], `${plugin.abiFixturePath}:describe.componentKinds`));
    errors.push(...missingMembers(manifestCommands, describe.commands || [], `${plugin.abiFixturePath}:describe.commands`));
    errors.push(...missingMembers(plugin.capabilities || [], describe.capabilities || [], `${plugin.abiFixturePath}:describe.capabilities`));

    const validate = operations.get("validate")?.expect || {};
    errors.push(...missingMembers(manifestComponentKinds, validate.acceptedComponentKinds || [], `${plugin.abiFixturePath}:validate.acceptedComponentKinds`));

    const project = operations.get("project")?.expect || {};
    errors.push(...missingMembers(manifestComponentKinds, project.ownedComponentKinds || [], `${plugin.abiFixturePath}:project.ownedComponentKinds`));
    if (!project.projectionKind) errors.push(`${plugin.abiFixturePath}:project.projectionKind:missing`);

    const apply = operations.get("apply")?.expect || {};
    if (manifestCommands.length) {
      const commandEffects = apply.commandEffects || {};
      for (const command of manifestCommands) {
        if (!commandEffects[command]) {
          errors.push(`${plugin.abiFixturePath}:apply.commandEffects:${command}:missing`);
          continue;
        }

        const expectedEffect = manifestCommandEffects.get(command);
        if (commandEffects[command] !== expectedEffect) {
          errors.push(`${plugin.abiFixturePath}:apply.commandEffects:${command}:expected ${expectedEffect} got ${commandEffects[command]}`);
        }
      }
    } else if (!(apply.stateEffects || []).length) {
      errors.push(`${plugin.abiFixturePath}:apply.stateEffects:missing`);
    }
  } catch (error) {
    errors.push(`${plugin.abiFixturePath}:invalid-json:${error instanceof Error ? error.message : String(error)}`);
  }

  return errors;
}

function missingMembers(expected, actual, label) {
  const actualSet = new Set(actual);
  return expected.filter(item => !actualSet.has(item)).map(item => `${label}:${item}:missing`);
}

async function validateJsonDocument(schemaPath, documentPath, expected = {}) {
  const errors = [];
  if (!schemaPath) errors.push("schemaPath:missing");
  if (!documentPath) errors.push("documentPath:missing");
  if (!schemaPath || !documentPath) return errors;

  const absoluteSchemaPath = path.join(repoRoot, schemaPath);
  const absoluteDocumentPath = path.join(repoRoot, documentPath);
  if (!existsSync(absoluteSchemaPath)) errors.push(`${schemaPath}:missing`);
  if (!existsSync(absoluteDocumentPath)) errors.push(`${documentPath}:missing`);
  if (errors.length) return errors;

  try {
    const schema = JSON.parse(await readFile(absoluteSchemaPath, "utf8"));
    const document = JSON.parse(await readFile(absoluteDocumentPath, "utf8"));
    errors.push(...validateSchemaSubset(schema, document));
    for (const [key, value] of Object.entries(expected)) {
      if (document[key] !== value) errors.push(`${documentPath}:${key}:expected ${value} got ${document[key]}`);
    }
  } catch (error) {
    errors.push(`${documentPath}:invalid-json:${error instanceof Error ? error.message : String(error)}`);
  }

  return errors;
}

function extractProviderSchemaIds(schemas) {
  return schemas.map(schema => {
    if (typeof schema === "string") return schema;
    if (schema && typeof schema === "object") return schema.schema || schema.id || "";
    return "";
  }).filter(Boolean).sort();
}

function validateSchemaSubset(schema, value, pointer = "$") {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${pointer}:const:${schema.const}`);
  }

  if (schema.type && !matchesSchemaType(value, schema.type)) {
    errors.push(`${pointer}:type:${schema.type}`);
    return errors;
  }

  if (schema.minLength !== undefined && typeof value === "string" && value.length < schema.minLength) {
    errors.push(`${pointer}:minLength:${schema.minLength}`);
  }

  if (schema.required && value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required) {
      if (value[key] === undefined) errors.push(`${pointer}.${key}:required`);
    }
  }

  if (schema.properties && value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, childSchema] of Object.entries(schema.properties)) {
      if (value[key] !== undefined) {
        errors.push(...validateSchemaSubset(childSchema, value[key], `${pointer}.${key}`));
      }
    }
  }

  if (schema.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      errors.push(...validateSchemaSubset(schema.items, item, `${pointer}[${index}]`));
    });
  }

  return errors;
}

function matchesSchemaType(value, type) {
  switch (type) {
    case "array":
      return Array.isArray(value);
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    default:
      return true;
  }
}

function collectPluginCapabilityGaps(runtime, fixtureResults) {
  const supported = new Map((runtime.supportedPlugins || []).map(plugin => [plugin.pluginId, new Set(plugin.capabilities || [])]));
  const fixtureById = new Map((manifest.fixtures || []).map(fixture => [fixture.id, fixture]));
  const gaps = [];
  const fixtureIds = [...new Set([...(runtime.requiredFixtures || []), ...(runtime.pluginFixtures || [])])];
  for (const fixtureId of fixtureIds) {
    const fixtureResult = fixtureResults.find(fixture => fixture.id === fixtureId);
    if (!fixtureResult || fixtureResult.status !== "pass") continue;
    const fixture = fixtureById.get(fixtureId);
    for (const requirement of fixture?.requiredPlugins || []) {
      const capabilities = supported.get(requirement.pluginId);
      if (!capabilities) {
        gaps.push(`${fixtureId}:${requirement.pluginId}`);
        continue;
      }
      for (const capability of requirement.capabilities || []) {
        if (!capabilities.has(capability)) gaps.push(`${fixtureId}:${requirement.pluginId}:${capability}`);
      }
    }
  }
  return gaps;
}

async function validateRuntimeCommandTransportSmoke(runtime) {
  const smoke = runtime.commandTransportSmoke;
  if (!smoke) return [];

  const errors = [];
  if (smoke.schema !== "gamecult.eve.command.v1") {
    errors.push(`schema:expected gamecult.eve.command.v1 got ${smoke.schema || ""}`);
  }

  for (const candidate of smoke.expectedPaths || []) {
    if (!existsSync(path.join(repoRoot, candidate))) errors.push(`path:${candidate}:missing`);
  }

  for (const expectation of smoke.expectedSourceSymbols || []) {
    const sourcePath = expectation.path || "";
    const absolutePath = path.join(repoRoot, sourcePath);
    if (!existsSync(absolutePath)) {
      errors.push(`source:${sourcePath}:missing`);
      continue;
    }

    const source = await readFile(absolutePath, "utf8");
    for (const symbol of expectation.contains || []) {
      if (!source.includes(symbol)) errors.push(`source:${sourcePath}:${symbol}:missing`);
    }
  }

  return errors;
}

function evaluateSplitTargets(splitTargets, runtimeResults) {
  const runtimeById = new Map(runtimeResults.map(runtime => [runtime.id, runtime]));
  return splitTargets.map(target => {
    const requiredRuntimeStatuses = target.requiredRuntimeStatuses || ["active"];
    const requiredFeatures = target.requiredFeatures || [];
    const requiredPlugins = target.requiredPlugins || [];
    const runtimeIds = target.runtimes || [];
    const blockers = [];
    const runtimeStatuses = {};

    for (const runtimeId of runtimeIds) {
      const runtime = runtimeById.get(runtimeId);
      if (!runtime) {
        blockers.push(`runtime:${runtimeId}:missing`);
        continue;
      }

      runtimeStatuses[runtimeId] = runtime.status;
      if (!requiredRuntimeStatuses.includes(runtime.status)) {
        blockers.push(`runtime:${runtimeId}:status:${runtime.status}`);
      }

      for (const feature of requiredFeatures) {
        if (!runtime.supportedFeatures.includes(feature)) {
          blockers.push(`runtime:${runtimeId}:feature:${feature}`);
        }
      }

      const supportedPlugins = new Map(runtime.supportedPlugins.map(plugin => [plugin.pluginId, new Set(plugin.capabilities || [])]));
      for (const requirement of requiredPlugins) {
        const capabilities = supportedPlugins.get(requirement.pluginId);
        if (!capabilities) {
          blockers.push(`runtime:${runtimeId}:plugin:${requirement.pluginId}`);
          continue;
        }

        for (const capability of requirement.capabilities || []) {
          if (!capabilities.has(capability)) {
            blockers.push(`runtime:${runtimeId}:plugin:${requirement.pluginId}:${capability}`);
          }
        }
      }
    }

    for (const proof of target.pendingProofs || []) {
      blockers.push(`proof:${proof}`);
    }

    return {
      id: target.id,
      ownerRepo: target.ownerRepo || "",
      repoRole: target.repoRole || "",
      status: blockers.length ? "incubating" : "ready-to-split",
      declaredStatus: target.status || "",
      runtimes: runtimeIds,
      runtimeStatuses,
      requiredRuntimeStatuses,
      requiredFeatures,
      requiredPlugins,
      pendingProofs: target.pendingProofs || [],
      blockers,
    };
  });
}

function requiredIncubationFields(entry) {
  if (entry.repoRole === "core") return ["ownerRepo", "repoRole"];
  return ["ownerRepo", "repoRole", "graduationTrigger"];
}

function flattenSurface(root) {
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    for (const child of node.children || []) visit(child);
  };
  visit(root);
  return nodes;
}

function readBindings(node) {
  const props = node.props || {};
  const bindings = [];
  if (props.bind) bindings.push(props.bind);
  if (props.action?.target) bindings.push(props.action.target);
  return bindings;
}

function readCommandDescriptors(commands) {
  return commands
    .filter(command => command && typeof command === "object")
    .map(command => ({
      ...command,
      command: typeof command.command === "string" ? command.command : "",
      schema: typeof command.schema === "string" ? command.schema : "",
    }))
    .filter(command => command.command);
}

async function validateCommandDescriptors(fixture, commandDescriptors) {
  if (!fixture.expect.commandDescriptorSchema) return [];
  const schemaPath = manifest.schemas?.[fixture.expect.commandDescriptorSchema];
  if (!schemaPath) return [`${fixture.expect.commandDescriptorSchema}:schemaPath:missing`];
  const absoluteSchemaPath = path.join(repoRoot, schemaPath);
  if (!existsSync(absoluteSchemaPath)) return [`${schemaPath}:missing`];
  const schema = JSON.parse(await readFile(absoluteSchemaPath, "utf8"));
  return commandDescriptors.flatMap(command =>
    validateSchemaSubset(schema, command, `command:${command.command}`));
}

function readCommandReferences(nodes) {
  return nodes.flatMap(node => {
    const props = node.props || {};
    const action = objectProps(props.action);
    const command = firstNonEmptyString(props.command, props.commandId, action.command, action.target, action.type, node.commandId);
    if (!command) return [];
    return [{
      nodeId: node.id || "",
      kind: node.kind || "",
      command,
    }];
  }).sort((a, b) => `${a.nodeId}:${a.command}`.localeCompare(`${b.nodeId}:${b.command}`));
}

function readAuthorityWitnesses(nodes) {
  return nodes.flatMap(node => {
    const props = node.props || {};
    const freshness = objectProps(props.freshness);
    const state = firstNonEmptyString(props.authorityState, props.truthState, props.commandState, freshness.state);
    const owner = firstNonEmptyString(props.authorityOwner, props.owner, props.authority);
    const witnessRef = firstNonEmptyString(props.witnessRef, props.sourceId);
    const receiptRef = firstNonEmptyString(props.receiptRef, props.receiptId);
    if (!state && !owner && !witnessRef && !receiptRef) return [];
    return [{
      nodeId: node.id || "",
      kind: node.kind || "",
      state,
      owner,
      witnessRef,
      receiptRef,
    }];
  }).sort((a, b) => `${a.nodeId}:${a.state}`.localeCompare(`${b.nodeId}:${b.state}`));
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function objectProps(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function addCheck(checks, id, pass, detail) {
  checks.push({ id, pass, ...detail });
}

function summarize(fixtures, runtimes, plugins, providers, splitTargets) {
  return {
    totalFixtures: fixtures.length,
    passedFixtures: fixtures.filter(fixture => fixture.status === "pass").length,
    failedFixtures: fixtures.filter(fixture => fixture.status !== "pass").length,
    totalPlugins: plugins.length,
    healthyPlugins: plugins.filter(plugin => plugin.status === "incubating" || plugin.status === "external-owner-planned").length,
    totalProviders: providers.length,
    advertisedProviders: providers.filter(provider => provider.status === "advertised").length,
    failedProviders: providers.filter(provider => provider.status !== "advertised").length,
    totalRuntimes: runtimes.length,
    activeRuntimes: runtimes.filter(runtime => runtime.status === "active").length,
    pendingRuntimes: runtimes.filter(runtime => runtime.status !== "active").length,
    totalSplitTargets: splitTargets.length,
    readySplitTargets: splitTargets.filter(target => target.status === "ready-to-split").length,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Eve Parity Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Fixtures: ${report.summary.passedFixtures}/${report.summary.totalFixtures} passed`,
    `- Plugins: ${report.summary.healthyPlugins}/${report.summary.totalPlugins} declared`,
    `- Providers: ${report.summary.advertisedProviders}/${report.summary.totalProviders} advertised`,
    `- Runtimes: ${report.summary.activeRuntimes}/${report.summary.totalRuntimes} active`,
    `- Split targets: ${report.summary.readySplitTargets}/${report.summary.totalSplitTargets} ready`,
    "",
    "## Repo Strategy",
    "",
    `- Boundary rule: ${report.repoStrategy.boundaryRule || "not declared"}`,
    `- Incubation policy: ${report.repoStrategy.incubationPolicy || "not declared"}`,
    "",
    "## Conformance Packs",
    "",
    "| Pack | Owner | Exit |",
    "| --- | --- | --- |",
  ];

  for (const pack of report.conformancePacks || []) {
    lines.push(`| ${pack.id} | ${pack.ownerRepo || ""} | ${pack.exitCriteria || ""} |`);
  }

  lines.push(
    "",
    "## Responsive Cases",
    "",
    "| Case | Size |",
    "| --- | --- |",
  );

  for (const viewport of report.responsiveCases || []) {
    lines.push(`| ${viewport.id} | ${viewport.width} x ${viewport.height} |`);
  }

  lines.push(
    "",
    "## Fixtures",
    "",
    "| Fixture | Pack | Status | Provider | Components | Failed Checks |",
    "| --- | --- | --- | --- | ---: | --- |",
  );

  for (const fixture of report.fixtures) {
    const failed = fixture.checks.filter(check => !check.pass).map(check => check.id).join(", ") || "";
    lines.push(`| ${fixture.title} | ${fixture.pack} | ${fixture.status} | ${fixture.providerId} | ${fixture.componentCount} | ${failed} |`);
  }

  lines.push("", "## Fixture Commands", "", "| Fixture | Descriptors | References | Descriptor Errors |", "| --- | --- | --- | --- |");
  for (const fixture of report.fixtures) {
    const refs = fixture.commandReferences.map(reference => `${reference.nodeId}:${reference.command}`).join(", ");
    lines.push(`| ${fixture.title} | ${fixture.commands.join(", ")} | ${refs} | ${fixture.commandDescriptorErrors.join(", ")} |`);
  }

  lines.push("", "## Authority Witnesses", "", "| Fixture | States | Owners | Witness Refs | Receipt Refs |", "| --- | --- | --- | ---: | ---: |");
  for (const fixture of report.fixtures) {
    lines.push(`| ${fixture.title} | ${fixture.authorityStates.join(", ")} | ${fixture.authorityOwners.join(", ")} | ${fixture.witnessRefs.length} | ${fixture.receiptRefs.length} |`);
  }

  lines.push("", "## Fixture Metadata", "", "| Fixture | Metadata | Purpose | Errors |", "| --- | --- | --- | --- |");
  for (const fixture of report.fixtures) {
    lines.push(`| ${fixture.title} | ${fixture.metadataPath} | ${fixture.metadata?.purpose || ""} | ${fixture.metadataErrors.join(", ")} |`);
  }

  lines.push("", "## Plugins", "", "| Plugin | Status | Owner | ABI Fixture | Capabilities | Missing |", "| --- | --- | --- | --- | --- | --- |");
  for (const plugin of report.plugins || []) {
    const missing = [
      ...plugin.missingPaths,
      ...plugin.missingRequiredFixtures.map(id => `fixture:${id}`),
      ...plugin.missingIncubationFields.map(id => `metadata:${id}`),
      ...plugin.schemaErrors.map(id => `schema:${id}`),
      ...plugin.advertisementErrors.map(id => `advertisement:${id}`),
      ...plugin.abiErrors.map(id => `abi:${id}`),
    ].join(", ");
    lines.push(`| ${plugin.title || plugin.pluginId} | ${plugin.status} | ${plugin.ownerRepo} | ${plugin.abiFixturePath || ""} | ${plugin.capabilities.join(", ")} | ${missing} |`);
  }

  lines.push("", "## Providers", "", "| Provider | Status | Owner | Scenario | Receipt States | Surfaces | Commands | Witnesses | Missing |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const provider of report.providers || []) {
    const missing = [
      ...provider.missingPaths,
      ...provider.missingRequiredFixtures.map(id => `fixture:${id}`),
      ...provider.missingIncubationFields.map(id => `metadata:${id}`),
      ...provider.advertisementErrors.map(id => `advertisement:${id}`),
      ...provider.scenarioErrors.map(id => `scenario:${id}`),
      ...provider.missingSchemas.map(id => `schema:${id}`),
      ...provider.missingSurfaces.map(id => `surface:${id}`),
      ...provider.missingCommands.map(id => `command:${id}`),
    ].join(", ");
    lines.push(`| ${provider.title || provider.providerId} | ${provider.status} | ${provider.ownerRepo} | ${provider.scenarioId || ""} | ${provider.scenarioReceiptStates.join(", ")} | ${provider.surfaceIds.join(", ")} | ${provider.commandIds.join(", ")} | ${provider.witnessKinds.join(", ")} | ${missing} |`);
  }

  lines.push("", "## Runtimes", "", "| Runtime | Status | Owner | Capture | Command Smoke | Required Fixtures | Plugin Fixtures | Features | Plugin Gaps | Missing |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const runtime of report.runtimes) {
    const missing = [
      ...runtime.missingPaths,
      ...runtime.missingExternalPaths.map(id => `external:${id}`),
      ...runtime.missingSourceSymbols.map(id => `source:${id}`),
      ...runtime.missingExternalSourceSymbols.map(id => `external-source:${id}`),
      ...runtime.missingRequiredFixtures.map(id => `fixture:${id}`),
      ...runtime.missingRequiredFeatures.map(id => `feature:${id}`),
      ...runtime.commandTransportSmokeErrors.map(id => `command-smoke:${id}`),
      ...runtime.missingIncubationFields.map(id => `metadata:${id}`),
    ].join(", ");
    lines.push(`| ${runtime.title} | ${runtime.status} | ${runtime.ownerRepo} | ${runtime.capture?.status || "unknown"} | ${runtime.commandTransportSmoke?.schema || ""} | ${runtime.requiredFixtures.join(", ")} | ${runtime.pluginFixtures.join(", ")} | ${runtime.supportedFeatures.join(", ")} | ${runtime.pluginCapabilityGaps.join(", ")} | ${missing} |`);
  }

  lines.push("", "## Split Readiness", "", "| Target | Status | Owner | Runtimes | Blockers |", "| --- | --- | --- | --- | --- |");
  for (const target of report.splitTargets) {
    const runtimes = target.runtimes.map(runtimeId => `${runtimeId}:${target.runtimeStatuses[runtimeId] || "missing"}`).join(", ");
    lines.push(`| ${target.id} | ${target.status} | ${target.ownerRepo} | ${runtimes} | ${target.blockers.join("<br>")} |`);
  }

  lines.push("", "## Runtime Notes", "");
  for (const runtime of report.runtimes) {
    if (runtime.capture?.note) lines.push(`- ${runtime.title}: ${runtime.capture.note}`);
    if (runtime.adapterSpike) lines.push(`- ${runtime.title} adapter: ${runtime.adapterSpike}`);
    if (runtime.demotionReason) lines.push(`- ${runtime.title} demotion: ${runtime.demotionReason}`);
    for (const criterion of runtime.activationCriteria || []) {
      lines.push(`- ${runtime.title} activation: ${criterion}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
