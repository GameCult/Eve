import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateSchemaSubset } from "../../test-support/schema-subset.mjs";
import { EveElectronShell } from "../src/eve-electron-shell.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const electronProjectionSchema = JSON.parse(readFileSync(
  path.join(repoRoot, "schemas/gamecult.eve.electron_shell_projection.v1.schema.json"),
  "utf8",
));

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

  assert.equal(intent.schema, "gamecult.eve.command_invocation.v1");
  assert.equal(intent.providerId, "aetheria");
  assert.equal(intent.surfaceId, "aetheria.daemon.game");
  assert.equal(intent.commandBoundary, "aetheria.daemon.commands");
  assert.equal(intent.receiptSchema, "aetheria.eve_command_acceptance_status.v1");
  assert.equal(intent.clientId, "electron-shell");
});

test("lowers provider surface trees into an Electron shell projection", () => {
  const shell = new EveElectronShell();
  const projection = shell.lowerSurface(surfaceDocument(), advertisement(), "aetheria.daemon.game");

  assert.deepEqual(validateSchemaSubset(electronProjectionSchema, projection), []);
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
  assert.equal(projection.root.children[2].shellElementKind, "norn-graph-shell");
  assert.equal(projection.root.children[2].pluginProjection.pluginId, "norn.graph");
  assert.equal(projection.root.children[2].pluginProjection.semanticOwner, "Norn");
  assert.equal(projection.root.children[2].embeddedDocumentCount, 1);
  assert.deepEqual(projection.root.children[2].embeddedDocuments, [
    {
      slotId: "norn.map",
      documentId: "cultmesh://aetheria/norn/map",
      schemaId: "gamecult.eve.surface.v1",
      presentationKind: "electron-overlay",
    },
  ]);
});

test("lowers Sai, Norn, and TeX sidecar plugin shells without owning semantics", () => {
  const shell = new EveElectronShell();
  const saiSurface = JSON.parse(readFileSync(path.join(repoRoot, "web/fixtures/sai-vn-surface.json"), "utf8"));
  const projection = shell.lowerSurface(saiSurface, saiAdvertisement(), "sai.visual_novel.surface");

  assert.deepEqual(validateSchemaSubset(electronProjectionSchema, projection), []);
  assert.equal(projection.providerId, "gamecult.home.vn");
  assert.equal(projection.surfaceId, "sai.visual_novel.surface");
  assert.equal(projection.root.shellElementKind, "sai-vn-stage-shell");
  assert.equal(projection.root.pluginProjection.pluginId, "sai.vn");
  assert.equal(projection.root.pluginProjection.semanticOwner, "Sai");
  assert.equal(projection.root.pluginProjection.availability, "required");
  assert.equal(projection.root.pluginProjection.commandBoundary, "sidecar-advertised-plugin-abi");
  assert.deepEqual(projection.root.pluginProjection.capabilities, [
    "vn.stage",
    "story.choose",
    "story.continue",
    "story.jump",
  ]);

  const norn = findNode(projection.root, "sai.graph");
  assert.equal(norn.shellElementKind, "norn-graph-shell");
  assert.equal(norn.pluginProjection.pluginId, "norn.graph");
  assert.equal(norn.pluginProjection.projectionKind, "norn-graph-electron-overlay-shell");
  assert.equal(norn.pluginProjection.semanticOwner, "Norn");
  assert.equal(norn.pluginProjection.availability, "optional-nested");
  assert.deepEqual(norn.pluginProjection.capabilities, ["embed.norn"]);

  const tex = findNode(projection.root, "sai.tex.log-power");
  assert.equal(tex.shellElementKind, "tex-math-shell");
  assert.equal(tex.pluginProjection.pluginId, "tex.math");
  assert.equal(tex.pluginProjection.projectionKind, "tex-math-electron-block-source-shell");
  assert.equal(tex.pluginProjection.semanticOwner, "EvePlugins");
  assert.equal(tex.pluginProjection.availability, "optional-nested");
  assert.equal(tex.pluginProjection.documentId, "\\\\mathrm{votes}(p)=1+\\\\lfloor\\\\log_b(1+p)\\\\rfloor");
  assert.deepEqual(tex.pluginProjection.capabilities, ["embed.tex", "tex.inline", "tex.block"]);
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

function saiAdvertisement() {
  return {
    schema: "gamecult.eve.provider_advertisement.v1",
    providerId: "gamecult.home.vn",
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

function findNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}
