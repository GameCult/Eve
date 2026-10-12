// The value goldens: each file is what the Rust crate writes for the builder's value. Encoding the ported builder gives
// the file byte for byte, decoding the file gives the value back, and re-encoding what was decoded gives the file again.
import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeDocumentPayload,
  documentPayloadBytes,
  documentPayloadFromBytes,
  encodeDocumentPayload,
} from "@gamecult/cultcache-ts";
import {
  assetCatalogDocument,
  commandInvocationDocument,
  commandResultDocument,
  compositionDocument,
  surfaceDocument,
} from "@gamecult/thing-contract";

import { assetCatalogValue, fullComposition, fullSurface, golden, invocation, results } from "./builders.js";

type Case = [file: string, definition: Parameters<typeof encodeDocumentPayload>[0], value: unknown];

const answered = invocation();
const cases: Case[] = [
  ["surface-all-arms.bin", surfaceDocument, fullSurface()],
  ["composition-all-params.bin", compositionDocument, fullComposition()],
  ["invocation-all-inputs.bin", commandInvocationDocument, answered],
  ...results(answered).map(([name, value]): Case => [`${name}.bin`, commandResultDocument, value]),
  ["asset-catalog.bin", assetCatalogDocument, assetCatalogValue()],
];

test("the case table names the eleven value goldens", () => {
  assert.equal(cases.length, 11);
  assert.equal(new Set(cases.map(([file]) => file)).size, 11);
  assert.equal(cases.filter(([, definition]) => definition === commandResultDocument).length, 7);
});

for (const [file, definition, value] of cases) {
  test(`${file}: the builder encodes to the golden, the golden decodes to the builder, and re-encodes identical`, () => {
    const committed = golden(file);
    assert.deepEqual(documentPayloadBytes(encodeDocumentPayload(definition, value)), committed);

    const decoded = decodeDocumentPayload(definition, documentPayloadFromBytes(committed));
    assert.deepStrictEqual(decoded, value);
    assert.deepEqual(documentPayloadBytes(encodeDocumentPayload(definition, decoded)), committed);
  });
}
