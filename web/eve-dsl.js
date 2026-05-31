export function compileEveDsl(source) {
  const mesh = createCultMeshStore();
  const root = {
    id: "root",
    kind: "grid",
    props: { columns: "repeat(auto-fit, minmax(260px, 1fr))" },
    children: [],
  };
  const state = {
    providerId: "eve.dsl.fixture",
    providerKind: "eve.composition",
    title: "Eve DSL Surface",
    version: 1,
    surface: {
      root,
      styles: {
        tokens: {
          colorBackground: "#04070b",
          colorPanel: "#0b1720",
          colorPanelAlt: "#0e2230",
          colorAccent: "#ffcc66",
          colorText: "#eef7ff",
          colorMuted: "#8ba7b8",
          colorLink: "#8efcff",
        },
      },
    },
    commands: [],
    mesh,
  };
  let currentComponent;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = stripComment(rawLine).trim();
    if (!line) continue;
    const tokens = tokenize(line);
    const [head, ...rest] = tokens;

    if (head === "surface") {
      state.providerId = rest[0] || state.providerId;
      state.title = rest[1] || state.title;
      continue;
    }

    if (head === "version") {
      state.version = Number(rest[0]) || state.version;
      continue;
    }

    if (head === "var") {
      mesh.var(rest[0]).set(parseDslValue(rest.slice(1).join(" ")));
      continue;
    }

    if (head === "collection") {
      mesh.collection(rest[0]);
      continue;
    }

    if (head === "item") {
      mesh.collection(rest[0]).append(parseDslValue(rest.slice(1).join(" ")));
      continue;
    }

    if (head === "derive") {
      const [target, operator, sourcePath] = rest;
      mesh.derive(target, operator, sourcePath);
      continue;
    }

    if (head === "card") {
      currentComponent = {
        id: rest[0] || `card-${root.children.length + 1}`,
        kind: "card",
        props: { title: rest[1] || rest[0] || "Card" },
        children: [],
      };
      root.children.push(currentComponent);
      continue;
    }

    if (head === "end") {
      currentComponent = undefined;
      continue;
    }

    if (!currentComponent) continue;

    if (head === "title") {
      currentComponent.children.push({
        id: `${currentComponent.id}.title.${currentComponent.children.length}`,
        kind: "text.title",
        props: parseTextProps(rest),
        children: [],
      });
      continue;
    }

    if (head === "text") {
      currentComponent.children.push({
        id: `${currentComponent.id}.text.${currentComponent.children.length}`,
        kind: "text",
        props: parseTextProps(rest),
        children: [],
      });
      continue;
    }

    if (head === "metric") {
      currentComponent.children.push({
        id: `${currentComponent.id}.metric.${currentComponent.children.length}`,
        kind: "metric",
        props: {
          label: rest[0] || "Metric",
          bind: readKeyword(rest, "bind"),
          format: rest.includes("percent") ? "percent" : "value",
        },
        children: [],
      });
      continue;
    }

    if (head === "list") {
      currentComponent.children.push({
        id: `${currentComponent.id}.list.${currentComponent.children.length}`,
        kind: "list",
        props: {
          title: rest[0] || "List",
          bind: readKeyword(rest, "bind"),
        },
        children: [],
      });
      continue;
    }

    if (head === "button") {
      currentComponent.children.push({
        id: `${currentComponent.id}.button.${currentComponent.children.length}`,
        kind: "control.button",
        props: {
          label: rest[0] || "Action",
          action: parseButtonAction(rest),
        },
        children: [],
      });
    }
  }

  return state;
}

export function createCultMeshStore() {
  const records = new Map();

  const ensure = (path, initialValue) => {
    if (!records.has(path)) {
      records.set(path, {
        value: initialValue,
        subscribers: new Set(),
      });
    }
    return records.get(path);
  };

  const notify = (path) => {
    const record = ensure(path, undefined);
    for (const subscriber of record.subscribers) subscriber(record.value);
  };

  return {
    var(path) {
      return {
        get: () => ensure(path, undefined).value,
        set: (value) => {
          ensure(path, undefined).value = value;
          notify(path);
        },
        subscribe: (subscriber) => {
          const record = ensure(path, undefined);
          record.subscribers.add(subscriber);
          subscriber(record.value);
          return () => record.subscribers.delete(subscriber);
        },
      };
    },
    collection(path) {
      const record = ensure(path, []);
      if (!Array.isArray(record.value)) record.value = [];
      return {
        get: () => record.value.slice(),
        append: (value) => {
          record.value = [...record.value, value];
          notify(path);
        },
        subscribe: (subscriber) => {
          record.subscribers.add(subscriber);
          subscriber(record.value.slice());
          return () => record.subscribers.delete(subscriber);
        },
      };
    },
    derive(target, operator, sourcePath) {
      const source = this.var(sourcePath);
      const targetVar = this.var(target);
      source.subscribe((value) => {
        if (operator === "count") {
          targetVar.set(Array.isArray(value) ? value.length : 0);
        } else if (operator === "latest") {
          targetVar.set(Array.isArray(value) ? value[value.length - 1] : value);
        }
      });
    },
    applyAction(action) {
      if (!action) return;
      if (action.type === "append") {
        this.collection(action.target).append(renderTemplate(action.value));
      } else if (action.type === "set") {
        this.var(action.target).set(renderTemplate(action.value));
      }
    },
  };
}

function parseTextProps(tokens) {
  const bind = readKeyword(tokens, "bind");
  return {
    text: bind ? "" : tokens.join(" "),
    bind,
    prefix: readKeyword(tokens, "prefix") || "",
    suffix: readKeyword(tokens, "suffix") || "",
  };
}

function parseButtonAction(tokens) {
  const appendIndex = tokens.indexOf("append");
  if (appendIndex >= 0) {
    return {
      type: "append",
      target: tokens[appendIndex + 1],
      value: tokens.slice(appendIndex + 2).join(" "),
    };
  }
  const setIndex = tokens.indexOf("set");
  if (setIndex >= 0) {
    return {
      type: "set",
      target: tokens[setIndex + 1],
      value: tokens.slice(setIndex + 2).join(" "),
    };
  }
  return undefined;
}

function readKeyword(tokens, keyword) {
  const index = tokens.indexOf(keyword);
  return index >= 0 ? tokens[index + 1] : undefined;
}

function parseDslValue(value) {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed;
}

function renderTemplate(value) {
  return value.replace(/\{\{now\}\}/g, new Date().toLocaleTimeString());
}

function stripComment(line) {
  const index = line.indexOf("#");
  return index >= 0 ? line.slice(0, index) : line;
}

function tokenize(line) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(line))) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}
