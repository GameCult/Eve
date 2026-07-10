import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createEveCommandIntent, createWorldActionIntent, normalizeFieldsDocument, projectWorldScene, resolveRequiredPluginAdapters, selectAdvertisedSurface } from "../dist/index.js";

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

  assert.equal(intent.command, "world.move");
  assert.equal(intent.commandBoundary, "example.commands");
  assert.equal(intent.receiptSchema, "example.receipt.v1");
  assert.equal(intent.payload.actorEntityId, "entity.player");
  assert.equal(intent.payload.directionX, 1);
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
