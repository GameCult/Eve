// The refusal goldens and the domain doors. A payload is refused by name (the union and the arm key, or the domain), and
// no message echoes a value: the goldens carry CANARY in the slots a refusal must not repeat.
import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeDocumentPayload,
  defineDocumentType,
  documentPayloadFromBytes,
  encodeDocumentPayload,
} from "@gamecult/cultcache-ts";
import {
  CommandResult,
  assetCatalogDocument,
  codecs,
  commandResultDocument,
  domain,
  surfaceDocument,
} from "@gamecult/thing-contract";

import { CANARY, assetCatalogValue, fullSurface, golden, invocation } from "./builders.js";

const rgbaDocument = defineDocumentType({
  type: "test.rgba",
  schema: { parse: (input: unknown) => input },
  codec: codecs.rgba,
});

function refusal(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.ok(!error.message.includes(CANARY), `the refusal echoed a value: ${error.message}`);
    return error.message;
  }
  return assert.fail("expected a refusal");
}

const read = (definition: Parameters<typeof decodeDocumentPayload>[0], file: string) => () =>
  decodeDocumentPayload(definition, documentPayloadFromBytes(golden(file)));

test("a Thing 1 flat map is not a command result", () => {
  refusal(read(commandResultDocument, "result-thing1-flat.bin"));
});

test("an unknown Node arm is refused naming the union and the key", () => {
  assert.match(refusal(read(surfaceDocument, "node-unknown-arm.bin")), /Union Node: unknown arm key 13/);
});

test("an unknown Outcome arm is refused naming the union and the key", () => {
  assert.match(refusal(read(commandResultDocument, "outcome-unknown-arm.bin")), /Union Outcome: unknown arm key 4/);
});

test("an extra trailing slot is read and never written back", () => {
  const decoded = decodeDocumentPayload(commandResultDocument, documentPayloadFromBytes(golden("result-extra-slot.bin")));
  const expected = CommandResult.pending({ ...invocation(), invocationId: "inv-1" }, 1, "working");
  assert.deepStrictEqual(decoded, expected);
  assert.ok(!JSON.stringify(decoded).includes(CANARY));
});

test("each domain golden is refused naming its domain", () => {
  assert.match(refusal(read(commandResultDocument, "result-seq-zero.bin")), /Seq must be at least 1/);
  assert.match(refusal(read(surfaceDocument, "surface-version-negative.bin")), /Version must be at least 0/);
  assert.match(refusal(read(surfaceDocument, "surface-label-dotted.bin")), /Segment must be free of '\.'/);
  assert.match(refusal(read(assetCatalogDocument, "asset-extent-negative.bin")), /Count must be at least 0/);
  assert.match(refusal(read(rgbaDocument, "rgba-channel-out-of-range.bin")), /Rgba channel must be 0 to 255/);
});

test("the encode door holds the same domains", () => {
  const surface = fullSurface();
  const catalog = assetCatalogValue();
  const encodeSurface = (value: unknown) => () => encodeDocumentPayload(surfaceDocument, value);
  assert.match(refusal(encodeSurface({ ...surface, label: `${CANARY}.x` })), /Segment must be free of '\.'/);
  assert.match(refusal(encodeSurface({ ...surface, label: "" })), /Segment must be non-empty/);
  assert.match(refusal(encodeSurface({ ...surface, label: null })), /label/);
  assert.match(refusal(encodeSurface({ ...surface, version: -1 })), /Version must be at least 0/);
  assert.match(refusal(encodeSurface({ ...surface, version: -(2n ** 40n) })), /Version must be at least 0/);
  assert.match(
    refusal(() => encodeDocumentPayload(assetCatalogDocument, { ...catalog, assets: [{ ...catalog.assets[0], width: -5 }] })),
    /Count must be at least 0/,
  );
  assert.match(
    refusal(() => encodeDocumentPayload(rgbaDocument, { r: 256, g: 0, b: 0, a: 255 })),
    /Rgba channel must be 0 to 255/,
  );
  assert.match(
    refusal(() => encodeDocumentPayload(rgbaDocument, { r: 0, g: -1, b: 0, a: 255 })),
    /Rgba channel must be 0 to 255/,
  );
});

test("each domain accepts its boundary values and refuses the step beyond, on both doors", () => {
  assert.equal(domain.seq.decode(1), 1);
  assert.equal(domain.seq.decode(2 ** 31 - 1), 2 ** 31 - 1);
  assert.throws(() => domain.seq.decode(0), /Seq must be at least 1/);
  assert.throws(() => domain.seq.decode(2 ** 31), /int32/);
  assert.throws(() => domain.seq.encode(0), /Seq must be at least 1/);
  assert.equal(domain.seq.encode(1), 1);
  assert.equal(domain.version.decode(0), 0);
  assert.equal(domain.version.decode(2n ** 62n), 2n ** 62n);
  assert.throws(() => domain.version.decode(-1), /Version must be at least 0/);
  assert.throws(() => domain.version.encode(-1n), /Version must be at least 0/);
  assert.equal(domain.version.encode(0), 0);
  assert.equal(domain.count.decode(0), 0);
  assert.throws(() => domain.count.decode(-1), /Count must be at least 0/);
  assert.throws(() => domain.count.encode(-1), /Count must be at least 0/);
  assert.equal(domain.count.encode(0), 0);
  assert.equal(domain.segment.decode("a"), "a");
  assert.throws(() => domain.segment.decode(""), /Segment must be non-empty/);
  assert.throws(() => domain.segment.decode("."), /Segment must be free of '\.'/);
  assert.throws(() => domain.segment.encode("a.b"), /Segment must be free of '\.'/);
  assert.throws(() => domain.segment.encode(""), /Segment must be non-empty/);
  assert.equal(domain.segment.encode("a"), "a");
  assert.equal(domain.channel.decode(0), 0);
  assert.equal(domain.channel.decode(255), 255);
  assert.throws(() => domain.channel.decode(256), /Rgba channel must be 0 to 255/);
  assert.throws(() => domain.channel.decode(-1), /Rgba channel must be 0 to 255/);
  assert.throws(() => domain.channel.encode(256), /Rgba channel must be 0 to 255/);
  assert.throws(() => domain.channel.encode(-1), /Rgba channel must be 0 to 255/);
  assert.equal(domain.channel.encode(255), 255);
  assert.equal(domain.channel.encode(0), 0);
});

test("a domain refusal never echoes the value", () => {
  for (const run of [
    () => domain.segment.decode(`${CANARY}.x`),
    () => domain.seq.decode(-777),
    () => domain.version.decode(-777),
    () => domain.count.decode(-777),
    () => domain.channel.decode(777),
    () => domain.seq.encode(-777),
    () => domain.channel.encode(777),
  ]) {
    const message = refusal(run);
    assert.ok(!message.includes("777"), message);
  }
});

test("a domain codec reports the reference's leaf type name", () => {
  assert.equal(domain.seq.typeName, "System.Int32");
  assert.equal(domain.count.typeName, "System.Int32");
  assert.equal(domain.channel.typeName, "System.Int32");
  assert.equal(domain.version.typeName, "System.Int64");
  assert.equal(domain.segment.typeName, "System.String");
  assert.equal(domain.version.valueType, true);
  assert.equal(domain.segment.valueType, true);
});
