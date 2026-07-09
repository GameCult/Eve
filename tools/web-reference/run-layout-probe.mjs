import { createServer } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync, readFile as readFileCallback } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || 8892);
const debugPort = Number(args.debugPort || 18892);
const providerId = args.provider || "gamecult.eve.embedded-demo";
const fixtureId = args.fixture || "embedded-surface";
const width = Number(args.width || 1280);
const height = Number(args.height || 720);
const outputPath = path.resolve(repoRoot, args.output || `artifacts/web-reference-layout-probe/latest/${fixtureId}.json`);

const server = createStaticServer(repoRoot);
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
const profile = await mkdtemp(path.join(os.tmpdir(), "eve-web-layout-probe-"));

try {
  const url = `http://127.0.0.1:${port}/web/layout-probe.html?provider=${encodeURIComponent(providerId)}&fixture=${encodeURIComponent(fixtureId)}`;
  const probe = await runChromeProbe(url, profile);
  if (probe.error) throw new Error(probe.error);
  if (probe.schema !== "gamecult.eve.web_layout_probe.v1") throw new Error(`Unexpected probe schema: ${probe.schema || ""}`);
  if (probe.runtimeId !== "web") throw new Error(`Unexpected probe runtime: ${probe.runtimeId || ""}`);
  if (probe.providerId !== providerId) throw new Error(`Unexpected probe provider: ${probe.providerId || ""}`);
  if (probe.fixtureId !== fixtureId) throw new Error(`Unexpected probe fixture: ${probe.fixtureId || ""}`);
  if (!probe.summary?.measuredNodeCount) throw new Error("Web layout probe measured no node boxes.");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(probe, null, 2)}\n`);
  console.log(outputPath);
} finally {
  server.close();
  await rm(profile, { recursive: true, force: true });
}

function createStaticServer(root) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".eve": "text/plain; charset=utf-8",
  };
  return createServer((request, response) => {
    const urlPath = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    const clean = urlPath === "/" ? "/web/index.html" : urlPath;
    const file = path.normalize(path.join(root, clean));
    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }
    readFileCallback(file, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("not found");
        return;
      }
      response.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
      response.end(data);
    });
  });
}

async function runChromeProbe(url, profile) {
  const chrome = findChrome();
  const child = spawn(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    url,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  let closed = false;
  child.stderr.on("data", chunk => { stderr += chunk; });
  child.once("close", () => { closed = true; });
  try {
    const target = await waitForPageTarget(url);
    const client = await connectCdp(target.webSocketDebuggerUrl);
    try {
      await client.send("Runtime.enable");
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const ready = await client.send("Runtime.evaluate", {
          expression: "document.body?.dataset.probeReady === 'true'",
          returnByValue: true,
        });
        if (ready.result?.value === true) break;
        await delay(100);
      }
      const result = await client.send("Runtime.evaluate", {
        expression: "document.querySelector('#eve-layout-probe-output')?.textContent || ''",
        returnByValue: true,
      });
      const text = result.result?.value || "";
      if (!text.trim()) throw new Error("Chrome layout probe produced an empty output document.");
      return JSON.parse(text);
    } finally {
      client.close();
    }
  } finally {
    if (!closed) {
      child.kill();
      await new Promise(resolve => child.once("close", resolve));
    }
    if (stderr && process.env.EVE_DEBUG_WEB_LAYOUT_PROBE) process.stderr.write(stderr);
  }
}

async function waitForPageTarget(url) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
      const targets = await response.json();
      const target = targets.find(candidate => candidate.type === "page" && candidate.url === url)
        || targets.find(candidate => candidate.type === "page" && candidate.url?.includes("/web/layout-probe.html"));
      if (target?.webSocketDebuggerUrl) return target;
    } catch {
      // Chrome is still booting.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for Chrome DevTools target on port ${debugPort}.`);
}

function connectCdp(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    let nextId = 1;
    const pending = new Map();
    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((messageResolve, messageReject) => {
            pending.set(id, { resolve: messageResolve, reject: messageReject });
          });
        },
        close() {
          socket.close();
        },
      });
    });
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const callbacks = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callbacks.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else callbacks.resolve(message.result || {});
    });
    socket.addEventListener("error", reject);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    path.join(process.env.ProgramFiles || "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const chrome = candidates.find(candidate => existsSync(candidate));
  if (!chrome) throw new Error("Chrome is required for the web layout probe and was not found.");
  return chrome;
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith("--")) continue;
    parsed[key.slice(2)] = values[index + 1];
    index += 1;
  }
  return parsed;
}
