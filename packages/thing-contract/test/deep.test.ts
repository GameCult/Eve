// The deepest tree the payload bound admits decodes and re-encodes on Node's default stack (no --stack-size), and one
// level deeper is refused with CultCachePayloadDepthError, never an abort. The Rust test of the same name needs a 16 MiB
// thread for this; here the stack holds, and the bound refuses first.
import assert from "node:assert/strict";
import test from "node:test";

import {
  CultCachePayloadDepthError,
  MAX_PAYLOAD_DEPTH,
  decodeDocumentPayload,
  documentPayloadBytes,
  documentPayloadFromBytes,
  encodeDocumentPayload,
} from "@gamecult/cultcache-ts";
import { surfaceDocument } from "@gamecult/thing-contract";
import type { Node, SurfaceDocument } from "@gamecult/thing-contract";

import { boxNode, boxed, text } from "./builders.js";

function chain(levels: number): SurfaceDocument {
  let root: Node = text("leaf", "bottom");
  for (let depth = levels - 1; depth >= 0; depth--) root = boxed(`deep-${depth}`, [root]);
  return { providerId: "provider.a", label: "deep", version: 1, title: "deep", root, commands: [] };
}

const admits = (levels: number): boolean => {
  try {
    encodeDocumentPayload(surfaceDocument, chain(levels));
    return true;
  } catch (error) {
    assert.ok(error instanceof CultCachePayloadDepthError, "the only refusal of a plain chain is the depth bound");
    assert.equal(error.limit, MAX_PAYLOAD_DEPTH);
    return false;
  }
};

test("the deepest Box chain the bound admits round-trips on the default stack, and one more is refused", () => {
  let deepest = 1;
  while (admits(deepest + 1)) deepest++;
  assert.equal(deepest, 84, "the bound admits 84 Box levels above the leaf");
  assert.ok(!admits(deepest + 1));

  const value = chain(deepest);
  const bytes = documentPayloadBytes(encodeDocumentPayload(surfaceDocument, value));
  const decoded = decodeDocumentPayload(surfaceDocument, documentPayloadFromBytes(bytes));
  assert.deepStrictEqual(decoded, value);
  assert.deepEqual(documentPayloadBytes(encodeDocumentPayload(surfaceDocument, decoded)), bytes);
});

test("a payload one container past the bound is refused with the depth error, before any codec reads it", () => {
  const nested = (levels: number) => new Uint8Array([...new Array<number>(levels).fill(0x91), 0xc0]);
  assert.throws(
    () => decodeDocumentPayload(surfaceDocument, documentPayloadFromBytes(nested(MAX_PAYLOAD_DEPTH + 1))),
    (error: unknown) => error instanceof CultCachePayloadDepthError && error.depth === MAX_PAYLOAD_DEPTH + 1,
  );
  // At the bound the walk admits it and the codec refuses the shape instead.
  assert.throws(
    () => decodeDocumentPayload(surfaceDocument, documentPayloadFromBytes(nested(MAX_PAYLOAD_DEPTH))),
    (error: unknown) => error instanceof Error && !(error instanceof CultCachePayloadDepthError),
  );
});

test("a wide tree of a thousand nodes round-trips", () => {
  const children: Node[] = Array.from({ length: 998 }, (_, index) => text(`t${index}`, "x"));
  children.push(boxed("tail", []));
  const wide: SurfaceDocument = {
    providerId: "provider.a",
    label: "wide",
    version: 1,
    title: "wide",
    root: { kind: "Box", ...boxNode("root", children) },
    commands: [],
  };
  const bytes = documentPayloadBytes(encodeDocumentPayload(surfaceDocument, wide));
  assert.deepStrictEqual(decodeDocumentPayload(surfaceDocument, documentPayloadFromBytes(bytes)), wide);
});
