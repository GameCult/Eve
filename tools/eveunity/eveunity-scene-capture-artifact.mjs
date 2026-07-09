import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildUnityCaptureRequest, loadJsonFile, writeCaptureRequest } from "./eveunity-capture-contract.mjs";

export function buildUnitySceneCaptureArtifact({
  advertisement,
  capabilityManifest,
  surfaceDocument,
  advertisementPath = "",
  capabilityManifestPath = "",
  stamp = "latest",
} = {}) {
  const request = buildUnityCaptureRequest({
    advertisement,
    capabilityManifest,
    advertisementPath,
    capabilityManifestPath,
    stamp,
  });
  const projection = buildUnitySceneProjection(surfaceDocument, advertisement, request.surfaceId);
  validateProjectionArtifact(projection, request);

  return {
    request,
    projection: {
      ...projection,
      artifactKind: "json-projection",
      captureKind: "unity-scene-projection-json",
      sourceAdvertisementPath: request.sourceAdvertisementPath,
      sourceCapabilityManifestPath: request.sourceCapabilityManifestPath,
      issuedAtUtc: request.issuedAtUtc,
    },
  };
}

export function buildUnitySceneProjection(surfaceDocument, providerAdvertisement, requestedSurfaceId = "") {
  const selected = selectSurface(providerAdvertisement, requestedSurfaceId);
  const document = normalizeSurfaceDocument(surfaceDocument);
  if (document.surfaceId !== selected.surfaceId) {
    throw new Error(`Surface document ${document.surfaceId} does not match advertised Unity scene surface ${selected.surfaceId}.`);
  }

  return {
    type: "unity-scene-projection",
    schema: "gamecult.eve.unity_scene_projection.v1",
    runtimeId: "unity-scene",
    providerId: selected.providerId,
    surfaceId: selected.surfaceId,
    projectionKind: selected.worldInteraction.projectionKind,
    commandBoundary: selected.worldInteraction.commandBoundary,
    receiptSchema: selected.worldInteraction.receiptSchema,
    ownership: selected.worldInteraction.ownership,
    root: buildSceneNode(document.root),
  };
}

export function writeUnitySceneCaptureArtifact({ request, projection }, { outputPath, requestOutputPath = "" } = {}) {
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
  const providerId = String(providerAdvertisement.providerId || "");
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

function buildSceneNode(component) {
  const source = objectValue(component);
  const children = Array.isArray(source.children) ? source.children.map(buildSceneNode) : [];
  const embeddedDocuments = normalizeEmbeddedDocuments(source.embeddedDocuments);
  const componentKind = firstString(source.kind);
  const pluginProjection = buildPluginProjection(componentKind, source);
  return {
    id: firstString(source.id),
    componentKind,
    sceneObjectKind: sceneObjectKind(componentKind),
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

function sceneObjectKind(componentKind) {
  if (!componentKind) return "empty";
  if (componentKind === "vn.stage") return "sai-vn-scene-stage";
  if (componentKind === "panel.dialogue" || componentKind === "text.dialogue") return "sai-vn-scene-dialogue";
  if (componentKind === "rail.actions") return "sai-vn-scene-action-rail";
  if (componentKind.startsWith("control.")) return "command-control";
  if (componentKind === "embed.norn") return "norn-graph-scene-projection";
  if (componentKind === "embed.tex") return "tex-math-scene-projection";
  if (componentKind.startsWith("embed.")) return "plugin-placeholder";
  if (componentKind === "surface.slot") return "embedded-surface-slot";
  if (componentKind.startsWith("field.") || componentKind.startsWith("world.")) return "world-projection-node";
  if (componentKind.startsWith("text.") || componentKind === "text" || componentKind === "label") return "scene-label";
  return "scene-node";
}

function buildPluginProjection(componentKind, component) {
  const props = objectValue(component.props);
  if (componentKind === "vn.stage") {
    return {
      pluginId: "sai.vn",
      projectionKind: "sai-vn-scene-stage",
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["vn.stage", "story.choose", "story.continue", "story.jump"],
      command: "story.choose",
      documentId: firstString(props.storyId, component.id),
      semanticOwner: "Sai",
    };
  }

  if (componentKind === "embed.norn") {
    return {
      pluginId: "norn.graph",
      projectionKind: "norn-graph-scene-projection",
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["embed.norn"],
      command: "graph.node.activate",
      documentId: firstString(props.sourceUri, props.documentId, component.id),
      semanticOwner: "Norn",
    };
  }

  if (componentKind === "embed.tex") {
    return {
      pluginId: "tex.math",
      projectionKind: texProjectionKind(props),
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["embed.tex", "tex.inline", "tex.block", "tex.scene-placement"],
      command: "",
      documentId: firstString(props.sourceUri, props.source, component.id),
      semanticOwner: "EvePlugins",
    };
  }

  return null;
}

function texProjectionKind(props) {
  const display = firstString(props.display, "inline");
  if (display === "block") return "tex-math-scene-projection";
  if (display === "page") return "tex-math-scene-page-projection";
  return "tex-math-scene-inline-projection";
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
  if (projection.schema !== "gamecult.eve.unity_scene_projection.v1") {
    throw new Error(`Unexpected Unity scene projection schema: ${projection.schema || ""}`);
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
      throw new Error(`Unity scene projection ${field} expected ${expected || ""} got ${projection[field] || ""}`);
    }
  }
  if (!projection.root || !projection.root.id) {
    throw new Error("Unity scene projection artifact must contain a root scene node");
  }
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
  const artifact = buildUnitySceneCaptureArtifact({
    advertisement: loadJsonFile(args.advertisement),
    capabilityManifest: loadJsonFile(args.capability),
    surfaceDocument: loadJsonFile(args.surface),
    advertisementPath: args.advertisement,
    capabilityManifestPath: args.capability,
    stamp,
  });
  writeUnitySceneCaptureArtifact(artifact, {
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
