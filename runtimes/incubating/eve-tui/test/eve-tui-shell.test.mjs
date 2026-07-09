import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateSchemaSubset } from "../../test-support/schema-subset.mjs";
import { EveTuiShell } from "../src/eve-tui-shell.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const tuiGridSchema = JSON.parse(readFileSync(
  path.join(repoRoot, "schemas/gamecult.eve.tui_grid.v1.schema.json"),
  "utf8",
));

test("selects advertised provider surfaces for compact projection", () => {
  const shell = new EveTuiShell({ width: 48 });
  const selected = shell.selectSurface(advertisement(), "aetheria.daemon.editor");

  assert.equal(selected.providerId, "aetheria");
  assert.equal(selected.surfaceId, "aetheria.daemon.editor");
  assert.equal(selected.worldInteraction.commandBoundary, "aetheria.daemon.commands");
  assert.equal(selected.worldInteraction.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
});

test("command intents carry provider-advertised boundaries", () => {
  const shell = new EveTuiShell();
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
  assert.equal(intent.clientId, "tui");
});

test("summary grid is explicitly lossy provider-shell evidence", () => {
  const shell = new EveTuiShell({ width: 36 });
  const grid = shell.renderSummary(advertisement(), "aetheria.daemon.game");

  assert.deepEqual(validateSchemaSubset(tuiGridSchema, grid), []);
  assert.equal(grid.schema, "gamecult.eve.tui_grid.v1");
  assert.equal(grid.runtimeId, "tui");
  assert.equal(grid.surfaceId, "aetheria.daemon.game");
  assert.match(grid.lossiness, /use lowerSurface/);
  assert.ok(grid.lines.every(line => line.length <= 36));
});

test("lowers provider surface trees into a terminal grid", () => {
  const shell = new EveTuiShell({ width: 44 });
  const grid = shell.lowerSurface(surfaceDocument(), advertisement(), "aetheria.daemon.game");

  assert.deepEqual(validateSchemaSubset(tuiGridSchema, grid), []);
  assert.equal(grid.schema, "gamecult.eve.tui_grid.v1");
  assert.equal(grid.runtimeId, "tui");
  assert.equal(grid.providerId, "aetheria");
  assert.equal(grid.surfaceId, "aetheria.daemon.game");
  assert.equal(grid.projectionKind, "provider-authored-world-surface");
  assert.equal(grid.commandBoundary, "aetheria.daemon.commands");
  assert.equal(grid.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.match(grid.lossiness, /terminal-grid-command-surface/);
  assert.ok(grid.lines.every(line => line.length <= 44));
  assert.ok(grid.lines.some(line => line.includes("world aetheria.daemon.game.gravity")));
  assert.ok(grid.lines.some(line => line.includes("command aetheria.daemon.game.focus")));
  assert.ok(grid.lines.some(line => line.includes("plugin aetheria.daemon.game.norn")));
  assert.ok(grid.lines.some(line => line.includes("slot norn.map")));
  assert.deepEqual(grid.embeddedDocumentSlots, [
    {
      ownerId: "aetheria.daemon.game.norn",
      slotId: "norn.map",
      documentId: "cultmesh://aetheria/norn/map",
      schemaId: "gamecult.eve.surface.v1",
      presentationKind: "terminal-grid-slot",
    },
  ]);
});

test("rejects surface documents that do not match the advertised TUI target", () => {
  const shell = new EveTuiShell();
  assert.throws(
    () => shell.lowerSurface(surfaceDocument("aetheria.daemon.game"), advertisement(), "aetheria.daemon.editor"),
    /does not match advertised TUI surface/,
  );
});

function advertisement() {
  return {
    schema: "gamecult.eve.provider_advertisement.v1",
    providerId: "aetheria",
    title: "Aetheria",
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
            id: `${surfaceId}.gravity`,
            kind: "field.surface2d",
            props: {
              label: "Current Zone Gravity",
              bind: "aetheria.daemon.soaView.gravityField",
              fieldId: "aetheria.zone.gravity",
            },
            children: [],
          },
          {
            id: `${surfaceId}.focus`,
            kind: "control.button",
            props: {
              label: "Focus Relay",
              command: "aetheria.daemon.commands",
              commandId: "aetheria.daemon.focus",
            },
            children: [],
          },
          {
            id: `${surfaceId}.norn`,
            kind: "embed.norn",
            props: {
              label: "Norn tactical map",
            },
            embeddedDocuments: [
              {
                slotId: "norn.map",
                documentId: "cultmesh://aetheria/norn/map",
                schemaId: "gamecult.eve.surface.v1",
                presentationKind: "terminal-grid-slot",
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
