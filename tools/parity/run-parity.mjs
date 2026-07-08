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
const runtimeResults = await Promise.all(manifest.runtimes.map(runtime => evaluateRuntime(runtime, fixtureResults)));
const report = {
  schema: "gamecult.eve.parity_report.v1",
  generatedAt: new Date().toISOString(),
  manifest: path.relative(repoRoot, manifestPath).replaceAll("\\", "/"),
  repoStrategy: manifest.repoStrategy || {},
  conformancePacks: manifest.conformancePacks || [],
  responsiveCases: manifest.responsiveCases || [],
  summary: summarize(fixtureResults, runtimeResults, pluginResults),
  fixtures: fixtureResults,
  plugins: pluginResults,
  runtimes: runtimeResults,
};

await writeFile(path.join(runDirectory, "parity-report.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(runDirectory, "parity-report.md"), renderMarkdown(report));
await writeFile(path.join(outputRoot, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(outputRoot, "latest.md"), renderMarkdown(report));

console.log(`Parity report: ${path.relative(repoRoot, path.join(runDirectory, "parity-report.md"))}`);
if (report.summary.failedFixtures > 0) process.exitCode = 1;

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
  const requiredFixtures = runtime.requiredFixtures || [];
  const missingRequiredFixtures = requiredFixtures.filter(id => !fixtureResults.some(fixture => fixture.id === id && fixture.status === "pass"));
  const supportedFeatures = runtime.supportedFeatures || [];
  const supportedPlugins = runtime.supportedPlugins || [];
  const missingRequiredFeatures = [];
  if (requiredFixtures.includes("embedded-surface") && !supportedFeatures.includes("embeddedDocuments")) {
    missingRequiredFeatures.push("embeddedDocuments");
  }
  const missingIncubationFields = requiredIncubationFields(runtime).filter(field => !runtime[field]);
  const pluginCapabilityGaps = collectPluginCapabilityGaps(runtime, fixtureResults);
  let status = runtime.kind === "active" ? "active" : "pending";
  if (missingPaths.length) status = "missing-body";
  if (runtime.kind === "active" && missingSourceSymbols.length) status = "missing-source-symbol";
  if (runtime.kind === "active" && missingRequiredFixtures.length) status = "missing-required-fixture";
  if (runtime.kind === "active" && missingRequiredFeatures.length) status = "missing-required-feature";
  if (runtime.kind === "active" && missingIncubationFields.length) status = "missing-incubation-metadata";
  if (runtime.kind === "active" && pluginCapabilityGaps.length && status === "active") status = "active-with-capability-gaps";
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
    expectedSourceSymbols,
    missingSourceSymbols,
    requiredFixtures,
    pluginFixtures: runtime.pluginFixtures || [],
    missingRequiredFixtures,
    supportedFeatures,
    supportedPlugins,
    missingRequiredFeatures,
    ownerRepo: runtime.ownerRepo || "",
    repoRole: runtime.repoRole || "",
    graduationTrigger: runtime.graduationTrigger || "",
    splitTarget: runtime.splitTarget || "",
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
  const status = missingPaths.length
    ? "missing-body"
    : missingRequiredFixtures.length
      ? "missing-required-fixture"
      : missingIncubationFields.length
        ? "missing-incubation-metadata"
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
    expectedPaths,
    missingPaths,
    missingIncubationFields,
    status,
  };
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

function summarize(fixtures, runtimes, plugins) {
  return {
    totalFixtures: fixtures.length,
    passedFixtures: fixtures.filter(fixture => fixture.status === "pass").length,
    failedFixtures: fixtures.filter(fixture => fixture.status !== "pass").length,
    totalPlugins: plugins.length,
    healthyPlugins: plugins.filter(plugin => plugin.status === "incubating" || plugin.status === "external-owner-planned").length,
    totalRuntimes: runtimes.length,
    activeRuntimes: runtimes.filter(runtime => runtime.status === "active").length,
    pendingRuntimes: runtimes.filter(runtime => runtime.status !== "active").length,
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
    `- Runtimes: ${report.summary.activeRuntimes}/${report.summary.totalRuntimes} active`,
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

  lines.push("", "## Plugins", "", "| Plugin | Status | Owner | Capabilities | Missing |", "| --- | --- | --- | --- | --- |");
  for (const plugin of report.plugins || []) {
    const missing = [
      ...plugin.missingPaths,
      ...plugin.missingRequiredFixtures.map(id => `fixture:${id}`),
      ...plugin.missingIncubationFields.map(id => `metadata:${id}`),
    ].join(", ");
    lines.push(`| ${plugin.title || plugin.pluginId} | ${plugin.status} | ${plugin.ownerRepo} | ${plugin.capabilities.join(", ")} | ${missing} |`);
  }

  lines.push("", "## Runtimes", "", "| Runtime | Status | Owner | Capture | Required Fixtures | Plugin Fixtures | Features | Plugin Gaps | Missing |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const runtime of report.runtimes) {
    const missing = [
      ...runtime.missingPaths,
      ...runtime.missingSourceSymbols.map(id => `source:${id}`),
      ...runtime.missingRequiredFixtures.map(id => `fixture:${id}`),
      ...runtime.missingRequiredFeatures.map(id => `feature:${id}`),
      ...runtime.missingIncubationFields.map(id => `metadata:${id}`),
    ].join(", ");
    lines.push(`| ${runtime.title} | ${runtime.status} | ${runtime.ownerRepo} | ${runtime.capture?.status || "unknown"} | ${runtime.requiredFixtures.join(", ")} | ${runtime.pluginFixtures.join(", ")} | ${runtime.supportedFeatures.join(", ")} | ${runtime.pluginCapabilityGaps.join(", ")} | ${missing} |`);
  }

  lines.push("", "## Runtime Notes", "");
  for (const runtime of report.runtimes) {
    if (runtime.capture?.note) lines.push(`- ${runtime.title}: ${runtime.capture.note}`);
  }

  return `${lines.join("\n")}\n`;
}
