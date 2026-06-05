export function compileEveDsl(source) {
  const mesh = createCultMeshStore();
  const root = {
    id: "root",
    kind: "surface",
    props: {},
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
        controlSkins: {},
      },
    },
    commands: [],
    mesh,
  };

  const stack = [{ indent: -1, node: root }];
  let activeSkin;

  for (const entry of readDslLines(source)) {
    while (entry.indent <= stack[stack.length - 1].indent) stack.pop();

    const parent = stack[stack.length - 1].node;
    const [head, ...rest] = entry.tokens;

    if (applyStateCommand(state, mesh, head, rest)) {
      activeSkin = undefined;
      continue;
    }

    if (head === "skin") {
      activeSkin = {
        target: readKeyword(rest, "for") || rest[2] || "control",
        children: [],
      };
      state.surface.styles.controlSkins[rest[0]] = activeSkin;
      stack.push({ indent: entry.indent, node: activeSkin });
      continue;
    }

    if (isPropertyLine(head, parent)) {
      applyProperty(parent.props || (parent.props = {}), head, rest);
      continue;
    }

    const node = createComponent(entry, state);
    if (!node) continue;

    if (head === "fieldRow") {
      parent.children.push(node.row);
      stack.push({ indent: entry.indent, node: node.field });
      continue;
    }

    if (activeSkin && parent === activeSkin) {
      activeSkin.children.push(node);
      stack.push({ indent: entry.indent, node });
      continue;
    }

    parent.children.push(node);
    stack.push({ indent: entry.indent, node });
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
    snapshot() {
      return Object.fromEntries([...records.entries()].map(([path, record]) => [path, record.value]));
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
        this.var(action.target).set(parseDslValue(renderTemplate(action.value)));
      }
    },
  };
}

function readDslLines(source) {
  const lines = [];
  let indentMode;
  let spaceUnit;

  for (const rawLine of source.split(/\r?\n/)) {
    const withoutComment = stripComment(rawLine);
    if (!withoutComment.trim()) continue;

    const leading = withoutComment.match(/^[\t ]*/)?.[0] || "";
    if (leading.includes("\t") && leading.includes(" ")) {
      throw new Error("CultUI indentation may use tabs or spaces, not both on one line.");
    }

    if (leading) {
      const mode = leading.includes("\t") ? "tabs" : "spaces";
      indentMode ||= mode;
      if (indentMode !== mode) throw new Error("CultUI indentation must be consistent within a file.");
      if (mode === "spaces") spaceUnit ||= leading.length;
    }

    const indent = leading.includes("\t")
      ? leading.length
      : leading.length ? leading.length / (spaceUnit || leading.length) : 0;
    const line = withoutComment.trim();
    lines.push({ indent, tokens: tokenize(line), line });
  }

  return lines;
}

function applyStateCommand(state, mesh, head, rest) {
  if (head === "surface") {
    state.providerId = rest[0] || state.providerId;
    state.surface.root.id = rest[0] || state.surface.root.id;
    state.title = rest[1] || state.title;
    return true;
  }

  if (head === "version") {
    state.version = Number(rest[0]) || state.version;
    return true;
  }

  if (head === "var") {
    mesh.var(rest[0]).set(parseDslValue(rest.slice(1).join(" ")));
    return true;
  }

  if (head === "collection") {
    mesh.collection(rest[0]);
    return true;
  }

  if (head === "item") {
    mesh.collection(rest[0]).append(parseDslValue(rest.slice(1).join(" ")));
    return true;
  }

  if (head === "derive") {
    const [target, operator, sourcePath] = rest;
    mesh.derive(target, operator, sourcePath);
    return true;
  }

  return false;
}

