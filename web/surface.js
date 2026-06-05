import { compileEveDsl } from "./eve-dsl.js";

const statusEl = document.querySelector("#status");
const app = document.querySelector("#app");
const surfaceId = document.querySelector("#surface-id");
const surfaceVersion = document.querySelector("#surface-version");
const providerSelect = document.querySelector("#provider-select");
const providerMeta = document.querySelector("#provider-meta");

let socket;
let providers = [];
let currentProvider;
let currentSurfaceStyles = {};

const defaultStyleTokens = {
  "--bg": "#020909",
  "--bg-top": "#020909",
  "--bg-mid": "#020909",
  "--bg-bottom": "#020909",
  "--shell-top": "#010707",
  "--shell-bottom": "#010707",
  "--panel": "#071918",
  "--panel-2": "#0a2423",
  "--line": "rgba(103, 240, 228, 0.28)",
  "--line-deep": "rgba(103, 240, 228, 0.18)",
  "--text": "#e7f1f1",
  "--text-bright": "#e7f1f1",
  "--quiet": "#8ba5a3",
  "--accent": "#ffb84f",
  "--accent-strong": "#ffb84f",
  "--corner-accent": "#ffb84f",
  "--cyan": "#8efcff",
  "--shadow": "rgba(0, 0, 0, 0.35)",
  "--pixel-grid": "rgba(142, 252, 255, 0.04)",
  "--border-width": "1px",
  "--border-bottom-width": "1px",
  "--corner-accent-size": "0",
  "--font-body": "Inter, Segoe UI, system-ui, sans-serif",
  "--font-title": "Cascadia Mono, Consolas, monospace",
  "--font-mono": "Cascadia Mono, Consolas, monospace",
};

const localProviders = [
  {
    providerId: "voidbot.swarm",
    title: "VoidBot Live",
    kind: "service.operator",
    freshness: { state: "live" },
    surfaces: [{ transport: "mimir-eve-deck", surfaceId: "voidbot.swarm" }],
  },
  {
    providerId: "repixelizer",
    title: "Repixelizer",
    kind: "service.product",
    advertisement: "./fixtures/repixelizer.provider-advertisement.json",
    surfaces: [{ transport: "local-json", surfaceId: "repixelizer.operator.surface", url: "./fixtures/repixelizer.eve-surface.json" }],
  },
  {
    providerId: "fensalir.direct2d",
    title: "Fensalir Direct2D",
    kind: "surface.renderer",
    freshness: { state: "fixture" },
    surfaces: [{ transport: "local-json", surfaceId: "fensalir.direct2d.fixture", url: "./fixtures/fensalir-client-surface.json" }],
  },
  {
    providerId: "sai.visual_novel",
    title: "Sai VN Surface",
    kind: "content.runtime",
    freshness: { state: "fixture" },
    surfaces: [{ transport: "local-json", surfaceId: "sai.visual_novel.surface", url: "./fixtures/sai-vn-surface.json" }],
  },
  {
    providerId: "cultcache.huginn.inspector",
    title: "Huginn .cc",
    kind: "inspection.huginn",
    freshness: { state: "fixture" },
    surfaces: [{ transport: "local-eve-dsl", surfaceId: "cultcache.huginn.inspector", url: "./fixtures/huginn-cc-surface.eve" }],
  },
  {
    providerId: "eve.reactive.dsl",
    title: "Reactive DSL",
    kind: "surface.fixture",
    freshness: { state: "fixture" },
    surfaces: [{ transport: "local-eve-dsl", surfaceId: "eve.reactive.dsl", url: "./fixtures/reactive-composition.eve" }],
  },
  {
    providerId: "eve.cultui.inspector",
    title: "CultUI Inspector",
    kind: "surface.fixture",
    freshness: { state: "fixture" },
    surfaces: [{ transport: "local-eve-dsl", surfaceId: "eve.cultui.inspector", url: "./fixtures/cultui-slider-inspector.eve" }],
  },
];

providerSelect.addEventListener("change", () => {
  const provider = providers.find(candidate => candidate.providerId === providerSelect.value);
  if (provider) void openProvider(provider);
});

void bootProviders();

