import { renderEveSurface } from "../packages/eve-browser-lowering/dist/index.js";
import { compileEveDsl } from "./eve-dsl.js";
import { findProviderCatalogEntry, mergeProviderAdvertisement } from "./provider-advertisements.mjs";

const app = document.querySelector("#app");
const output = document.querySelector("#eve-layout-probe-output");
const params = new URLSearchParams(location.search);
const providerId = params.get("provider") || "gamecult.eve.embedded-demo";
const fixtureId = params.get("fixture") || providerId;

try {
  const provider = await loadProvider(providerId);
  const surfaceEntry = provider.surfaces?.[0];
  if (!surfaceEntry) throw new Error(`${providerId} has no advertised surface`);
  const state = await loadSurface(surfaceEntry);
  renderEveSurface(state, app, {
    activeSurfaceId: state.surface?.id,
    body: document.body,
    clientId: "browser.reference.layout-probe",
    provider,
    source: "web layout probe",
  });
  await animationFrame();
  await animationFrame();
  publishProbe(measureLayout(state, provider, fixtureId));
} catch (error) {
  publishProbe({
    schema: "gamecult.eve.web_layout_probe.v1",
    runtimeId: "web",
    providerId,
    surfaceId: "",
    fixtureId,
    generatedAt: new Date().toISOString(),
    viewport: { width: window.innerWidth, height: window.innerHeight },
    summary: { nodeCount: 0, measuredNodeCount: 0, zeroAreaCount: 0 },
    nodes: [],
    error: error instanceof Error ? error.message : String(error),
  });
}

async function loadProvider(requestedProviderId) {
  const response = await fetch("./local-provider-catalog.json", { cache: "no-store" });
  const catalog = await response.json();
  const provider = findProviderCatalogEntry(catalog, requestedProviderId);
  if (!provider) throw new Error(`Unknown local provider: ${requestedProviderId}`);
  if (!provider.advertisement) return provider;
  const advertisement = await (await fetch(provider.advertisement, { cache: "no-store" })).json();
  return mergeProviderAdvertisement(provider, advertisement);
}

async function loadSurface(surface) {
  const response = await fetch(surface.url, { cache: "no-store" });
  const source = await response.text();
  if (surface.transport === "local-eve-dsl") return compileEveDsl(source);
  if (surface.transport === "local-json") return JSON.parse(source);
  throw new Error(`Unsupported probe surface transport: ${surface.transport}`);
}

function measureLayout(state, provider, fixture) {
  const nodes = [...document.querySelectorAll("[data-eve-node-id]")].map(element => {
    const rect = element.getBoundingClientRect();
    return {
      nodeId: element.dataset.eveNodeId || "",
      kind: element.dataset.eveKind || "",
      rect: {
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
      },
    };
  }).filter(node => node.nodeId && node.kind);
  const measuredNodeCount = nodes.filter(node => node.rect.width > 0 && node.rect.height > 0).length;
  return {
    schema: "gamecult.eve.web_layout_probe.v1",
    runtimeId: "web",
    providerId: state.providerId || provider.providerId || providerId,
    surfaceId: state.surface?.id || "",
    fixtureId: fixture,
    generatedAt: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    summary: {
      nodeCount: nodes.length,
      measuredNodeCount,
      zeroAreaCount: nodes.length - measuredNodeCount,
    },
    nodes,
  };
}

function publishProbe(probeDocument) {
  output.textContent = JSON.stringify(probeDocument, null, 2);
  document.body?.setAttribute?.("data-probe-ready", "true");
}

function animationFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function round(value) {
  return Math.round(value * 100) / 100;
}
