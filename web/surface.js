import {
  createEveCommandIntent,
  emptyState,
  renderEveSurface,
} from "../packages/eve-browser-lowering/dist/index.js";
import { compileEveDsl } from "./eve-dsl.js";

const statusEl = document.querySelector("#status");
const app = document.querySelector("#app");
const surfaceId = document.querySelector("#surface-id");
const surfaceVersion = document.querySelector("#surface-version");
const providerSelect = document.querySelector("#provider-select");
const providerMeta = document.querySelector("#provider-meta");

let providers = [];
let currentProvider;
let liveHermodr = false;
let openProviderGeneration = 0;

providerSelect.addEventListener("change", () => {
  const provider = providers.find(candidate => candidate.providerId === providerSelect.value);
  if (provider) void openProvider(provider);
});

void bootProviders();

async function bootProviders() {
  providers = await loadHermodrProviders();
  if (providers.length) {
    liveHermodr = true;
  } else {
    providers = await Promise.all((await loadLocalProviderCatalog()).map(loadProviderAdvertisement));
  }
  providerSelect.replaceChildren(...providers.map(provider => {
    const option = document.createElement("option");
    option.value = provider.providerId;
    option.textContent = provider.title || provider.providerId;
    return option;
  }));
  const requestedProviderId = new URLSearchParams(location.search).get("provider");
  const firstProduct = providers.find(provider => provider.providerId === requestedProviderId || provider.aliases?.includes(requestedProviderId))
    || providers.find(provider => provider.providerId === "aetheria")
    || providers.find(provider => provider.providerId === "aetheria.main_menu.root")
    || providers.find(provider => provider.providerId === "aetheria.inventory.panel")
    || providers.find(provider => provider.providerId === "repixelizer")
    || providers[0];
  providerSelect.value = firstProduct.providerId;
  await openProvider(firstProduct);
}

async function loadLocalProviderCatalog() {
  const response = await fetch("./local-provider-catalog.json", { cache: "no-store" });
  const catalog = await response.json();
  return catalog.providers || [];
}

async function loadHermodrProviders() {
  try {
    const response = await fetch("/hermodr/verse/catalog", { cache: "no-store" });
    if (!response.ok) return [];
    const catalog = await response.json();
    const advertised = new Map();
    for (const provider of catalog.providers || []) {
      advertised.set(provider.id || provider.providerId, provider);
    }
    return (catalog.surfaces || [])
      .filter(surface => surface?.providerId && surface?.surface)
      .map(surface => {
        const provider = advertised.get(surface.providerId) || {};
        return {
          ...provider,
          providerId: surface.providerId,
          title: surface.title || provider.title || surface.providerId,
          kind: provider.kind || "eve.surface",
          freshness: { state: "odin-visible-cultmesh" },
          surfaces: [{
            transport: "hermodr-surface",
            surfaceId: surface.providerId,
            url: `/hermodr/surface/${encodeURIComponent(surface.providerId)}`,
          }],
        };
      });
  } catch {
    return [];
  }
}

async function loadProviderAdvertisement(provider) {
  if (!provider.advertisement) return provider;
  const response = await fetch(provider.advertisement);
  const advertisement = await response.json();
  return {
    ...advertisement,
    ...provider,
    surfaces: provider.surfaces || advertisement.surfaces || [],
    localAdvertisement: advertisement,
  };
}

async function openProvider(provider) {
  const generation = ++openProviderGeneration;
  currentProvider = provider;
  providerMeta.textContent = `${provider.kind || "provider"} | ${provider.providerId} | ${provider.freshness?.state || "unknown"}`;
  surfaceId.textContent = provider.providerId;
  surfaceVersion.textContent = "opening";
  const surface = provider.surfaces?.[0];
  if (!surface) {
    statusEl.textContent = `${provider.title || provider.providerId} has no advertised surface`;
    app.replaceChildren(emptyState("No advertised surface"));
    return;
  }

  if (surface.transport === "hermodr-surface") {
    try {
      const state = await fetchHermodrSurface(surface.url);
      if (generation !== openProviderGeneration) return;
      renderSurface(state, "hermodr cultmesh");
    } catch (error) {
      if (generation !== openProviderGeneration) return;
      statusEl.textContent = `${provider.title || provider.providerId} failed to load`;
      surfaceVersion.textContent = "error";
      app.replaceChildren(emptyState(error instanceof Error ? error.message : String(error)));
    }
    return;
  }

  if (surface.transport === "local-eve-dsl") {
    const response = await fetch(surface.url);
    const state = compileEveDsl(await response.text());
    if (generation !== openProviderGeneration) return;
    renderSurface(state, "local dsl");
    return;
  }

  const response = await fetch(surface.url);
  const state = await response.json();
  if (generation !== openProviderGeneration) return;
  renderSurface(state, "local fixture");
}

async function fetchHermodrSurface(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const state = await response.json().catch(() => ({}));
      if (!response.ok || state?.ok === false) {
        throw new Error(state?.error || `Hermodr surface request failed with HTTP ${response.status}`);
      }
      if (!state?.surface?.root) {
        throw new Error("Hermodr returned a surface document without a root.");
      }
      return state;
    } catch (error) {
      lastError = error;
      await delay(250 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function renderSurface(state, source) {
  surfaceId.textContent = state.providerId || "surface unknown";
  surfaceVersion.textContent = `v${state.version ?? "?"}`;
  const providerId = state.providerId || currentProvider?.providerId || "";
  renderEveSurface(state, app, {
    body: document.body,
    clientId: liveHermodr ? "hermodr.browser" : "browser.reference",
    commandSink: publishCommandIntent,
    documentResolver: liveHermodr ? createHermodrDocumentResolver(providerId) : undefined,
    assetUrlResolver: liveHermodr ? resolveHermodrAssetUrl : undefined,
    provider: currentProvider,
    source,
    statusElement: statusEl,
  });
}

function createHermodrDocumentResolver(providerId) {
  return async function resolveHermodrDocument(request) {
    if (!providerId) return undefined;
    const params = new URLSearchParams();
    params.set("documentId", request.documentId);
    if (request.schemaId) params.set("schemaId", request.schemaId);
    if (request.slotId) params.set("slotId", request.slotId);
    const response = await fetch(`/hermodr/document/${encodeURIComponent(providerId)}?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  };
}

function resolveHermodrAssetUrl(uri) {
  if (/^(cultmesh:\/\/|resources:\/\/)/i.test(uri)) {
    return `/cultmesh-cdn/${encodeURIComponent(uri)}`;
  }
  return uri;
}

async function publishCommandIntent(intent, component) {
  const props = component?.props || {};
  const command = intent.command
    ? intent
    : createEveCommandIntent(props.command || props.commandId || "invoke", props, {
      clientId: "browser.reference",
      provider: currentProvider,
    });
  statusEl.textContent = `command ${command.command}`;
  if (!liveHermodr) {
    console.info("Eve command intent", command);
    return;
  }
  const response = await fetch("/hermodr/commands/eve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  const receipt = await response.json().catch(() => ({}));
  if (!response.ok || receipt.ok === false) {
    statusEl.textContent = `command failed ${command.command}`;
    console.error("Eve command failed", receipt);
    return;
  }
  statusEl.textContent = `command accepted ${command.command}`;
  console.info("Eve command receipt", receipt);
}
