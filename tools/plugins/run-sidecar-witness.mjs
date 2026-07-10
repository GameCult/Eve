import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { performance } from "node:perf_hooks";

const options = parseArguments(process.argv.slice(2));
const advertisement = parseJson(await readFile(options.advertisement, "utf8"));
const fixture = parseJson(await readFile(options.fixture, "utf8"));
validateInputs(advertisement, fixture, options);

const started = performance.now();
const child = spawn(options.command, options.commandArgs, {
  cwd: options.cwd,
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});
const lines = readline.createInterface({ input: child.stdout });
const responses = [];
const waiters = [];
lines.on("line", line => {
  const waiter = waiters.shift();
  if (!waiter) return;
  try { waiter.resolve(parseJson(line)); } catch (error) { waiter.reject(error); }
});
let stderr = "";
child.stderr.on("data", chunk => { stderr += chunk.toString(); });

try {
  for (const [index, operation] of fixture.operations.entries()) {
    const requestId = `${fixture.fixtureId}:${operation.operation}:${index}`;
    const request = {
      schema: fixture.requestSchema,
      pluginId: fixture.pluginId,
      operation: operation.operation,
      requestId,
      input: operation.input || {},
      context: { witnessId: options.witnessId },
      targetRuntime: "eve-plugin-witness",
    };
    const operationStarted = performance.now();
    const responsePromise = nextResponse(options.timeoutMs);
    child.stdin.write(`${JSON.stringify(request)}\n`);
    const response = await responsePromise;
    validateResponse(response, request, operation.expect || {});
    responses.push({
      operation: operation.operation,
      requestId,
      status: response.status,
      durationMs: round(performance.now() - operationStarted),
      expectationCount: Object.keys(operation.expect || {}).length,
    });
  }
} finally {
  child.stdin.end();
  await Promise.race([new Promise(resolve => child.once("exit", resolve)), delay(1000)]);
  if (child.exitCode === null) child.kill();
  lines.close();
}

const witness = {
  schema: "gamecult.eve.plugin_witness.v1",
  witnessId: options.witnessId,
  pluginId: fixture.pluginId,
  ownerRepo: fixture.ownerRepo,
  status: "pass",
  transport: advertisement.runtime?.sidecar?.protocol || advertisement.runtime?.transports?.[0] || "",
  generatedAtUtc: new Date().toISOString(),
  durationMs: round(performance.now() - started),
  operations: responses,
  advertisementPath: slash(path.relative(options.cwd, options.advertisement)),
  fixturePath: slash(path.relative(options.cwd, options.fixture)),
  executable: {
    artifact: advertisement.runtime?.sidecar?.launch?.artifact || "",
    command: advertisement.runtime?.sidecar?.launch?.command || path.basename(options.command),
  },
  diagnostics: stderr.trim() ? [stderr.trim()] : [],
  authority: "plugin-sidecar-owns-semantic-projection-and-proposes-state-provider-retains-acceptance",
};
await mkdir(path.dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(witness, null, 2)}\n`);
console.log(options.output);

function nextResponse(timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Plugin sidecar response timed out after ${timeoutMs}ms.`)), timeoutMs);
    waiters.push({
      resolve: value => { clearTimeout(timer); resolve(value); },
      reject: error => { clearTimeout(timer); reject(error); },
    });
  });
}

function validateInputs(advertisement, fixture, options) {
  if (advertisement.schema !== "gamecult.eve.plugin_advertisement.v1") throw new Error("Plugin advertisement schema is invalid.");
  if (fixture.schema !== "gamecult.eve.plugin_abi_fixture.v1") throw new Error("Plugin ABI fixture schema is invalid.");
  if (advertisement.pluginId !== fixture.pluginId) throw new Error("Plugin advertisement and fixture ids differ.");
  if (!advertisement.runtime?.sidecar?.operations?.length) throw new Error("Plugin advertisement has no sidecar operations.");
  for (const operation of fixture.operations || []) {
    if (!advertisement.runtime.sidecar.operations.includes(operation.operation)) throw new Error(`Operation ${operation.operation} is not advertised.`);
  }
  if (!options.command) throw new Error("Plugin sidecar command is required.");
}

function validateResponse(response, request, expect) {
  for (const [field, value] of Object.entries({
    schema: "gamecult.eve.plugin_abi.response.v1",
    pluginId: request.pluginId,
    operation: request.operation,
    requestId: request.requestId,
    status: "accepted",
  })) {
    if (response?.[field] !== value) throw new Error(`${request.operation} response ${field}: expected ${value}, got ${response?.[field] || ""}`);
  }
  assertSubset(response.output, expect, request.operation);
}

function assertSubset(actual, expected, label) {
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (key === "measurementOutputs") {
      for (const outputKey of expectedValue) if (!(outputKey in (actual || {}))) throw new Error(`${label} output missing ${outputKey}.`);
      continue;
    }
    const actualValue = actual?.[key];
    if (Array.isArray(expectedValue)) {
      if (!Array.isArray(actualValue) || expectedValue.some(value => !actualValue.includes(value))) throw new Error(`${label} output ${key} does not include expected values.`);
    } else if (expectedValue && typeof expectedValue === "object") {
      assertSubset(actualValue, expectedValue, `${label}.${key}`);
    } else if (actualValue !== expectedValue) {
      throw new Error(`${label} output ${key}: expected ${expectedValue}, got ${actualValue}.`);
    }
  }
}

function parseArguments(args) {
  const values = { commandArgs: [], timeoutMs: 5000 };
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (key === "--") { values.commandArgs = args.slice(index + 1); break; }
    const value = args[++index];
    if (!value) throw new Error(`Missing value for ${key}.`);
    if (key === "--advertisement") values.advertisement = path.resolve(value);
    else if (key === "--fixture") values.fixture = path.resolve(value);
    else if (key === "--output") values.output = path.resolve(value);
    else if (key === "--witness-id") values.witnessId = value;
    else if (key === "--cwd") values.cwd = path.resolve(value);
    else if (key === "--command") values.command = value;
    else if (key === "--timeout-ms") values.timeoutMs = Number(value);
    else throw new Error(`Unknown option ${key}.`);
  }
  values.cwd ||= process.cwd();
  for (const field of ["advertisement", "fixture", "output", "witnessId", "command"]) if (!values[field]) throw new Error(`Missing --${field.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}.`);
  return values;
}

function parseJson(value) { return JSON.parse(value.replace(/^\uFEFF/, "")); }
function round(value) { return Math.round(value * 1000) / 1000; }
function slash(value) { return value.replaceAll("\\", "/"); }
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
