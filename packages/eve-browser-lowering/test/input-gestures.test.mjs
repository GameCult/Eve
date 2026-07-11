import test from "node:test";
import assert from "node:assert/strict";
import { EveInputGestureResolver } from "../dist/input-gestures.js";

test("resolves keyboard chords", () => {
  const resolver = new EveInputGestureResolver([{ bindingId: "boost", actionId: "drive.boost", gesture: { kind: "chord", controls: ["keyboard.shift", "keyboard.w"] } }]);
  assert.deepEqual(resolver.press("keyboard.shift", 0), []);
  assert.deepEqual(resolver.press("keyboard.w", 1), ["drive.boost"]);
});

test("resolves ordered d-pad strings and resets wrong input", () => {
  const resolver = new EveInputGestureResolver([{ bindingId: "shield", actionId: "shield.overcharge", gesture: { kind: "sequence", controls: ["gamepad.dpad.up", "gamepad.dpad.right", "gamepad.dpad.down"], maxStepIntervalMs: 500 } }]);
  assert.deepEqual(resolver.press("gamepad.dpad.up", 0), []);
  assert.deepEqual(resolver.press("gamepad.dpad.left", 100), []);
  assert.deepEqual(resolver.press("gamepad.dpad.up", 200), []);
  assert.deepEqual(resolver.press("gamepad.dpad.right", 300), []);
  assert.deepEqual(resolver.press("gamepad.dpad.down", 400), ["shield.overcharge"]);
});
