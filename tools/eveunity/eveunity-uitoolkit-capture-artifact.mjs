import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildUnityCaptureRequest, loadJsonFile, writeCaptureRequest } from "./eveunity-capture-contract.mjs";

export function buildUnityUiToolkitCaptureArtifact({
  advertisement,
  capabilityManifest,
  surfaceDocument,
  advertisementPath = "",
  capabilityManifestPath = "",
  captureSurfaceId = "",
  stamp = "latest",
} = {}) {
  const request = buildUnityCaptureRequest({
    advertisement,
    capabilityManifest,
    advertisementPath,
    capabilityManifestPath,
    captureSurfaceId,
    stamp,
  });
  const projection = buildUnityUiToolkitProjection(surfaceDocument, advertisement, request.surfaceId);
  validateProjectionArtifact(projection, request);

  return {
    request,
    projection: {
      ...projection,
      artifactKind: "json-projection",
      captureKind: "unity-uitoolkit-projection-json",
      sourceAdvertisementPath: request.sourceAdvertisementPath,
      sourceCapabilityManifestPath: request.sourceCapabilityManifestPath,
      issuedAtUtc: request.issuedAtUtc,
    },
  };
}

export function buildUnityUiToolkitProjection(surfaceDocument, providerAdvertisement, requestedSurfaceId = "") {
  const selected = selectSurface(providerAdvertisement, requestedSurfaceId);
  const document = normalizeSurfaceDocument(surfaceDocument);
  if (document.surfaceId !== selected.surfaceId) {
    throw new Error(`Surface document ${document.surfaceId} does not match advertised Unity UI Toolkit surface ${selected.surfaceId}.`);
  }

  return {
    type: "unity-uitoolkit-projection",
    schema: "gamecult.eve.unity_uitoolkit_projection.v1",
    runtimeId: "unity-uitoolkit",
    providerId: selected.providerId,
    surfaceId: selected.surfaceId,
    projectionKind: selected.worldInteraction.projectionKind,
    commandBoundary: selected.worldInteraction.commandBoundary,
    receiptSchema: selected.worldInteraction.receiptSchema,
    ownership: selected.worldInteraction.ownership,
    root: buildUiNode(document.root),
  };
}

