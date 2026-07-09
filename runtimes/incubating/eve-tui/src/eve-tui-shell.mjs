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
  const ownLine = fitLine(`${indent}${terminalElementKind(kind)} ${id}${label ? ` ${label}` : ""}`, width);
  const children = Array.isArray(source.children) ? source.children : [];
  return [
    ownLine,
    ...children.flatMap(child => buildComponentLines(child, width, depth + 1)),
  ];
}

function terminalElementKind(componentKind) {
  if (!componentKind) return "empty";
  if (componentKind.startsWith("control.")) return "command";
  if (componentKind.startsWith("embed.")) return "plugin";
  if (componentKind === "surface.slot") return "slot";
  if (componentKind.startsWith("field.") || componentKind.startsWith("world.")) return "world";
  if (componentKind.startsWith("text.") || componentKind === "text" || componentKind === "label") return "text";
  if (componentKind === "metric") return "metric";
  return componentKind;
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
