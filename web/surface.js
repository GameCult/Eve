import {
  createEveCommandIntent,
  emptyState,
  renderEveSurface,
  resolveRequiredPluginAdapters,
} from "../packages/eve-browser-lowering/dist/index.js";
import { compileEveDsl } from "./eve-dsl.js";
import { mergeProviderAdvertisement } from "./provider-advertisements.mjs";
import {
  createHermodrProviderTargets,
  selectInitialProviderTarget,
} from "./hermodr-provider-catalog.mjs";

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
let providerRetryTimer;

providerSelect.addEventListener("change", () => {
  const provider = providers.find(candidate => (candidate.targetId || candidate.providerId) === providerSelect.value);
  if (provider) void openProvider(provider);
});

void bootProviders();

async function bootProviders() {
  clearTimeout(providerRetryTimer);
  let liveProviders = [];
  try {
    liveProviders = await loadHermodrProviders();
  } catch {
    // The fallback below is deliberately visible; a failed live catalog must not strand the renderer at boot.
  }

  liveHermodr = liveProviders.length > 0;
  try {
    providers = liveHermodr
      ? liveProviders
      : await Promise.all((await loadLocalProviderCatalog()).map(loadProviderAdvertisement));
  } catch (error) {
    showProviderLoadFailure(error);
    providerRetryTimer = setTimeout(() => void bootProviders(), 3_000);
    return;
  }

  if (!providers.length) {
    showProviderLoadFailure(new Error("No provider targets are currently visible."));
    providerRetryTimer = setTimeout(() => void bootProviders(), 3_000);
    return;
  }

  providerSelect.disabled = false;
  providerSelect.replaceChildren(...providers.map(provider => {
    const option = document.createElement("option");
    option.value = provider.targetId || provider.providerId;
    option.textContent = provider.title || provider.providerId;
    return option;
  }));
  const params = new URLSearchParams(location.search);
  const requestedProviderId = params.get("surface") || params.get("provider") || "";
  const firstProduct = liveHermodr
    ? selectInitialProviderTarget(providers, requestedProviderId)
    : providers.find(provider => provider.providerId === requestedProviderId || provider.aliases?.includes(requestedProviderId)) || providers[0];
  providerSelect.value = firstProduct.targetId || firstProduct.providerId;
  await openProvider(firstProduct);

  if (!liveHermodr) {
    providerRetryTimer = setTimeout(() => void bootProviders(), 3_000);
  }
}

function showProviderLoadFailure(error) {
  const detail = error instanceof Error ? error.message : String(error);
  providerSelect.replaceChildren();
  providerSelect.disabled = true;
  providerMeta.textContent = "provider catalog unavailable; retrying";
  statusEl.textContent = "provider catalog unavailable";
  surfaceId.textContent = "surface none";
  surfaceVersion.textContent = "retrying";
  app.replaceChildren(emptyState(detail));
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
    return createHermodrProviderTargets(catalog);
  } catch {
    return [];
  }
}

async function loadProviderAdvertisement(provider) {
  if (!provider.advertisement) return provider;
  const response = await fetch(provider.advertisement);
  const advertisement = await response.json();
  return mergeProviderAdvertisement(provider, advertisement);
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
  const advertisedSurface = currentProvider?.surfaces?.find(candidate => candidate.surfaceId === state.surface?.id)
    || currentProvider?.surfaces?.[0]
    || {};
  const pluginAdapters = resolveRequiredPluginAdapters(advertisedSurface);
  renderEveSurface(state, app, {
    activeSurfaceId: state.surface?.id,
    body: document.body,
    clientId: liveHermodr ? "hermodr.browser" : "browser.reference",
    commandSink: publishCommandIntent,
    documentResolver: liveHermodr ? createHermodrDocumentResolver(providerId) : undefined,
    stateBindingResolver: liveHermodr ? createHermodrStateBindingResolver(providerId) : undefined,
    assetUrlResolver: liveHermodr ? resolveHermodrAssetUrl : undefined,
    provider: currentProvider,
    pluginAdapters,
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

function createHermodrStateBindingResolver(providerId) {
  const sources = new Map();
  return async function resolveHermodrStateBinding(binding) {
    const sourceKey = `${binding.schemaId}:${binding.sourceId}`;
    let source = sources.get(sourceKey);
    if (!source) {
      const params = new URLSearchParams({ sourceId: binding.sourceId, schemaId: binding.schemaId });
      const stream = new EventSource(`/hermodr/state/${encodeURIComponent(providerId)}?${params}`);
      source = { stream, value: undefined, ready: [], watchers: new Set(), references: 0 };
      sources.set(sourceKey, source);
      stream.addEventListener("state", event => {
        const update = JSON.parse(event.data);
        if (update?.state === "stale" || update?.value === undefined) return;
        source.value = update.value;
        for (const resolve of source.ready.splice(0)) resolve(update.value);
        for (const callback of source.watchers) callback(update.value);
      });
      stream.addEventListener("stale", event => {
        const detail = JSON.parse(event.data || "{}");
        statusEl.textContent = detail.message || `${providerId} state is stale`;
      });
    }
    source.references += 1;
    const select = document => binding.pointerId.split(".").filter(Boolean)
      .reduce((value, segment) => value == null ? undefined : value[segment], document);
    return {
      latest() {
        if (source.value !== undefined) return Promise.resolve(select(source.value));
        return new Promise(resolve => source.ready.push(value => resolve(select(value))));
      },
      watch(callback) {
        const project = value => callback(select(value));
        source.watchers.add(project);
        return () => {
          source.watchers.delete(project);
          source.references -= 1;
          if (source.references <= 0) {
            source.stream.close();
            sources.delete(sourceKey);
          }
        };
      },
    };
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
  if (
    receipt.schema !== "gamecult.eve.command_receipt.v1" ||
    !receipt.commandId ||
    receipt.command !== command.command ||
    receipt.state !== "reconciled"
  ) {
    statusEl.textContent = `command failed ${command.command}`;
    console.error("Eve command returned no correlated provider receipt", receipt);
    return;
  }
  statusEl.textContent = `command ${receipt.state} ${command.command}`;
  console.info("Eve command receipt", receipt);
}