async function bootProviders() {
  providers = await Promise.all(localProviders.map(loadProviderAdvertisement));
  providerSelect.replaceChildren(...providers.map(provider => {
    const option = document.createElement("option");
    option.value = provider.providerId;
    option.textContent = provider.title || provider.providerId;
    return option;
  }));
  const firstProduct = providers.find(provider => provider.providerId === "repixelizer") || providers[0];
  providerSelect.value = firstProduct.providerId;
  await openProvider(firstProduct);
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
  closeSocket();
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

  if (surface.transport === "mimir-eve-deck") {
    openVoidBot(provider);
    return;
  }

  if (surface.transport === "local-eve-dsl") {
    const response = await fetch(surface.url);
    renderSurface(compileEveDsl(await response.text()), "local dsl");
    return;
  }

  const response = await fetch(surface.url);
  renderSurface(await response.json(), "local fixture");
}

function openVoidBot(provider) {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  const host = location.hostname || "127.0.0.1";
  const url = `${scheme}//${host}:8795/eve/deck`;
  statusEl.textContent = `connecting ${url}`;
  socket = new WebSocket(url);
  const activeSocket = socket;
  socket.addEventListener("open", () => {
    if (socket !== activeSocket) return;
    statusEl.textContent = "connected to Mimir Eve broker";
    activeSocket.send(JSON.stringify({ type: "open-provider", providerId: provider.providerId }));
  });
  socket.addEventListener("message", event => {
    if (socket !== activeSocket) return;
    const state = JSON.parse(event.data);
    if (state.providerId === "voidbot.swarm") {
      renderSurface(state, "live");
    }
  });
  socket.addEventListener("close", () => {
    if (socket !== activeSocket) return;
    statusEl.textContent = "Mimir broker disconnected";
  });
  socket.addEventListener("error", () => {
    if (socket !== activeSocket) return;
    statusEl.textContent = "Mimir broker error; is port 8795 running?";
  });
}

function closeSocket() {
  if (socket) {
    socket.close();
    socket = undefined;
  }
}

function renderSurface(state, source) {
  window.__eveCurrentMesh = state.mesh;
  currentSurfaceStyles = state.surface?.styles || {};
  surfaceId.textContent = state.providerId || "surface unknown";
  surfaceVersion.textContent = `v${state.version ?? "?"}`;
  statusEl.textContent = `${state.title || "surface"} (${source})`;
  applySurfaceStyles(state.surface?.styles);
  document.body.dataset.provider = state.providerId || currentProvider?.providerId || "";
  if (state.surface?.root) {
    app.replaceChildren(renderCultComponent(state.surface.root));
  } else if (state.providerId === "voidbot.swarm") {
    renderVoidBot(state);
  } else {
    renderGraphSurface(state);
  }
}

function applySurfaceStyles(styles) {
  const tokens = styles?.tokens || {};
  const root = document.documentElement.style;
  for (const [variable, value] of Object.entries(defaultStyleTokens)) {
    root.setProperty(variable, value);
  }
  const map = {
    colorBackground: "--bg",
    colorBackgroundTop: "--bg-top",
    colorBackgroundMid: "--bg-mid",
    colorBackgroundBottom: "--bg-bottom",
    colorShellSurfaceTop: "--shell-top",
    colorShellSurfaceBottom: "--shell-bottom",
    colorPanel: "--panel",
    colorPanelAlt: "--panel-2",
    colorPanelBorder: "--line",
    colorPanelBorderDeep: "--line-deep",
    colorText: "--text",
    colorTextBright: "--text-bright",
    colorMuted: "--quiet",
    colorAccent: "--accent",
    colorAccentStrong: "--accent-strong",
    colorCornerAccent: "--corner-accent",
    colorLink: "--cyan",
    colorShadow: "--shadow",
    colorPixelGrid: "--pixel-grid",
  };
  for (const [token, variable] of Object.entries(map)) {
    if (tokens[token]) root.setProperty(variable, tokens[token]);
  }
  if (tokens.fontBody) root.setProperty("--font-body", tokens.fontBody);
  if (tokens.fontTitle) root.setProperty("--font-title", tokens.fontTitle);
  if (tokens.fontMono) root.setProperty("--font-mono", tokens.fontMono);
  if (tokens.borderWidthPx) root.setProperty("--border-width", `${tokens.borderWidthPx}px`);
  if (tokens.borderBottomWidthPx) root.setProperty("--border-bottom-width", `${tokens.borderBottomWidthPx}px`);
  if (tokens.cornerAccentPx) root.setProperty("--corner-accent-size", `${tokens.cornerAccentPx}px`);
  document.body.dataset.pixelArt = tokens.pixelArt || tokens.imageRendering === "pixelated" ? "true" : "false";
  document.body.dataset.scanlines = tokens.scanlineOverlay ? "true" : "false";
}

