import assert from "node:assert/strict";
import test from "node:test";
import { createEveCommandIntent, selectAdvertisedSurface } from "../dist/index.js";

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
