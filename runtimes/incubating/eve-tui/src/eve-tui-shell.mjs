export class EveTuiShell {
  constructor({ clientId = "tui", width = 80 } = {}) {
    this.clientId = clientId;
    this.width = Math.max(20, Number(width) || 80);
  }

  selectSurface(providerAdvertisement, requestedSurfaceId = "") {
    const provider = normalizeProviderAdvertisement(providerAdvertisement);
    const surface = requestedSurfaceId
      ? provider.surfaces.find(candidate => candidate.surfaceId === requestedSurfaceId)
      : provider.surfaces[0];
    if (!surface) {
      throw new Error(`Provider ${provider.providerId} does not advertise surface ${requestedSurfaceId || "(first)"}`);
    }
    return {
      providerId: provider.providerId,
      surfaceId: surface.surfaceId,
      title: surface.title || provider.title || surface.surfaceId,
      transport: surface.transport || "",
      url: surface.url || surface.key || "",
      worldInteraction: normalizeWorldInteraction(surface.worldInteraction),
    };
  }

  createCommandIntent(providerAdvertisement, requestedSurfaceId, command, payload = {}) {
    if (!command) throw new Error("Command is required.");
    const selected = this.selectSurface(providerAdvertisement, requestedSurfaceId);
    const action = objectValue(payload.action);
    const commandBoundary = firstString(
      selected.worldInteraction.commandBoundary,
      payload.commandBoundary,
      action.commandBoundary,
      action.target,
    );
    const receiptSchema = firstString(
      selected.worldInteraction.receiptSchema,
      payload.receiptSchema,
      action.receiptSchema,
    );
    const intent = {
      type: "surface-command",
      schema: "gamecult.eve.command.v1",
      providerId: selected.providerId,
      surfaceId: selected.surfaceId,
      command,
      payload: {
        ...payload,
        transport: payload.transport ?? null,
      },
      issuedAt: new Date().toISOString(),
      clientId: this.clientId,
    };
    if (commandBoundary) intent.commandBoundary = commandBoundary;
    if (receiptSchema) intent.receiptSchema = receiptSchema;
    return intent;
  }

  lowerSurface(surfaceDocument, providerAdvertisement, requestedSurfaceId = "") {
    const selected = this.selectSurface(providerAdvertisement, requestedSurfaceId);
    const document = normalizeSurfaceDocument(surfaceDocument);
    if (document.surfaceId !== selected.surfaceId) {
      throw new Error(`Surface document ${document.surfaceId} does not match advertised TUI surface ${selected.surfaceId}.`);
    }

    const lines = [
      fitLine(`EveTui ${selected.providerId}`, this.width),
      fitLine(`surface ${selected.surfaceId}`, this.width),
      fitLine(`command ${selected.worldInteraction.commandBoundary || "unadvertised"}`, this.width),
      fitLine(`receipt ${selected.worldInteraction.receiptSchema || "unadvertised"}`, this.width),
      ...buildComponentLines(document.root, this.width),
    ];

    return {
      schema: "gamecult.eve.tui_grid.v1",
      runtimeId: "tui",
      providerId: selected.providerId,
      surfaceId: selected.surfaceId,
      projectionKind: selected.worldInteraction.projectionKind,
      commandBoundary: selected.worldInteraction.commandBoundary,
      receiptSchema: selected.worldInteraction.receiptSchema,
      ownership: selected.worldInteraction.ownership,
      width: this.width,
      lines,
      embeddedDocumentSlots: collectEmbeddedDocumentSlots(document.root),
      pluginProjections: collectPluginProjections(document.root),
      lossiness: "terminal-grid-command-surface; summarizes provider-authored world surface without owning provider state",
    };
  }

  renderSummary(providerAdvertisement, requestedSurfaceId = "") {
    const selected = this.selectSurface(providerAdvertisement, requestedSurfaceId);
    const lines = [
      fitLine(`EveTui ${selected.providerId}`, this.width),
      fitLine(`surface ${selected.surfaceId}`, this.width),
      fitLine(`transport ${selected.transport || "unknown"}`, this.width),
      fitLine(`command ${selected.worldInteraction.commandBoundary || "unadvertised"}`, this.width),
      fitLine(`receipt ${selected.worldInteraction.receiptSchema || "unadvertised"}`, this.width),
    ];
    return {
      schema: "gamecult.eve.tui_grid.v1",
      runtimeId: "tui",
      providerId: selected.providerId,
      surfaceId: selected.surfaceId,
      width: this.width,
      lines,
      lossiness: "provider-shell-summary-only; use lowerSurface for TUI world-surface lowering",
    };
  }
}

export function normalizeProviderAdvertisement(providerAdvertisement) {
  if (!providerAdvertisement || typeof providerAdvertisement !== "object") {
    throw new Error("Provider advertisement is required.");
  }
  const providerId = String(providerAdvertisement.providerId || "");
  if (!providerId) throw new Error("Provider advertisement missing providerId.");
  const surfaces = Array.isArray(providerAdvertisement.surfaces)
    ? providerAdvertisement.surfaces
      .filter(surface => surface && typeof surface === "object" && surface.surfaceId)
      .map(surface => ({ ...surface, surfaceId: String(surface.surfaceId) }))
    : [];
  if (!surfaces.length) throw new Error(`Provider ${providerId} advertises no surfaces.`);
  return { ...providerAdvertisement, providerId, surfaces };
}

