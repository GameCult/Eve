import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { applyEveStateBindingValue, createEveCommandIntent, createInventoryDropIntent, createInventoryPlacementPreview, createWorldActionIntent, normalizeFieldsDocument, projectSemanticListItem, projectSemanticListItems, projectWorldScene, resolveRequiredPluginAdapters, selectAdvertisedSurface } from "../dist/index.js";

test("applies provider state bindings to component props instead of receipt diagnostics", () => {
  const component = { props: { value: 1.2 } };
  applyEveStateBindingValue(component, {
    targetProp: "value",
    pointerId: "voidbot.swarm.globalHeat",
    sourceId: "voidbot.swarm_state_snapshot:voidbot-swarm",
    schemaId: "voidbot.swarm_state_snapshot.v1",
    routeKind: "cultmesh-rudp",
  }, 0.35);
  assert.equal(component.props.value, 0.35);
});

test("selects the requested surface from provider authority", () => {
  const provider = {
    providerId: "example",
    surfaces: [
      { surfaceId: "example.menu", status: "available" },
      { surfaceId: "example.world", status: "available" },
    ],
  };

  assert.equal(selectAdvertisedSurface(provider, "example.world").surfaceId, "example.world");
  assert.throws(() => selectAdvertisedSurface(provider, "example.missing"), /does not advertise surface/);
});

test("world interactions emit provider-routed command intents without local authority", () => {
  const intent = createWorldActionIntent("world.move", {
    actorEntityId: "entity.player",
    directionX: 1,
    directionY: 0,
    scalar: 1,
  }, {
    activeSurfaceId: "example.world",
    clientId: "browser.world-test",
    provider: {
      providerId: "example",
      surfaces: [{
        surfaceId: "example.world",
        worldInteraction: {
          commandBoundary: "example.commands",
          receiptSchema: "example.receipt.v1",
        },
      }],
    },
  });

  assert.equal(intent.operation.operationId, "world.move");
  assert.equal(intent.operation.schemaId, "gamecult.eve.operation_payload.v1");
  assert.ok(intent.operation.idempotencyKey);
  assert.equal(intent.operation.routeHint.sourceVersion, 0);
  assert.equal(intent.commandBoundary, "example.commands");
  assert.equal(intent.receiptSchema, "example.receipt.v1");
  assert.equal(intent.payload.actorEntityId, "entity.player");
  assert.equal(intent.payload.directionX, 1);
});

test("ordinary controls preserve provider-declared payload fields", () => {
  const intent = createEveCommandIntent("aetheria.hangar.launch", {
    label: "LAUNCH",
    command: "aetheria.hangar.launch",
    "payload.expectedProgressionVerseId": "gamecult.aetheria",
    "payload.expectedProgressionSourceRevision": "7",
  }, {
    activeSurfaceId: "aetheria.hangar",
    clientId: "browser.hangar-test",
    provider: { providerId: "aetheria", surfaces: [{
      surfaceId: "aetheria.hangar",
      worldInteraction: {
        commandBoundary: "aetheria.hangar.commands",
        receiptSchema: "gamecult.eve.command_receipt.v1",
      },
    }] },
  });

  assert.equal(intent.payload.expectedProgressionVerseId, "gamecult.aetheria");
  assert.equal(intent.payload.expectedProgressionSourceRevision, "7");
  assert.equal(intent.payload.label, undefined);
  assert.equal(intent.payload.command, undefined);
});

test("inventory drops select the provider-advertised operation and preserve spatial identity", () => {
  const intent = createInventoryDropIntent({
    sourceKind: "cargo",
    sourceEntityKey: "zone.0.entity.1",
    sourceIndex: 2,
    itemKey: "ore",
    quantity: 4,
    x: 3,
    y: 5,
  }, {
    targetKind: "equipment",
    targetEntityKey: "zone.0.entity.1",
    targetIndex: -1,
    "dropCommand.cargo": "aetheria.daemon.commands.EquipItem",
    "payload.shipId": "hangar.ship.1",
    "payload.expectedHangarRevision": "42",
  }, 7, 9, {
    activeSurfaceId: "aetheria.refit",
    clientId: "browser.inventory-test",
    provider: { providerId: "aetheria", surfaces: [{
      surfaceId: "aetheria.refit",
      worldInteraction: {
        commandBoundary: "aetheria.refit.commands",
        receiptSchema: "gamecult.eve.command_receipt.v1",
      },
    }] },
  });

  assert.equal(intent.operation.operationId, "aetheria.daemon.commands.EquipItem");
  assert.equal(intent.payload.originEntityKey, "zone.0.entity.1");
  assert.equal(intent.payload.originCargoIndex, 2);
  assert.equal(intent.payload.destinationEntityKey, "zone.0.entity.1");
  assert.equal(intent.payload.destinationX, 7);
  assert.equal(intent.payload.destinationY, 9);
  assert.equal(intent.payload.hasDestinationPosition, true);
  assert.equal(intent.payload.shipId, "hangar.ship.1");
  assert.equal(intent.payload.expectedHangarRevision, "42");
});

test("inventory placement previews preserve irregular cells and reject occupancy", () => {
  const source = { id: "moving", shapeCells: "0,0;1,0;0,1" };
  const target = {
    columns: 4,
    rows: 3,
    validCells: "0,0;1,0;2,0;3,0;0,1;1,1;2,1;3,1;0,2;1,2;2,2;3,2",
  };
  const children = [{
    id: "installed",
    kind: "inventory.item",
    props: { x: 2, y: 1, shapeCells: "0,0" },
    children: [],
  }];

  assert.deepEqual(createInventoryPlacementPreview(source, target, children, 0, 0), {
    valid: true,
    reason: "valid",
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
  });
  assert.equal(createInventoryPlacementPreview(source, target, children, 1, 1).reason, "occupied");
  assert.equal(createInventoryPlacementPreview(source, target, children, 3, 2).reason, "outside-grid");
});

