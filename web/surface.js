import { compileEveDsl } from "./eve-dsl.js";

const statusEl = document.querySelector("#status");
const app = document.querySelector("#app");
const surfaceId = document.querySelector("#surface-id");
const surfaceVersion = document.querySelector("#surface-version");
const voidBotTab = document.querySelector("#voidbot-tab");
const fensalirTab = document.querySelector("#fensalir-tab");
const saiTab = document.querySelector("#sai-tab");
const huginnTab = document.querySelector("#huginn-tab");
const dslTab = document.querySelector("#dsl-tab");

let socket;

voidBotTab.addEventListener("click", () => {
  setActiveTab(voidBotTab);
  openVoidBot();
});

fensalirTab.addEventListener("click", async () => {
  setActiveTab(fensalirTab);
  closeSocket();
  const response = await fetch("./fixtures/fensalir-client-surface.json");
  renderSurface(await response.json(), "fixture");
});

saiTab.addEventListener("click", async () => {
  setActiveTab(saiTab);
  closeSocket();
  const response = await fetch("./fixtures/sai-vn-surface.json");
  renderSurface(await response.json(), "fixture");
});

huginnTab.addEventListener("click", async () => {
  setActiveTab(huginnTab);
  closeSocket();
  const response = await fetch("./fixtures/huginn-cc-surface.eve");
  renderSurface(compileEveDsl(await response.text()), "dsl");
});

dslTab.addEventListener("click", async () => {
  setActiveTab(dslTab);
  closeSocket();
  const response = await fetch("./fixtures/reactive-composition.eve");
  renderSurface(compileEveDsl(await response.text()), "dsl");
});

openVoidBot();

function setActiveTab(tab) {
  for (const button of [voidBotTab, fensalirTab, saiTab, huginnTab, dslTab]) {
    button.classList.toggle("active", button === tab);
  }
}

function openVoidBot() {
  closeSocket();
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  const host = location.hostname || "127.0.0.1";
  const url = `${scheme}//${host}:8795/eve/deck`;
  statusEl.textContent = `connecting ${url}`;
  socket = new WebSocket(url);
  const activeSocket = socket;
  socket.addEventListener("open", () => {
    if (socket !== activeSocket) return;
    statusEl.textContent = "connected to Mimir Eve broker";
    activeSocket.send(JSON.stringify({ type: "open-provider", providerId: "voidbot.swarm" }));
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
  surfaceId.textContent = state.providerId || "surface unknown";
  surfaceVersion.textContent = `v${state.version ?? "?"}`;
  statusEl.textContent = `${state.title || "surface"} (${source})`;
  applySurfaceStyles(state.surface?.styles);
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
  const map = {
    colorBackground: "--bg",
    colorPanel: "--panel",
    colorPanelAlt: "--panel-2",
    colorText: "--text",
    colorMuted: "--quiet",
    colorAccent: "--accent",
    colorLink: "--cyan",
  };
  for (const [token, variable] of Object.entries(map)) {
    if (tokens[token]) root.setProperty(variable, tokens[token]);
  }
  if (tokens.fontBody) root.setProperty("--font-body", tokens.fontBody);
  if (tokens.fontTitle) root.setProperty("--font-title", tokens.fontTitle);
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

  if (kind === "card") {
    const card = el("article", "card cultui-card");
    if (props.title) card.append(el("div", "card-title", props.title));
    for (const child of children) card.append(renderCultComponent(child));
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

  if (kind === "text.dialogue" || kind === "text" || kind === "text.title") {
    const text = el("div", kind === "text.title" ? "cultui-title" : "detail", props.text || "");
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

function currentMesh() {
  return window.__eveCurrentMesh;
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
