import assert from "node:assert/strict";
import test from "node:test";
import { EveElectronShell } from "../src/eve-electron-shell.mjs";

test("selects the active advertised provider surface", () => {
  const shell = new EveElectronShell();
  const selected = shell.selectSurface(advertisement(), "aetheria.daemon.editor");

  assert.equal(selected.providerId, "aetheria");
  assert.equal(selected.surfaceId, "aetheria.daemon.editor");
  assert.equal(selected.worldInteraction.commandBoundary, "aetheria.daemon.commands");
  assert.equal(selected.worldInteraction.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
});

test("command intents carry provider-advertised boundaries over component fallback", () => {
  const shell = new EveElectronShell();
  const intent = shell.createCommandIntent(
    advertisement(),
    "aetheria.daemon.game",
    "aetheria.daemon.commands",
    {
      action: {
        commandBoundary: "component.fallback.boundary",
        receiptSchema: "component.fallback.receipt.v1",
        target: "component.fallback.target",
      },
      commandId: "aetheria.daemon.focus",
    },
  );

  assert.equal(intent.schema, "gamecult.eve.command.v1");
  assert.equal(intent.providerId, "aetheria");
  assert.equal(intent.surfaceId, "aetheria.daemon.game");
  assert.equal(intent.commandBoundary, "aetheria.daemon.commands");
  assert.equal(intent.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(intent.clientId, "electron-shell");
});

function advertisement() {
  return {
    schema: "gamecult.eve.provider_advertisement.v1",
    providerId: "aetheria",
    surfaces: [
      {
        surfaceId: "aetheria.daemon.game",
        transport: "local-json",
        url: "web/fixtures/aetheria-world-surface.json",
        worldInteraction: {
          projectionKind: "provider-authored-world-surface",
          commandBoundary: "aetheria.daemon.commands",
          receiptSchema: "aetheria.eve_command_acceptance_status.v1",
          ownership: "provider-owns-world-state-assets-command-acceptance-and-receipts",
        },
      },
      {
        surfaceId: "aetheria.daemon.editor",
        transport: "local-json",
        url: "web/fixtures/aetheria-world-surface.json",
        worldInteraction: {
          projectionKind: "provider-authored-world-editor-surface",
          commandBoundary: "aetheria.daemon.commands",
          receiptSchema: "aetheria.eve_command_acceptance_status.v1",
          ownership: "provider-owns-editor-state-assets-command-acceptance-and-receipts",
        },
      },
    ],
  };
}
