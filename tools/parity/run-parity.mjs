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

const runtimeResults = manifest.runtimes.map(evaluateRuntime);
const report = {
  schema: "gamecult.eve.parity_report.v1",
  generatedAt: new Date().toISOString(),
  manifest: path.relative(repoRoot, manifestPath).replaceAll("\\", "/"),
  summary: summarize(fixtureResults, runtimeResults),
  fixtures: fixtureResults,
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

  return {
    id: fixture.id,
    title: fixture.title,
    status: checks.every(check => check.pass) ? "pass" : "fail",
    durationMs: Date.now() - startedAt,
    providerId: state.providerId,
    componentCount: nodes.length,
    kindCounts,
    styleTokens: tokenNames,
    controlSkins: skinNames,
    controlParts: controlPartNames,
    bindings,
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

function evaluateRuntime(runtime) {
  const expectedPaths = runtime.expectedPaths || [];
  const missingPaths = expectedPaths.filter(candidate => !existsSync(path.join(repoRoot, candidate)));
  let status = runtime.kind === "active" ? "active" : "pending";
  if (missingPaths.length) status = "missing-body";
  if (runtime.id === "web") status = "active";
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
    capture: runtime.capture,
  };
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

function summarize(fixtures, runtimes) {
  return {
    totalFixtures: fixtures.length,
    passedFixtures: fixtures.filter(fixture => fixture.status === "pass").length,
    failedFixtures: fixtures.filter(fixture => fixture.status !== "pass").length,
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
    `- Runtimes: ${report.summary.activeRuntimes}/${report.summary.totalRuntimes} active`,
    "",
    "## Fixtures",
    "",
    "| Fixture | Status | Provider | Components | Failed Checks |",
    "| --- | --- | --- | ---: | --- |",
  ];

  for (const fixture of report.fixtures) {
    const failed = fixture.checks.filter(check => !check.pass).map(check => check.id).join(", ") || "";
    lines.push(`| ${fixture.title} | ${fixture.status} | ${fixture.providerId} | ${fixture.componentCount} | ${failed} |`);
  }

  lines.push("", "## Runtimes", "", "| Runtime | Status | Capture | Missing Paths |", "| --- | --- | --- | --- |");
  for (const runtime of report.runtimes) {
    lines.push(`| ${runtime.title} | ${runtime.status} | ${runtime.capture?.status || "unknown"} | ${runtime.missingPaths.join(", ")} |`);
  }

  lines.push("", "## Runtime Notes", "");
  for (const runtime of report.runtimes) {
    if (runtime.capture?.note) lines.push(`- ${runtime.title}: ${runtime.capture.note}`);
  }

  return `${lines.join("\n")}\n`;
}
