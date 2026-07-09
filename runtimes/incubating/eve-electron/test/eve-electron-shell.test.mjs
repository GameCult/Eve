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

test("lowers provider surface trees into an Electron shell projection", () => {
  const shell = new EveElectronShell();
  const projection = shell.lowerSurface(surfaceDocument(), advertisement(), "aetheria.daemon.game");

  assert.equal(projection.schema, "gamecult.eve.electron_shell_projection.v1");
  assert.equal(projection.providerId, "aetheria");
  assert.equal(projection.surfaceId, "aetheria.daemon.game");
  assert.equal(projection.projectionKind, "provider-authored-world-surface");
  assert.equal(projection.commandBoundary, "aetheria.daemon.commands");
  assert.equal(projection.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(projection.root.id, "aetheria.daemon.game.root");
  assert.equal(projection.root.children.length, 3);
  assert.equal(projection.root.children[0].shellElementKind, "world-projection-node");
  assert.equal(projection.root.children[0].props.binding, "cultmesh://aetheria/world/entities");
  assert.equal(projection.root.children[0].stateBindingCount, 1);
  assert.equal(projection.root.children[1].shellElementKind, "command-control");
  assert.equal(projection.root.children[1].props.command, "aetheria.daemon.commands");
  assert.equal(projection.root.children[2].shellElementKind, "plugin-placeholder");
  assert.equal(projection.root.children[2].embeddedDocumentCount, 1);
});

test("rejects surface documents that do not match the advertised target", () => {
  const shell = new EveElectronShell();
  assert.throws(
    () => shell.lowerSurface(surfaceDocument("aetheria.daemon.game"), advertisement(), "aetheria.daemon.editor"),
    /does not match advertised Electron surface/,
  );
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

function surfaceDocument(surfaceId = "aetheria.daemon.game") {
  return {
    type: "surface-state",
    schema: "gamecult.eve.surface.v1",
    providerId: "aetheria",
    providerKind: "game.runtime",
    title: "Aetheria world",
    version: 1,
    updatedAtUtc: "2026-07-09T00:00:00Z",
    surface: {
      id: surfaceId,
      root: {
        id: `${surfaceId}.root`,
        kind: "surface",
        props: {},
        children: [
          {
            id: `${surfaceId}.entities`,
            kind: "field.surface2d",
            props: {
              binding: "cultmesh://aetheria/world/entities",
            },
            stateBindings: [
              {
                target: "entities",
                pointerId: "cultmesh://aetheria/world/entities",
              },
            ],
            children: [],
          },
          {
            id: `${surfaceId}.focus`,
            kind: "control.button",
            props: {
              command: "aetheria.daemon.commands",
              commandId: "aetheria.daemon.focus",
            },
            children: [],
          },
          {
            id: `${surfaceId}.norn`,
            kind: "embed.norn",
            props: {},
            embeddedDocuments: [
              {
                slotId: "norn.map",
                documentId: "cultmesh://aetheria/norn/map",
                schemaId: "gamecult.eve.surface.v1",
                presentationKind: "electron-overlay",
              },
            ],
            children: [],
          },
        ],
      },
      styles: [],
    },
    commands: [],
  };
}