export function writeUnityUiToolkitCaptureArtifact({ request, projection }, { outputPath, requestOutputPath = "" } = {}) {
  if (!outputPath) throw new Error("outputPath is required");
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(projection, null, 2)}\n`, "utf8");
  if (requestOutputPath) {
    writeCaptureRequest(request, requestOutputPath);
  }
}

function selectSurface(providerAdvertisement, requestedSurfaceId = "") {
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
    worldInteraction: normalizeWorldInteraction(surface.worldInteraction),
  };
}

function normalizeProviderAdvertisement(providerAdvertisement) {
  if (!providerAdvertisement || typeof providerAdvertisement !== "object") {
    throw new Error("Provider advertisement is required.");
  }
  const providerId = firstString(providerAdvertisement.providerId);
  if (!providerId) throw new Error("Provider advertisement missing providerId.");
  const surfaces = Array.isArray(providerAdvertisement.surfaces)
    ? providerAdvertisement.surfaces
      .filter(surface => surface && typeof surface === "object" && surface.surfaceId)
      .map(surface => ({
        ...surface,
        surfaceId: String(surface.surfaceId),
      }))
    : [];
  if (!surfaces.length) throw new Error(`Provider ${providerId} advertises no surfaces.`);
  return { ...providerAdvertisement, providerId, surfaces };
}

function normalizeSurfaceDocument(surfaceDocument) {
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

function buildUiNode(component) {
  const source = objectValue(component);
  const children = Array.isArray(source.children) ? source.children.map(buildUiNode) : [];
  const embeddedDocuments = normalizeEmbeddedDocuments(source.embeddedDocuments);
  const componentKind = firstString(source.kind);
  const pluginProjection = buildPluginProjection(componentKind, source);
  const classNames = [
    "eve-component",
    `eve-kind-${safeClass(componentKind)}`,
    ...pluginClassNames(pluginProjection),
  ];
  return {
    id: firstString(source.id),
    componentKind,
    visualElementKind: visualElementKind(componentKind),
    classNames,
    props: objectValue(source.props),
    layout: objectValue(source.layout),
    style: objectValue(source.style),
    stateBindingCount: Array.isArray(source.stateBindings) ? source.stateBindings.length : 0,
    embeddedDocumentCount: embeddedDocuments.length,
    embeddedDocuments,
    ...(pluginProjection ? { pluginProjection } : {}),
    children,
  };
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

function visualElementKind(componentKind) {
  if (!componentKind) return "VisualElement";
  if (componentKind === "text" || componentKind === "label" || componentKind.startsWith("text.")) return "Label";
  if (componentKind === "control.button" || componentKind === "control.popup") return "Button";
  if (componentKind === "control.text" || componentKind === "control.input.text") return "TextField";
  if (componentKind === "vn.stage") return "SaiVisualNovelStageElement";
  if (componentKind === "panel.dialogue" || componentKind === "text.dialogue") return "SaiVisualNovelDialogueElement";
  if (componentKind === "rail.actions") return "SaiVisualNovelActionRail";
  if (componentKind === "embed.norn") return "NornGraphElement";
  if (componentKind === "embed.tex") return "TeXMathElement";
  return "VisualElement";
}

function pluginClassNames(pluginProjection) {
  if (!pluginProjection) return [];
  return [
    "eve-plugin-projection",
    `eve-plugin-${safeClass(pluginProjection.pluginId)}`,
    safeClass(pluginProjection.projectionKind),
  ].filter(Boolean);
}

function buildPluginProjection(componentKind, component) {
  const props = objectValue(component.props);
  if (componentKind === "vn.stage") {
    return {
      pluginId: "sai.vn",
      projectionKind: "sai-vn-stage",
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["vn.stage", "story.choose", "story.continue", "story.jump"],
      command: "story.choose",
      documentId: firstString(props.storyId, component.id),
      semanticOwner: "Sai",
      availability: "required",
    };
  }

  if (componentKind === "embed.norn") {
    return {
      pluginId: "norn.graph",
      projectionKind: "norn-graph",
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["embed.norn"],
      command: "graph.focus",
      documentId: firstString(props.sourceUri, props.documentId, component.id),
      semanticOwner: "Norn",
      availability: "optional-nested",
    };
  }

  if (componentKind === "embed.tex") {
    return {
      pluginId: "tex.math",
      projectionKind: texProjectionKind(props),
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["embed.tex", "tex.inline", "tex.block"],
      command: "",
      documentId: firstString(props.sourceUri, props.source, component.id),
      semanticOwner: "EvePlugins",
      availability: "optional-nested",
    };
  }

  return null;
}

function texProjectionKind(props) {
  const display = firstString(props.display, "inline");
  return display === "block" ? "tex-math-block" : "tex-math-inline";
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

function validateProjectionArtifact(projection, request) {
  if (projection.schema !== "gamecult.eve.unity_uitoolkit_projection.v1") {
    throw new Error(`Unexpected Unity UI Toolkit projection schema: ${projection.schema || ""}`);
  }
  for (const [field, expected] of [
    ["runtimeId", request.runtimeId],
    ["providerId", request.providerId],
    ["surfaceId", request.surfaceId],
    ["projectionKind", request.projectionKind],
    ["commandBoundary", request.commandBoundary],
    ["receiptSchema", request.receiptSchema],
  ]) {
    if ((projection[field] || "") !== (expected || "")) {
      throw new Error(`Unity UI Toolkit projection ${field} expected ${expected || ""} got ${projection[field] || ""}`);
    }
  }
  if (!projection.root || !projection.root.id) {
    throw new Error("Unity UI Toolkit projection artifact must contain a root UI node");
  }
}

function safeClass(value) {
  const text = firstString(value, "unknown");
  return text.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "unknown";
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

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  for (const required of ["advertisement", "capability", "surface", "output"]) {
    if (!args[required]) {
      throw new Error(`missing required --${required}`);
    }
  }
  const stamp = args.stamp || "latest";
  const artifact = buildUnityUiToolkitCaptureArtifact({
    advertisement: loadJsonFile(args.advertisement),
    capabilityManifest: loadJsonFile(args.capability),
    surfaceDocument: loadJsonFile(args.surface),
    advertisementPath: args.advertisement,
    capabilityManifestPath: args.capability,
    captureSurfaceId: args["surface-id"] || "",
    stamp,
  });
  writeUnityUiToolkitCaptureArtifact(artifact, {
    outputPath: args.output,
    requestOutputPath: args["request-output"] || "",
  });
  process.stdout.write(`${args.output}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath === modulePath) {
  runCli();
}