function renderCultComponent(node) {
  const kind = node.kind || "panel";
  const props = node.props || {};
  const children = node.children || [];
  let rendered;

  if (kind === "vn.stage") {
    const stage = el("section", "cultui-vn-stage");
    for (const child of children) stage.append(renderCultComponent(child));
    return stage;
  }

  if (kind === "grid") {
    const grid = el("section", "cultui-grid");
    if (props.columns) grid.style.gridTemplateColumns = props.columns;
    for (const child of children) grid.append(renderCultComponent(child));
    return grid;
  }

  if (kind === "partition") {
    const partition = el("section", `cultui-partition split-${props.split || "none"}`);
    applyBoxProps(partition, props);
    if (props.role) partition.dataset.role = props.role;
    for (const child of children) partition.append(renderCultComponent(child));
    return partition;
  }

  if (kind === "image.background") {
    const view = el("div", "cultui-background");
    if (props.src) view.style.backgroundImage = `url("${props.src}")`;
    view.setAttribute("aria-label", props.label || "background");
    return placeComponent(view, props.placement);
  }

  if (kind === "graph" || kind === "embed.norn") {
    return placeComponent(renderCultGraph(props), props.placement);
  }

  if (kind === "embed.tex") {
    return placeComponent(renderCultTex(props), props.placement);
  }

  if (
    kind === "layer.sprites" ||
    kind === "layer.cards" ||
    kind === "layer.embedded-surfaces" ||
    kind === "rail.actions"
  ) {
    const layer = el("div", `cultui-${kind.replace(".", "-")}`);
    for (const child of children) layer.append(renderCultComponent(child));
    return layer;
  }

  if (kind === "image.sprite") {
    const figure = el("figure", `cultui-sprite ${props.slot || "center"}`);
    if (props.src) {
      const image = el("img");
      image.src = props.src;
      image.alt = props.alt || props.actor || "";
      figure.append(image);
    }
    return figure;
  }

  if (kind === "card.external") {
    const card = el("article", "card cultui-card");
    card.append(el("div", "card-title", props.title || props.key || "card"));
    card.append(el("div", "detail", props.selector || props.htmlRef || "provider-owned fragment"));
    return card;
  }

  if (kind === "surface") {
    const surface = el("section", "cultui-surface-root");
    for (const child of children) surface.append(renderCultComponent(child));
    return surface;
  }

  if (kind === "pane" || kind === "panel") {
    const pane = el("section", "pane cultui-pane");
    if (props.title || node.text) pane.append(el("h2", "", props.title || node.text));
    for (const child of children) pane.append(renderCultComponent(child));
    return pane;
  }

  if (kind === "card") {
    const card = el("article", "card cultui-card");
    if (props.title || node.text) card.append(el("div", "card-title", props.title || node.text));
    for (const child of children) card.append(renderCultComponent(child));
    if (props.commandId || node.commandId) {
      card.dataset.commandId = props.commandId || node.commandId;
      card.tabIndex = 0;
      card.addEventListener("click", () => publishCommandIntent(card.dataset.commandId, props));
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          publishCommandIntent(card.dataset.commandId, props);
        }
      });
    }
    return card;
  }

  if (kind === "panel.dialogue") {
    const panel = el("section", "cultui-dialogue pane");
    panel.append(el("h2", "", props.speaker || "Speaker"));
    panel.append(el("div", "detail", props.text || ""));
    for (const child of children) {
      if (child.kind !== "text.dialogue") panel.append(renderCultComponent(child));
    }
    return panel;
  }

  if (kind === "avatar") {
    const image = el("img", "avatar");
    image.src = props.src || "";
    image.alt = props.label || "";
    return image;
  }

  if (kind === "text.dialogue" || kind === "text" || kind === "text.title" || kind === "label") {
    const text = el("div", textClassName(kind, props), props.text || node.text || "");
    bindText(text, props);
    return text;
  }

  if (kind === "metric") {
    return renderCultMetric(props);
  }

  if (kind === "list") {
    return renderCultList(props);
  }

  if (kind === "control.button") {
    const button = el("button", "cultui-button", props.label || "Action");
    button.type = "button";
    button.addEventListener("click", () => {
      currentMesh()?.applyAction(props.action);
      statusEl.textContent = props.action
        ? `command ${props.action.type} ${props.action.target || ""}`
        : `command ${props.action?.command || "invoke"} ${JSON.stringify(props.action?.payload || {})}`;
    });
    return button;
  }

  if (kind === "control.slider") {
    return renderCultSlider(props, children);
  }

  if (kind === "inspector.kv") {
    const panel = el("section", "pane");
    panel.append(el("h2", "", props.title || "Inspector"));
    for (const item of props.items || []) {
      panel.append(el("div", "detail", `${item.key}: ${item.value}`));
    }
    return panel;
  }

  const fallback = el("section", "pane");
  fallback.append(el("h2", "", kind));
  for (const child of children) fallback.append(renderCultComponent(child));
  rendered = fallback;
  return placeComponent(rendered, props.placement);
}

