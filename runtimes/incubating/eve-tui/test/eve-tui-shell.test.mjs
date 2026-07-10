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

  assert.equal(intent.schema, "gamecult.eve.command_invocation.v1");
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
  assert.ok(grid.lines.some(line => line.includes("norn aetheria.daemon.game.norn")));
  assert.ok(grid.lines.some(line => line.includes("slot norn.map")));
  assert.deepEqual(grid.pluginProjections, [
    {
      ownerId: "aetheria.daemon.game.norn",
      pluginId: "norn.graph",
      projectionKind: "norn-graph-terminal-outline",
      abiSchema: "gamecult.eve.plugin_abi.v1",
      commandBoundary: "sidecar-advertised-plugin-abi",
      capabilities: ["embed.norn"],
      documentId: "aetheria.daemon.game.norn",
      semanticOwner: "Norn",
      availability: "optional-nested",
      fallbackKind: "terminal-outline",
    },
  ]);
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

test("lowers Sai, Norn, and TeX plugin surfaces into compact terminal fallbacks", () => {
  const shell = new EveTuiShell({ width: 72 });
  const saiSurface = JSON.parse(readFileSync(path.join(repoRoot, "web/fixtures/sai-vn-surface.json"), "utf8"));
  const grid = shell.lowerSurface(saiSurface, saiAdvertisement(), "sai.visual_novel.surface");

  assert.deepEqual(validateSchemaSubset(tuiGridSchema, grid), []);
  assert.equal(grid.providerId, "gamecult.home.vn");
  assert.equal(grid.surfaceId, "sai.visual_novel.surface");
  assert.ok(grid.lines.every(line => line.length <= 72));
  assert.ok(grid.lines.some(line => line.includes("sai-vn sai.root")));
  assert.ok(grid.lines.some(line => line.includes("norn sai.graph")));
  assert.ok(grid.lines.some(line => line.includes("tex sai.tex.log-power")));

  const byPlugin = new Map(grid.pluginProjections.map(projection => [projection.pluginId, projection]));
  assert.equal(byPlugin.get("sai.vn").semanticOwner, "Sai");
  assert.equal(byPlugin.get("sai.vn").availability, "required");
  assert.equal(byPlugin.get("sai.vn").projectionKind, "sai-vn-terminal-stage-summary");
  assert.deepEqual(byPlugin.get("sai.vn").capabilities, [
    "vn.stage",
    "story.choose",
    "story.continue",
    "story.jump",
  ]);
  assert.equal(byPlugin.get("norn.graph").semanticOwner, "Norn");
  assert.equal(byPlugin.get("norn.graph").availability, "optional-nested");
  assert.equal(byPlugin.get("norn.graph").fallbackKind, "terminal-outline");
  assert.equal(byPlugin.get("tex.math").semanticOwner, "EvePlugins");
  assert.equal(byPlugin.get("tex.math").availability, "optional-nested");
  assert.equal(byPlugin.get("tex.math").projectionKind, "tex-math-terminal-block-source");
  assert.equal(byPlugin.get("tex.math").fallbackKind, "source-text");
  assert.equal(byPlugin.get("tex.math").documentId, "\\\\mathrm{votes}(p)=1+\\\\lfloor\\\\log_b(1+p)\\\\rfloor");
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

function saiAdvertisement() {
  return {
    schema: "gamecult.eve.provider_advertisement.v1",
    providerId: "gamecult.home.vn",
    title: "GameCult Compound VN",
    surfaces: [
      {
        surfaceId: "sai.visual_novel.surface",
        transport: "local-json",
        url: "web/fixtures/sai-vn-surface.json",
        worldInteraction: {
          projectionKind: "provider-authored-world-surface",
          commandBoundary: "sai.vn.plugin.commands",
          receiptSchema: "gamecult.eve.command_receipt.v1",
          ownership: "provider-owns-story-state-plugin-sidecars-own-nested-semantics",
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