function createComponent(entry, state) {
  const [head, ...rest] = entry.tokens;

  if (head === "fieldRow") {
    const label = rest[0] || "Field";
    const id = slug(label);
    const field = {
      id: `${id}.field`,
      kind: "partition",
      props: { size: "1fr", role: "inspector.field" },
      children: [],
    };
    return {
      field,
      row: {
        id: `${id}.row`,
        kind: "partition",
        props: { split: "x", gap: 8, padding: 4, align: "center", role: "inspector.row" },
        children: [
          {
            id: `${id}.label`,
            kind: "partition",
            props: { size: "12rem", role: "inspector.label" },
            children: [{ id: `${id}.label.text`, kind: "label", props: { text: label }, children: [] }],
          },
          field,
        ],
      },
    };
  }

  if (head === "partition") {
    return {
      id: rest[0] || `partition.${entry.line.length}`,
      kind: "partition",
      props: parsePairs(rest.slice(1)),
      children: [],
    };
  }

  if (head === "pane") {
    return {
      id: rest[0] || `pane.${entry.line.length}`,
      kind: "pane",
      props: parsePairs(rest.slice(1), { title: rest[0] }),
      children: [],
    };
  }

  if (head === "card") {
    return {
      id: rest[0] || `card.${entry.line.length}`,
      kind: "card",
      props: { title: rest[1] || rest[0] || "Card", ...parsePairs(rest.slice(2)) },
      children: [],
    };
  }

  if (head === "title") {
    return {
      id: scopedId("title", entry),
      kind: "text.title",
      props: parseTextProps(rest),
      children: [],
    };
  }

  if (head === "text") {
    return {
      id: scopedId("text", entry),
      kind: "text",
      props: parseTextProps(rest),
      children: [],
    };
  }

  if (head === "label") {
    return {
      id: scopedId("label", entry),
      kind: "label",
      props: parseTextProps(rest),
      children: [],
    };
  }

  if (head === "metric") {
    return {
      id: scopedId("metric", entry),
      kind: "metric",
      props: {
        label: rest[0] || "Metric",
        bind: readKeyword(rest, "bind"),
        format: rest.includes("percent") ? "percent" : "value",
      },
      children: [],
    };
  }

  if (head === "list") {
    return {
      id: scopedId("list", entry),
      kind: "list",
      props: {
        title: rest[0] || "List",
        bind: readKeyword(rest, "bind"),
      },
      children: [],
    };
  }

  if (head === "button") {
    return {
      id: scopedId("button", entry),
      kind: "control.button",
      props: {
        label: rest[0] || "Action",
        action: parseButtonAction(rest),
      },
      children: [],
    };
  }

  if (head === "slider") {
    return {
      id: scopedId("slider", entry),
      kind: "control.slider",
      props: parsePairs(rest),
      children: [],
    };
  }

  if (head === "box") {
    return {
      id: scopedId("box", entry),
      kind: "control.box",
      props: parsePairs(rest),
      children: [],
    };
  }

  if (head === "part") {
    return {
      id: scopedId(`part.${rest[0] || "unnamed"}`, entry),
      kind: "control.part",
      props: { name: rest[0] || "part", ...parsePairs(rest.slice(1)) },
      children: [],
    };
  }

  if (head === "hitArea") {
    return {
      id: scopedId("hitArea", entry),
      kind: "control.hitArea",
      props: parsePairs(rest),
      children: [],
    };
  }

  if (head === "skin") return undefined;

  return {
    id: scopedId(head, entry),
    kind: head,
    props: parsePairs(rest),
    children: [],
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

function parsePairs(tokens, initial = {}) {
  const props = { ...initial };
  for (let index = 0; index < tokens.length; index += 1) {
    const key = tokens[index];
    if (key === "bind") {
      props.bind = tokens[index + 1];
      index += 1;
    } else if (key === "split") {
      props.split = tokens[index + 1];
      index += 1;
    } else if (key === "skin") {
      props.skin = tokens[index + 1];
      index += 1;
    } else if (PROPERTY_NAMES.has(key)) {
      const value = readPropertyValue(tokens, index + 1);
      props[key] = value.value;
      index = value.nextIndex - 1;
    } else if (index + 1 < tokens.length && !PROPERTY_NAMES.has(tokens[index + 1])) {
      props[key] = parseDslValue(tokens[index + 1]);
      index += 1;
    } else {
      props[key] = true;
    }
  }
  return props;
}

function isPropertyLine(head, parent) {
  return Boolean(parent?.props && PROPERTY_NAMES.has(head));
}

function applyProperty(props, head, rest) {
  props[head] = normalizePropertyValues(rest.map(parseDslValue));
}

function readPropertyValue(tokens, start) {
  let nextIndex = start;
  while (nextIndex < tokens.length && !PROPERTY_NAMES.has(tokens[nextIndex])) {
    nextIndex += 1;
  }
  return {
    value: normalizePropertyValues(tokens.slice(start, nextIndex).map(parseDslValue)),
    nextIndex,
  };
}

function normalizePropertyValues(values) {
  return values.length <= 1 ? values[0] : values;
}

function readKeyword(tokens, keyword) {
  const index = tokens.indexOf(keyword);
  return index >= 0 ? tokens[index + 1] : undefined;
}

function parseDslValue(value) {
  if (typeof value !== "string") return value;
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
  let quote;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === "\"" || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? undefined : quote || char;
    }
    if (char === "#" && !quote) return line.slice(0, index);
  }
  return line;
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

function slug(value) {
  return String(value || "field")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "field";
}

function scopedId(prefix, entry) {
  return `${prefix}.${slug(entry.line).slice(0, 48)}`;
}

const PROPERTY_NAMES = new Set([
  "align",
  "anchor",
  "bleed",
  "clip",
  "fill",
  "gap",
  "height",
  "max",
  "min",
  "overflow",
  "padding",
  "radius",
  "scroll",
  "shadow",
  "size",
  "step",
  "width",
]);
