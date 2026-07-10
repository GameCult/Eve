import assert from "node:assert/strict";
import test from "node:test";
import { createEveCommandIntent, createWorldActionIntent, projectWorldScene, selectAdvertisedSurface } from "../dist/index.js";

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
