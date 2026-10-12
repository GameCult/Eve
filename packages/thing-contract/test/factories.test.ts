// A CommandResult exists only by a factory or by the decode door. Construction is attacked the way an outside consumer
// would: an object literal, JSON.parse output, structuredClone, spread, prototype tricks, the constructor, a Proxy. Each is
// refused where a result is encoded, and none is a CommandResult. The type-level half is test/types.ts.
import assert from "node:assert/strict";
import test from "node:test";

import { decodeDocumentPayload, documentPayloadBytes, documentPayloadFromBytes, encodeDocumentPayload } from "@gamecult/cultcache-ts";
import { CommandResult, commandResultDocument } from "@gamecult/thing-contract";

import { CANARY, golden, invocation, results } from "./builders.js";

const answered = invocation();
const encodeResult = (value: unknown) => () => encodeDocumentPayload(commandResultDocument, value);
const BUILT = /a CommandResult is built by its factories/;

test("a factory copies the invocation id and holds the seq", () => {
  const result = CommandResult.failed(answered, 5, "broke");
  assert.equal(result.invocationId, answered.invocationId);
  assert.equal(result.seq, 5);
  assert.deepEqual(result.outcome, { kind: "Failed", reason: "broke" });
  assert.ok(result instanceof CommandResult);
  assert.ok(CommandResult.isResult(result));
});

test("each factory builds its outcome", () => {
  assert.deepEqual(CommandResult.pending(answered, 1, "working").outcome, { kind: "Pending", message: "working" });
  assert.deepEqual(CommandResult.completed(answered, 2, 8, true, null).outcome, {
    kind: "Completed",
    sourceVersion: 8,
    clearDrafts: true,
    effect: null,
  });
  assert.deepEqual(CommandResult.denied(answered, 3, "no", "go").outcome, { kind: "Denied", reason: "no", node: "go" });
});

test("a factory refuses seq below 1 naming Seq, and not the value", () => {
  for (const bad of [0, -1, -(2 ** 31)]) {
    for (const build of [
      () => CommandResult.pending(answered, bad, "m"),
      () => CommandResult.completed(answered, bad, null, false, null),
      () => CommandResult.denied(answered, bad, "r", null),
      () => CommandResult.failed(answered, bad, "r"),
    ]) {
      assert.throws(build, (error: Error) => /Seq must be at least 1/.test(error.message) && !error.message.includes(String(bad)));
    }
  }
  assert.throws(() => CommandResult.failed(answered, 1.5, "r"), /int32/);
  assert.throws(() => CommandResult.failed(answered, 2 ** 31, "r"), /int32/);
  assert.equal(CommandResult.failed(answered, 2 ** 31 - 1, "r").seq, 2 ** 31 - 1);
});

test("the decode door yields a CommandResult instance, equal to the factory's", () => {
  for (const [file, value] of results(answered)) {
    const decoded = decodeDocumentPayload(commandResultDocument, documentPayloadFromBytes(golden(`${file}.bin`)));
    assert.ok(decoded instanceof CommandResult, file);
    assert.ok(CommandResult.isResult(decoded), file);
    assert.deepStrictEqual(decoded, value, file);
    assert.ok(Object.isFrozen(decoded), file);
  }
});

test("encoding a result a factory built succeeds, and re-decodes", () => {
  const result = CommandResult.pending(answered, 1, "working");
  const bytes = documentPayloadBytes(encodeDocumentPayload(commandResultDocument, result));
  assert.deepEqual(bytes, golden("result-pending.bin"));
});

test("a copy of a result is not a result: structuredClone, spread and JSON.parse output are refused at encode", () => {
  const result = CommandResult.failed(answered, 7, "broke");
  for (const [name, copy] of [
    ["structuredClone", structuredClone(result)],
    ["spread", { ...result }],
    ["JSON.parse", JSON.parse(JSON.stringify(result)) as unknown],
    ["Object.assign", Object.assign({}, result)],
  ] as const) {
    assert.ok(!CommandResult.isResult(copy), name);
    assert.ok(!(copy instanceof CommandResult), name);
    assert.throws(encodeResult(copy), BUILT, name);
  }
});

test("an object literal is not a result", () => {
  const literal = { invocationId: answered.invocationId, seq: 1, outcome: { kind: "Failed", reason: "broke" } };
  assert.ok(!CommandResult.isResult(literal));
  assert.throws(encodeResult(literal), BUILT);
  for (const other of [null, undefined, 0, "", "completed", [], {}, () => 0]) {
    assert.ok(!CommandResult.isResult(other));
    assert.throws(encodeResult(other), BUILT);
  }
});

test("prototype tricks do not make a result", () => {
  const result = CommandResult.failed(answered, 7, "broke");
  const viaCreate = Object.assign(Object.create(CommandResult.prototype) as object, result);
  const viaSetPrototype = Object.setPrototypeOf({ ...result }, CommandResult.prototype) as object;
  const viaProxy = new Proxy(result, {});
  class Impostor extends (CommandResult as unknown as new () => object) {}
  for (const [name, fake] of [["Object.create", viaCreate], ["setPrototypeOf", viaSetPrototype], ["Proxy", viaProxy]] as const) {
    assert.ok(!CommandResult.isResult(fake), name);
    assert.throws(encodeResult(fake), BUILT, name);
  }
  assert.throws(() => new Impostor(), BUILT);
});

test("the constructor is closed at run time as well as in types", () => {
  const construct = CommandResult as unknown as new (...args: unknown[]) => CommandResult;
  const outcome = { kind: "Failed", reason: "broke" };
  assert.throws(() => new construct(answered.invocationId, 1, outcome), BUILT);
  assert.throws(() => new construct(Symbol("door"), answered.invocationId, 1, outcome), BUILT);
  assert.throws(() => new construct(undefined, answered.invocationId, 0, outcome), BUILT);
  assert.throws(() => Reflect.construct(construct, [answered.invocationId, 0, outcome]), BUILT);
  assert.throws(() => Reflect.construct(construct, [], CommandResult), BUILT);
});

test("a result is frozen: a script that ignores types cannot move its seq out of domain", () => {
  const result = CommandResult.failed(answered, 7, "broke");
  assert.ok(Object.isFrozen(result));
  const writable = result as unknown as { seq: number; invocationId: string };
  assert.throws(() => {
    writable.seq = 0;
  }, TypeError);
  assert.throws(() => {
    writable.invocationId = "other";
  }, TypeError);
  assert.equal(result.seq, 7);
  assert.equal(result.invocationId, answered.invocationId);
});

test("an out-of-domain seq cannot cross the decode door, and no message echoes the payload", () => {
  const message = (run: () => unknown) => {
    try {
      run();
    } catch (error) {
      return (error as Error).message;
    }
    return assert.fail("expected a refusal");
  };
  const refused = message(() => decodeDocumentPayload(commandResultDocument, documentPayloadFromBytes(golden("result-seq-zero.bin"))));
  assert.match(refused, /Seq must be at least 1/);
  assert.ok(!refused.includes(CANARY));
});