test("inventory drops fail closed without an operation for the source kind", () => {
  assert.equal(createInventoryDropIntent(
    { sourceKind: "docking-bay", itemKey: "hangar" },
    { targetKind: "equipment", "dropCommand.cargo": "equip" },
    0,
    0,
  ), undefined);
});

test("projects provider world entities into a normalized tactical plane", () => {
  const entities = projectWorldScene({
    kind: "world.scene3d",
    children: [
      { id: "player", kind: "world.entity3d", props: { position: "-10, 0, -20", faction: "player", controllable: "true" } },
      { id: "target", kind: "world.entity3d", props: { position: "30, 0, 40", faction: "hostile" } },
    ],
  });

  assert.equal(entities.length, 2);
  assert.equal(entities[0].controlled, true);
  assert.equal(entities[1].faction, "hostile");
  assert.ok(entities.every(entity => entity.xPercent >= 6 && entity.xPercent <= 94));
  assert.ok(entities.every(entity => entity.yPercent >= 6 && entity.yPercent <= 94));
});

test("projects unknown semantic items through the generic list contract", () => {
  const item = projectSemanticListItem({
    id: "worker.one",
    kind: "agent.item",
    props: {
      label: "Foundry Tug",
      status: "working",
      detail: "Hauling ore",
      badges: "haul, tow, explore",
      providerSpecificState: "remains provider-owned",
    },
  });

  assert.deepEqual(item, {
    label: "Foundry Tug",
    status: "working",
    detail: "Hauling ore",
    badges: ["haul", "tow", "explore"],
  });
});

test("projects provider-owned list data through the same semantic item contract", () => {
  assert.deepEqual(projectSemanticListItems([
    { label: "Face One", status: "working", detail: "Current turn", badges: ["repo", "live"] },
    { displayName: "Face Two", state: "ready", repoName: "VoidBot" },
  ]), [
    { label: "Face One", status: "working", detail: "Current turn", badges: ["repo", "live"] },
    { label: "Face Two", status: "ready", detail: "VoidBot", badges: [] },
  ]);
});

test("command intents use the active surface advertisement boundary", () => {
  const intent = createEveCommandIntent("aetheria.daemon.editor.inspect", {
    action: {
      commandBoundary: "component.fallback.boundary",
      receiptSchema: "component.fallback.receipt.v1",
      target: "component.fallback.target",
    },
  }, {
    activeSurfaceId: "aetheria.daemon.editor",
    clientId: "browser.reference",
    provider: {
      providerId: "aetheria",
      surfaces: [
        {
          surfaceId: "aetheria.daemon.game",
          worldInteraction: {
            commandBoundary: "aetheria.daemon.game.commands",
            receiptSchema: "aetheria.game_receipt.v1",
          },
        },
        {
          surfaceId: "aetheria.daemon.editor",
          worldInteraction: {
            commandBoundary: "aetheria.daemon.editor.commands",
            receiptSchema: "aetheria.editor_receipt.v1",
          },
        },
      ],
    },
  });

  assert.equal(intent.surfaceId, "aetheria.daemon.editor");
  assert.equal(intent.commandBoundary, "aetheria.daemon.editor.commands");
  assert.equal(intent.receiptSchema, "aetheria.editor_receipt.v1");
});

test("the browser fields adapter decodes plugin wire tuples", () => {
  const gravity = normalizeFieldsDocument("gamecult.fields.gravity.v1", [
    "gamecult.fields.gravity.v1", 17, "now", 4.2, "run", 3, "zone", [-10, -20, 30, 40],
    [["body", "orbit", "planet", 1, 2, 3, 4, 5, 6, 7, 8]],
    [["body", "orbit", "World", "planet", 1, 2, 3, false, {}, ["icon", "image", "cultmesh://asset", "cultmesh", "hash", "image/png", {}]]],
    90, 12, 2, 0.5,
  ]);

  assert.equal(gravity.frameId, 17);
  assert.deepEqual(gravity.viewport, { minX: -10, minY: -20, maxX: 30, maxY: 40 });
  assert.equal(gravity.gravityInfluences[0].waveSpeed, 8);
  assert.equal(gravity.bodies[0].iconAsset.uri, "cultmesh://asset");
});

test("the browser fields adapter leaves unrelated provider documents untouched", () => {
  const document = ["provider.schema.v1", 1, 2];
  assert.equal(normalizeFieldsDocument("provider.schema.v1", document), document);
});

test("required plugin advertisements resolve runtime adapters and report capability gaps", () => {
  const surface = {
    surfaceId: "world",
    requiresPlugins: [{
      pluginId: "fields.surface",
      availability: "required",
      requiredCapabilities: ["field.surface2d", "gravity.surface"],
    }],
  };
  assert.equal(resolveRequiredPluginAdapters(surface)[0].pluginId, "fields.surface");
  assert.throws(
    () => resolveRequiredPluginAdapters(surface, []),
    /Missing required Eve plugin adapter fields\.surface/,
  );
  assert.throws(
    () => resolveRequiredPluginAdapters(surface, [{
      pluginId: "fields.surface", capabilities: ["field.surface2d"], schemas: [], normalizeDocument: (_, value) => value,
    }]),
    /lacks required capabilities: gravity\.surface/,
  );
});

test("the generic component lowerer contains no fields plugin authority", () => {
  const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /gamecult\.fields|field\.surface2d|gravity\.surface|drawGravity|renderSplats/);
});