export function normalizeSurfaceDocument(surfaceDocument) {
  if (!surfaceDocument || typeof surfaceDocument !== "object") {
    throw new Error("Surface document is required.");
  }
  if (surfaceDocument.schema !== "gamecult.eve.surface.v1") {
    throw new Error(`Unexpected surface schema: ${surfaceDocument.schema || ""}`);
  }
  const surface = objectValue(surfaceDocument.surface);
  const surfaceId = firstString(surface.id);
  if (!surfaceId) throw new Error("Surface document missing surface.id.");
  const root = objectValue(surface.root);
  if (!root.id) throw new Error(`Surface document ${surfaceId} missing surface.root.`);
  return { ...surfaceDocument, surfaceId, root };
}

function normalizeWorldInteraction(value) {
  const source = objectValue(value);
  return {
    projectionKind: firstString(source.projectionKind),
    commandBoundary: firstString(source.commandBoundary),
    receiptSchema: firstString(source.receiptSchema),
    ownership: firstString(source.ownership),
  };
}

function buildComponentLines(component, width, depth = 0) {
  const source = objectValue(component);
  const kind = firstString(source.kind) || "component";
  const id = firstString(source.id) || "(anonymous)";
  const props = objectValue(source.props);
  const label = firstString(props.label, props.title, props.text, props.bind, props.command, props.fieldId);
  const indent = "  ".repeat(Math.min(depth, 6));
  const pluginProjection = buildPluginProjection(kind, source);
  const pluginSuffix = pluginProjection
    ? ` [${pluginProjection.pluginId}:${pluginProjection.semanticOwner}]`
    : "";
  const ownLine = fitLine(`${indent}${terminalElementKind(kind)} ${id}${label ? ` ${label}` : ""}${pluginSuffix}`, width);
  const children = Array.isArray(source.children) ? source.children : [];
  const embeddedDocuments = normalizeEmbeddedDocuments(source.embeddedDocuments);
  return [
    ownLine,
    ...embeddedDocuments.map(document => fitLine(`${indent}  slot ${document.slotId || "(slot)"} ${document.documentId || "(document)"}`, width)),
    ...children.flatMap(child => buildComponentLines(child, width, depth + 1)),
  ];
}

function collectEmbeddedDocumentSlots(component, slots = []) {
  const source = objectValue(component);
  const ownerId = firstString(source.id);
  for (const document of normalizeEmbeddedDocuments(source.embeddedDocuments)) {
    slots.push({ ownerId, ...document });
  }
  for (const child of Array.isArray(source.children) ? source.children : []) {
    collectEmbeddedDocumentSlots(child, slots);
  }
  return slots;
}

function collectPluginProjections(component, projections = []) {
  const source = objectValue(component);
  const projection = buildPluginProjection(firstString(source.kind), source);
  if (projection) {
    projections.push({
      ownerId: firstString(source.id),
      ...projection,
    });
  }
  for (const child of Array.isArray(source.children) ? source.children : []) {
    collectPluginProjections(child, projections);
  }
  return projections;
}

function normalizeEmbeddedDocuments(value) {
  return Array.isArray(value)
    ? value
      .filter(document => document && typeof document === "object")
      .map(document => ({
        slotId: firstString(document.slotId, document.id),
        documentId: firstString(document.documentId, document.href, document.url),
        schemaId: firstString(document.schemaId, document.schema),
        presentationKind: firstString(document.presentationKind, document.kind),
      }))
      .filter(document => document.slotId || document.documentId)
    : [];
}

function terminalElementKind(componentKind) {
  if (!componentKind) return "empty";
  if (componentKind === "vn.stage") return "sai-vn";
  if (componentKind === "embed.norn") return "norn";
  if (componentKind === "embed.tex") return "tex";
  if (componentKind.startsWith("control.")) return "command";
  if (componentKind.startsWith("embed.")) return "plugin";
  if (componentKind === "surface.slot") return "slot";
  if (componentKind.startsWith("field.") || componentKind.startsWith("world.")) return "world";
  if (componentKind.startsWith("text.") || componentKind === "text" || componentKind === "label") return "text";
  if (componentKind === "metric") return "metric";
  return componentKind;
}

function buildPluginProjection(componentKind, component) {
  const props = objectValue(component.props);
  if (componentKind === "vn.stage") {
    return {
      pluginId: "sai.vn",
      projectionKind: "sai-vn-terminal-stage-summary",
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["vn.stage", "story.choose", "story.continue", "story.jump"],
      documentId: firstString(props.storyId, component.id),
      semanticOwner: "Sai",
      fallbackKind: "terminal-summary",
    };
  }

  if (componentKind === "embed.norn") {
    return {
      pluginId: "norn.graph",
      projectionKind: "norn-graph-terminal-outline",
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["embed.norn"],
      documentId: firstString(props.sourceUri, props.documentId, component.id),
      semanticOwner: "Norn",
      fallbackKind: "terminal-outline",
    };
  }

  if (componentKind === "embed.tex") {
    return {
      pluginId: "tex.math",
      projectionKind: texProjectionKind(props),
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["embed.tex", "tex.inline", "tex.block"],
      documentId: firstString(props.sourceUri, props.source, component.id),
      semanticOwner: "EvePlugins",
      fallbackKind: "source-text",
    };
  }

  return null;
}

function texProjectionKind(props) {
  const display = firstString(props.display, "inline");
  if (display === "block") return "tex-math-terminal-block-source";
  if (display === "page") return "tex-math-terminal-page-source";
  return "tex-math-terminal-inline-source";
}

function fitLine(value, width) {
  const text = String(value || "");
  if (text.length <= width) return text;
  return `${text.slice(0, Math.max(0, width - 3))}...`;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}
