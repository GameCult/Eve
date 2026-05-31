const statusEl = document.querySelector("#status");
const app = document.querySelector("#app");
const surfaceId = document.querySelector("#surface-id");
const surfaceVersion = document.querySelector("#surface-version");
const voidBotTab = document.querySelector("#voidbot-tab");
const fensalirTab = document.querySelector("#fensalir-tab");

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

openVoidBot();

function setActiveTab(tab) {
  for (const button of [voidBotTab, fensalirTab]) {
    button.classList.toggle("active", button === tab);
  }
}

function openVoidBot() {
  closeSocket();
  const url = "ws://127.0.0.1:8795/eve/deck";
  statusEl.textContent = `connecting ${url}`;
  socket = new WebSocket(url);
  socket.addEventListener("open", () => {
    statusEl.textContent = "connected to Mimir Eve broker";
    socket.send(JSON.stringify({ type: "open-provider", providerId: "voidbot.swarm" }));
  });
  socket.addEventListener("message", event => {
    const state = JSON.parse(event.data);
    if (state.providerId === "voidbot.swarm") {
      renderSurface(state, "live");
    }
  });
  socket.addEventListener("close", () => {
    statusEl.textContent = "Mimir broker disconnected";
  });
  socket.addEventListener("error", () => {
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
  surfaceId.textContent = state.providerId || "surface unknown";
  surfaceVersion.textContent = `v${state.version ?? "?"}`;
  statusEl.textContent = `${state.title || "surface"} (${source})`;
  if (state.providerId === "voidbot.swarm") {
    renderVoidBot(state);
  } else {
    renderGraphSurface(state);
  }
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
