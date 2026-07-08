import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileEveDsl } from "./eve-dsl.js";

test("compiles indentation-authored cards without end blocks", () => {
  const state = compileEveDsl(readFileSync(new URL("./fixtures/reactive-composition.eve", import.meta.url), "utf8"));

  assert.equal(state.providerId, "gamecult.eve.reactive-demo");
  assert.equal(state.surface.root.kind, "surface");
  assert.equal(state.surface.root.children.length, 3);
  assert.equal(state.surface.root.children[0].children.length, 3);
});

test("lowers fieldRow sugar into explicit label and field partitions", () => {
  const state = compileEveDsl(readFileSync(new URL("./fixtures/cultui-slider-inspector.eve", import.meta.url), "utf8"));
  const pane = state.surface.root.children[0].children[0];
  const fieldList = pane.children[0];
  const row = fieldList.children[0];

  assert.equal(row.kind, "partition");
  assert.equal(row.props.role, "inspector.row");
  assert.equal(row.children[0].props.role, "inspector.label");
  assert.equal(row.children[1].props.role, "inspector.field");
  assert.equal(row.children[1].children[0].kind, "control.slider");
});

test("preserves slider skin anatomy as retained control parts", () => {
  const state = compileEveDsl(readFileSync(new URL("./fixtures/cultui-slider-inspector.eve", import.meta.url), "utf8"));
  const skin = state.surface.styles.controlSkins["inspector.orangeSlider"];

  assert.equal(skin.target, "slider");
  assert.deepEqual(skin.children.map(child => child.kind), [
    "control.box",
    "control.part",
    "control.part",
    "control.part",
    "control.hitArea",
  ]);
  assert.equal(skin.children[3].props.name, "thumb");
  assert.equal(skin.children[3].props.bleed, 3);
});

test("surface JSON can declare embedded CultMesh document slots", () => {
  const state = JSON.parse(readFileSync(new URL("./fixtures/cultui-embedded-surface.json", import.meta.url), "utf8"));
  const slot = state.surface.root.children[1];

  assert.equal(slot.kind, "surface.slot");
  assert.equal(slot.embeddedDocuments.length, 1);
  assert.equal(slot.embeddedDocuments[0].slotId, "inventory.dropdown");
  assert.equal(slot.embeddedDocuments[0].documentId, "cultmesh://demo/inventory/dropdown");
});
