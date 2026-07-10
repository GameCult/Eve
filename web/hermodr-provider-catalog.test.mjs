import assert from "node:assert/strict";
import test from "node:test";

import {
  createHermodrProviderTargets,
  selectInitialProviderTarget,
} from "./hermodr-provider-catalog.mjs";

const catalog = {
  providers: [{
    id: "fixture.game",
    title: "Fixture game",
    surfaces: [
      { surfaceId: "fixture.menu", surfaceKind: "menu" },
      { surfaceId: "fixture.world", surfaceKind: "interactive-world" },
    ],
  }],
  surfaces: [
    { providerId: "fixture.game", surfaceId: "fixture.menu", title: "Menu" },
    { providerId: "fixture.game", surfaceId: "fixture.world", surfaceKind: "interactive-world", title: "World" },
  ],
};

test("preserves provider and advertised surface identity from Hermodr", () => {
  const targets = createHermodrProviderTargets(catalog);
  assert.equal(targets.length, 2);
  assert.equal(targets[1].providerId, "fixture.game");
  assert.equal(targets[1].targetId, "fixture.game::fixture.world");
  assert.equal(targets[1].surfaces[0].surfaceId, "fixture.world");
  assert.equal(targets[1].surfaces[0].surfaceKind, "interactive-world");
  assert.match(targets[1].surfaces[0].url, /surfaceId=fixture\.world/);
});

test("selects an interactive world without product identity", () => {
  const targets = createHermodrProviderTargets(catalog);
  assert.equal(selectInitialProviderTarget(targets).targetId, "fixture.game::fixture.world");
  assert.equal(selectInitialProviderTarget(targets, "fixture.menu").targetId, "fixture.game::fixture.menu");
});
