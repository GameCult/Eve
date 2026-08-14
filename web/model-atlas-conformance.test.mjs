import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findProviderCatalogEntry, mergeProviderAdvertisement } from "./provider-advertisements.mjs";

const projectionSchema = "gamecult.model.entanglement_projection.v0";
const projectionSource = "cultmesh://gamecult-local/asgard/starfire/epiphany/model-atlas/entanglements#";
const domainMutationRoute = "gamecult://swarm/{swarm_id}/workspace/{workspace_id}/epiphany/modeling";
const catalog = readJson("./local-provider-catalog.json");
const advertisement = readJson("./fixtures/epiphany-model-atlas.provider-advertisement.json");
const surface = readJson("./fixtures/epiphany-model-atlas-surface.json");
const conformance = readJson("./fixtures/epiphany-model-atlas-surface.conformance.json");

function readJson(relativeUrl) {
  return JSON.parse(readFileSync(new URL(relativeUrl, import.meta.url), "utf8"));
}

function* walk(component) {
  yield component;
  for (const child of component.children || []) yield* walk(child);
}

function component(id) {
  return [...walk(surface.surface.root)].find(candidate => candidate.id === id);
}

test("advertises one canonical Model Atlas surface to GUI and TUI consumers", () => {
  const catalogProvider = findProviderCatalogEntry(catalog, "epiphany.model-atlas");
  const merged = mergeProviderAdvertisement(catalogProvider, advertisement);

  assert.equal(merged.surfaces.length, 1);
  assert.equal(advertisement.providerId, "epiphany.model-atlas");
  assert.equal(advertisement.serviceId, "epiphany.model-entanglement-projector");
  assert.equal(advertisement.verseId, "gamecult-local");
  assert.equal(advertisement.rootVerse, "asgard");
  assert.equal(advertisement.canonicalService, "asgard.epiphany.model-atlas");
  assert.equal(advertisement.locatedService, "asgard.starfire.epiphany.model-atlas");
  assert.equal(advertisement.cultMeshAddress, "cultmesh://gamecult-local/asgard/starfire/epiphany/model-atlas");
  assert.equal(merged.surfaces[0].surfaceId, surface.surface.id);
  assert.equal(merged.surfaces[0].url, "./fixtures/epiphany-model-atlas-surface.json");
  assert.deepEqual(merged.surfaces[0].loweringTargets, ["gui", "tui"]);
  assert.deepEqual(conformance.loweringTargets, ["gui", "tui"]);
  assert.equal(surface.surface.root.kind, "surface");
  assert.equal("nodes" in surface, false);
  assert.equal("selectedNodeId" in surface, false);
  assert.equal(merged.surfaces[0].domainMutationRoute, domainMutationRoute);
  assert.equal(surface.surface.root.props.domainMutationRoute, domainMutationRoute);
});

test("keeps attention primary while retaining drilldown and a secondary graph", () => {
  const root = surface.surface.root;
  assert.equal(root.props.defaultView, "attention");
  assert.deepEqual(root.props.viewOrder, ["attention", "drilldown", "graph"]);
  assert.equal(root.children[0].id, "epiphany.model-atlas.attention");
  assert.equal(root.children[0].props.default, true);

  const attention = component("epiphany.model-atlas.attention.items");
  const drilldown = component("epiphany.model-atlas.drilldown");
  const graph = component("epiphany.model-atlas.graph");
  const linearGraph = component("epiphany.model-atlas.graph.linear");

  assert.equal(attention.kind, "list");
  assert.equal(drilldown.kind, "panel");
  assert.equal(graph.kind, "graph");
  assert.equal(graph.props.role, "secondary");
  assert.equal(graph.props.presentationFallback, "children");
  assert.equal(linearGraph.kind, "list");
  assert.equal(linearGraph.props.role, "linear-fallback");
  assert.ok(graph.children.includes(linearGraph));
});

test("binds every modeled value to the Epiphany-owned CultMesh projection", () => {
  const bindings = [...walk(surface.surface.root)].flatMap(candidate => candidate.stateBindings || []);

  assert.ok(bindings.length >= 9);
  assert.ok(bindings.every(binding => binding.schemaId === projectionSchema));
  assert.ok(bindings.every(binding => binding.sourceId.startsWith(projectionSource)));
  assert.ok(bindings.every(binding => binding.routeKind === "network"));
  assert.deepEqual(
    component("epiphany.model-atlas.graph").stateBindings.map(binding => binding.targetProp),
    ["nodes", "edges"],
  );
  assert.equal(
    component("epiphany.model-atlas.graph.linear").stateBindings[0].schemaId,
    component("epiphany.model-atlas.graph").stateBindings[1].schemaId,
  );
});

test("limits select and filter operations to provider-owned presentation state", () => {
  const advertisedCommands = new Map(advertisement.commands.map(command => [command.command, command]));
  const surfaceCommands = new Map(surface.commands.map(command => [command.command, command]));
  const controlCommands = [...walk(surface.surface.root)]
    .map(candidate => candidate.props?.command)
    .filter(Boolean);

  assert.deepEqual([...surfaceCommands.keys()].sort(), [...advertisedCommands.keys()].sort());
  assert.deepEqual([...surfaceCommands.keys()].sort(), [
    "epiphany.model-atlas.presentation.filter",
    "epiphany.model-atlas.presentation.select",
  ]);
  assert.deepEqual(controlCommands.sort(), [...surfaceCommands.keys()].sort());
  for (const command of [...advertisement.commands, ...surface.commands]) {
    assert.equal(command.presentationOnly, true);
    assert.equal(command.domainStateEffects, "none");
    assert.equal(command.transport, "cultmesh-command");
    assert.equal(command.authority, "epiphany.model-atlas.presentation");
    assert.notEqual(command.payloadSchema, projectionSchema);
  }
});