function placeComponent(element, placement) {
  if (!placement || placement.space !== "scene") return element;
  element.classList.add("cultui-placed");
  element.dataset.placementMode = placement.mode || "overlay";
  element.dataset.placementAnchor = placement.anchor || "";
  if (placement.zIndex !== undefined) element.style.zIndex = placement.zIndex;
  if (placement.opacity !== undefined) element.style.opacity = placement.opacity;

  const quad = placement.quad;
  if (Array.isArray(quad) && quad.length >= 4) {
    const xs = quad.map(point => point[0]);
    const ys = quad.map(point => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    element.style.left = `${minX * 100}%`;
    element.style.top = `${minY * 100}%`;
    element.style.width = `${Math.max(0.02, maxX - minX) * 100}%`;
    element.style.height = `${Math.max(0.02, maxY - minY) * 100}%`;
    const skewX = ((quad[1][1] - quad[0][1]) + (quad[2][1] - quad[3][1])) * 18;
    const skewY = ((quad[3][0] - quad[0][0]) + (quad[2][0] - quad[1][0])) * -18;
    element.style.transform = `skew(${skewX}deg, ${skewY}deg)`;
  }

  if (placement.chromaKey) {
    element.dataset.chromaKey = placement.chromaKey.color || "enabled";
  }
  return element;
}

function bindText(element, props) {
  if (!props.bind) return;
  currentMesh()?.var(props.bind).subscribe(value => {
    element.textContent = `${props.prefix || ""}${value ?? ""}${props.suffix || ""}`;
  });
}

function renderCultMetric(props) {
  const metric = el("div", "metric cultui-reactive-metric");
  const label = el("label", "", props.label || "Metric");
  const valueEl = el("span", "metric-value", "");
  label.append(valueEl);
  const bar = el("div", "bar");
  const fill = el("span");
  bar.append(fill);
  metric.append(label, bar);
  if (props.bind) {
    currentMesh()?.var(props.bind).subscribe(value => {
      const number = Number(value) || 0;
      valueEl.textContent = props.format === "percent" ? `${Math.round(number * 100)}%` : String(value ?? "");
      fill.style.width = `${Math.max(0, Math.min(100, Math.round(number * 100)))}%`;
    });
  }
  return metric;
}

function renderCultList(props) {
  const panel = el("section", "cultui-reactive-list");
  panel.append(el("div", "card-title", props.title || "List"));
  const list = el("div", "list");
  panel.append(list);
  if (props.bind) {
    currentMesh()?.collection(props.bind).subscribe(items => {
      list.replaceChildren(...items.map(item => el("div", "detail cultui-stream-item", String(item))));
    });
  }
  return panel;
}

function renderCultSlider(props, children) {
  const anatomy = resolveSliderAnatomy(props, children);
  const box = anatomy.find(part => part.kind === "control.box")?.props || {};
  const parts = anatomy.filter(part => part.kind === "control.part");
  const hitArea = anatomy.find(part => part.kind === "control.hitArea")?.props || {};
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 1);
  const step = Number(props.step ?? 0.01);
  const slider = el("div", "cultui-slider");
  slider.dataset.skin = props.skin || "default";
  applyControlBoxProps(slider, box);

  const visual = el("div", "cultui-slider-visual");
  const input = el("input", "cultui-slider-input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.setAttribute("aria-label", props.bind || "slider");

  for (const part of parts) {
    const partEl = el("span", `cultui-slider-part ${part.props?.name || "part"}`);
    applySliderPartProps(partEl, part.props || {});
    visual.append(partEl);
  }

  if (!parts.some(part => part.props?.name === "track")) visual.append(el("span", "cultui-slider-part track"));
  if (!parts.some(part => part.props?.name === "fill")) visual.append(el("span", "cultui-slider-part fill"));
  if (!parts.some(part => part.props?.name === "thumb")) visual.append(el("span", "cultui-slider-part thumb"));

  applyHitAreaProps(input, hitArea);
  slider.append(visual, input);

  const setVisualValue = (value) => {
    const number = Number(value ?? min);
    const bounded = Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
    const percent = max === min ? 0 : ((bounded - min) / (max - min)) * 100;
    input.value = String(bounded);
    slider.style.setProperty("--cultui-slider-value", `${percent}%`);
    slider.dataset.value = String(bounded);
  };

  if (props.bind) {
    currentMesh()?.var(props.bind).subscribe(setVisualValue);
    input.addEventListener("input", () => currentMesh()?.var(props.bind).set(Number(input.value)));
  } else {
    setVisualValue(props.value ?? min);
  }

  return slider;
}

function resolveSliderAnatomy(props, children) {
  const skin = props.skin ? currentSurfaceStyles.controlSkins?.[props.skin] : undefined;
  const skinChildren = skin?.children || [];
  const anatomy = [...skinChildren, ...children];
  if (anatomy.length) return anatomy;
  return [
    { kind: "control.box", props: { height: 18, overflow: "visible" } },
    { kind: "control.part", props: { name: "track", anchor: "center", size: ["100%", 6], radius: 2, fill: "color.panelInset" } },
    { kind: "control.part", props: { name: "fill", anchor: ["left", "center"], size: ["value%", 6], radius: 2, fill: "color.accent" } },
    { kind: "control.part", props: { name: "thumb", anchor: ["value", "center"], size: [12, 12], bleed: 3, radius: 999, fill: "color.accent" } },
    { kind: "control.hitArea", props: { size: ["100%", 18] } },
  ];
}

function applyControlBoxProps(element, props) {
  if (props.height !== undefined) element.style.minHeight = cssSize(props.height);
  if (props.width !== undefined) element.style.width = cssSize(props.width);
  if (props.overflow) element.style.overflow = props.overflow;
}

function applySliderPartProps(element, props) {
  const [width, height] = Array.isArray(props.size) ? props.size : [props.size, undefined];
  if (width !== undefined && width !== "value%") element.style.width = cssSize(width);
  if (height !== undefined) element.style.height = cssSize(height);
  if (props.radius !== undefined) element.style.borderRadius = cssSize(props.radius);
  if (props.fill !== undefined) element.style.background = tokenColor(props.fill);
  if (props.bleed !== undefined) element.style.setProperty("--part-bleed", cssSize(props.bleed));
  if (props.shadow) element.style.boxShadow = sliderShadow(props.shadow);
  const anchor = Array.isArray(props.anchor) ? props.anchor : [props.anchor];
  if (anchor.includes("value")) element.dataset.anchorValue = "true";
}

function applyHitAreaProps(element, props) {
  const [width, height] = Array.isArray(props.size) ? props.size : [props.size, undefined];
  if (width !== undefined) element.style.width = cssSize(width);
  if (height !== undefined) element.style.height = cssSize(height);
}

function applyBoxProps(element, props) {
  if (props.gap !== undefined) element.style.gap = cssSize(props.gap);
  if (props.padding !== undefined) element.style.padding = cssSize(props.padding);
  if (props.size !== undefined) element.style.flex = flexSize(props.size);
  if (props.min !== undefined) element.style.minWidth = cssSize(props.min);
  if (props.max !== undefined) element.style.maxWidth = cssSize(props.max);
  if (props.align !== undefined) element.style.alignItems = alignValue(props.align);
  if (props.clip === "true" || props.clip === true) element.style.overflow = "hidden";
  if (props.scroll === "y") element.style.overflowY = "auto";
  if (props.scroll === "x") element.style.overflowX = "auto";
}

function flexSize(value) {
  if (typeof value === "string" && value.endsWith("fr")) {
    return `${Number(value.slice(0, -2)) || 1} 1 0`;
  }
  if (value === "auto" || value === "content") return "0 0 auto";
  return `0 0 ${cssSize(value)}`;
}

function cssSize(value) {
  if (Array.isArray(value)) return value.map(cssSize).join(" ");
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return `${value}px`;
  return String(value ?? "");
}

function alignValue(value) {
  if (value === "center") return "center";
  if (value === "end") return "flex-end";
  return String(value);
}

function tokenColor(value) {
  const map = {
    "color.accent": "var(--accent)",
    "color.panelInset": "rgba(0, 0, 0, 0.34)",
    "color.panel": "var(--panel)",
    "color.text": "var(--text)",
  };
  return map[value] || value;
}

function sliderShadow(value) {
  const parts = Array.isArray(value) ? value : [value];
  if (parts[0] !== "glow") return parts.join(" ");
  const color = tokenColor(parts[1] || "color.accent");
  const alpha = Number(parts[2] ?? 0.35);
  const radius = cssSize(parts[4] ?? parts[3] ?? 6);
  return `0 0 ${radius} color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

function currentMesh() {
  return window.__eveCurrentMesh;
}

function textClassName(kind, props) {
  if (kind === "text.title" || props.role === "title") return "cultui-title";
  if (kind === "label") return "cultui-label";
  if (props.role === "mono") return "detail mono";
  return "detail";
}

function emptyState(message) {
  const pane = el("section", "pane");
  pane.append(el("h2", "", "No Surface"));
  pane.append(el("div", "detail", message));
  return pane;
}

function publishCommandIntent(commandId, props = {}) {
  const command = {
    type: "surface-command",
    schema: "gamecult.eve.command.v1",
    providerId: currentProvider?.providerId || surfaceId.textContent,
    surfaceId: currentProvider?.surfaces?.[0]?.surfaceId || surfaceId.textContent,
    command: commandId || "invoke",
    payload: {
      transport: props.transport || null,
    },
    issuedAt: new Date().toISOString(),
    clientId: "browser.reference",
  };
  statusEl.textContent = `command ${command.command}`;
  console.info("Eve command intent", command);
}

function renderCultGraph(props) {
  const graph = el("section", "cultui-graph");
  graph.dataset.engine = props.engine?.id || "graph";
  graph.dataset.contract = props.engine?.contract || "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1 1");
  svg.setAttribute("preserveAspectRatio", "none");
  const graphState = props.graph || props;
  const nodes = graphState.nodes || [];
  for (const edge of graphState.edges || []) {
    const source = nodes.find(node => node.id === edge.source);
    const target = nodes.find(node => node.id === edge.target);
    if (!source || !target) continue;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", source.x ?? 0);
    line.setAttribute("y1", source.y ?? 0);
    line.setAttribute("x2", target.x ?? 0);
    line.setAttribute("y2", target.y ?? 0);
    svg.append(line);
  }
  graph.append(svg);
  for (const node of nodes) {
    const button = el("button", `cultui-node ${node.current ? "selected" : ""}`, node.label || node.id);
    button.type = "button";
    button.style.left = `${node.x * 100}%`;
    button.style.top = `${node.y * 100}%`;
    button.addEventListener("click", () => {
      statusEl.textContent = `command story.jump {"targetPath":"${node.target || node.id}"}`;
    });
    graph.append(button);
  }
  return graph;
}

function renderCultTex(props) {
  const panel = el("section", "cultui-tex");
  panel.dataset.renderer = props.renderer?.web || "tex";
  if (props.label) panel.append(el("div", "cultui-tex-label", props.label));
  panel.append(el("div", "cultui-tex-source", props.source || props.sourceUri || ""));
  return panel;
}

function renderVoidBot(state) {
  const nodes = state.nodes || [];
  const ctb = nodes.filter(n => n.kind === "ctb-turn");
  const leaves = nodes.filter(n => n.kind === "state-leaf");
  const summary = nodeById(nodes, "voidbot-summary");
  const agent = nodeById(nodes, "agent-detail");
  const detail = nodeById(nodes, state.selectedNodeId) || nodeById(nodes, "state-detail") || agent || summary;

  app.innerHTML = "";
  const root = el("section", "cockpit");
  const rail = el("div", "ctb");
  for (const turn of ctb) {
    const card = el("button", "card");
    card.type = "button";
    if (turn.avatarUrl) {
      const img = el("img", "avatar");
      img.src = turn.avatarUrl;
      img.alt = "";
      card.append(img);
    }
    card.append(el("div", "card-title", turn.label || turn.id));
    card.append(el("div", "health", turn.health || ""));
    rail.append(card);
  }

  const left = el("section", "pane");
  left.append(el("h2", "", "Controls / Selected Face"));
  left.append(el("div", "detail", `${summary?.label || "VoidBot Swarm"}\n${summary?.detail || ""}`));
  left.append(metricStack());
  left.append(el("div", "detail", agent?.detail || "No selected Face detail."));

  const middle = el("section", "pane");
  middle.append(el("h2", "", "State Graph"));
  const list = el("div", "list");
  for (const leaf of leaves) {
    const card = el("div", `card ${leaf.id === state.selectedNodeId ? "selected" : ""}`);
    card.append(el("div", "card-title", leaf.label || leaf.id));
    card.append(el("div", "health", leaf.health || leaf.statePath || ""));
    list.append(card);
  }
  middle.append(list);

  const right = el("section", "pane");
  right.append(el("h2", "", "State Detail"));
  right.append(el("div", "detail", `${detail?.label || "detail"}\n\n${detail?.detail || ""}`));

  root.append(rail, left, middle, right);
  app.append(root);
}

function renderGraphSurface(state) {
  app.innerHTML = "";
  const graph = el("section", "graph");
  for (const node of state.nodes || []) {
    const view = el("article", `node ${node.id === state.selectedNodeId ? "selected" : ""}`);
    const width = Math.max(160, graphWidth(node.width));
    const height = Math.max(92, graphHeight(node.height));
    view.style.width = `${width}px`;
    view.style.minHeight = `${height}px`;
    view.style.left = `${((node.x ?? 0) + 1) * 50}%`;
    view.style.top = `${((node.y ?? 0) + 1) * 50}%`;
    view.append(el("div", "card-title", node.label || node.id));
    view.append(el("div", "health", `${node.kind || "node"}  ${node.health || ""}`));
    if (node.detail) {
      view.append(el("div", "detail", node.detail));
    }
    graph.append(view);
  }
  app.append(graph);
}

function graphWidth(value) {
  return Math.round((value || 0.25) * Math.max(900, window.innerWidth - 32));
}

function graphHeight(value) {
  return Math.round((value || 0.16) * Math.max(520, window.innerHeight - 150));
}

function metricStack() {
  const wrapper = el("div", "metrics");
  const metrics = [
    ["TURN", 0.96],
    ["MEMORY", 0.70],
    ["PRESSURE", 0.42],
    ["HEAT", 0.34],
    ["LOAD", 0.99],
    ["SPEED", 0.88],
  ];
  for (const [label, value] of metrics) {
    const metric = el("div", "metric");
    metric.append(el("label", "", `${label} ${Math.round(value * 100)}%`));
    const bar = el("div", "bar");
    const fill = el("span");
    fill.style.width = `${Math.round(value * 100)}%`;
    bar.append(fill);
    metric.append(bar);
    wrapper.append(metric);
  }
  return wrapper;
}

function nodeById(nodes, id) {
  return nodes.find(node => node.id === id);
}

function el(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}
