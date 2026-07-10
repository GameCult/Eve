import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findProviderCatalogEntry, mergeProviderAdvertisement } from "./provider-advertisements.mjs";

const catalog = JSON.parse(readFileSync(new URL("./local-provider-catalog.json", import.meta.url), "utf8"));
const worldSmokeAdvertisement = JSON.parse(readFileSync(new URL("./fixtures/eve-world-smoke.provider-advertisement.json", import.meta.url), "utf8"));
const saiAdvertisement = JSON.parse(readFileSync(new URL("./fixtures/sai-vn.provider-advertisement.json", import.meta.url), "utf8"));

test("merges generic world fixture transport with advertised world interaction", () => {
  const catalogProvider = findProviderCatalogEntry(catalog, "eve.world-smoke");
  const provider = mergeProviderAdvertisement(catalogProvider, worldSmokeAdvertisement);
  const surface = provider.surfaces.find(candidate => candidate.surfaceId === "eve.world-smoke.surface");

  assert.equal(surface.transport, "local-json");
  assert.equal(surface.url, "./fixtures/eve-world-smoke-surface.json");
  assert.equal(surface.surfaceKind, "interactive-world");
  assert.equal(surface.worldInteraction.projectionKind, "provider-authored-world-surface");
  assert.equal(surface.worldInteraction.commandBoundary, "eve.world-smoke.commands");
  assert.equal(surface.worldInteraction.receiptSchema, "eve.world_smoke.command_receipt.v1");
  assert.deepEqual(surface.worldInteraction.loweringTargets, ["web-reference", "unity-uitoolkit", "unity-scene", "electron-shell", "tui"]);
});

test("preserves Sai required and optional nested plugin requirements from advertisement", () => {
  const catalogProvider = findProviderCatalogEntry(catalog, "gamecult.home.vn");
  const provider = mergeProviderAdvertisement(catalogProvider, saiAdvertisement);
  const surface = provider.surfaces.find(candidate => candidate.surfaceId === "sai.visual_novel.surface");
  const byPlugin = new Map(surface.requiresPlugins.map(requirement => [requirement.pluginId, requirement]));

  assert.equal(surface.transport, "local-json");
  assert.equal(surface.url, "./fixtures/sai-vn-surface.json");
  assert.equal(byPlugin.get("sai.vn").availability, "required");
  assert.deepEqual(byPlugin.get("sai.vn").requiredCapabilities, [
    "vn.stage",
    "story.choose",
    "story.continue",
    "story.jump",
  ]);
  assert.equal(byPlugin.get("norn.graph").availability, "optional-nested");
  assert.deepEqual(byPlugin.get("norn.graph").requiredCapabilities, []);
  assert.deepEqual(byPlugin.get("norn.graph").optionalCapabilities, ["embed.norn"]);
  assert.equal(byPlugin.get("tex.math").availability, "optional-nested");
  assert.deepEqual(byPlugin.get("tex.math").requiredCapabilities, []);
  assert.deepEqual(byPlugin.get("tex.math").optionalCapabilities, ["embed.tex"]);
});
