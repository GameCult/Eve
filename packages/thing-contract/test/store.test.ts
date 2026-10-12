// surface.cc is a single-file store the Rust crate wrote with one record of each kind under a pinned clock. Opened through
// CultCache with the five definitions it yields five records, each re-encodes to its value golden's bytes, and each record
// key equals the key keys.ts builds from the value.
import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import { CultCache, SingleFileMessagePackBackingStore, documentPayloadBytes } from "@gamecult/cultcache-ts";
import {
  CommandResult,
  assetCatalogDocument,
  assetCatalogKey,
  commandInvocationDocument,
  commandResultDocument,
  compositionDocument,
  compositionKey,
  invocationKey,
  resultKey,
  surfaceDocument,
  surfaceKey,
  thingContract,
} from "@gamecult/thing-contract";

import { PINNED_CLOCK, assetCatalogValue, fullComposition, fullSurface, golden, goldensDir, invocation } from "./builders.js";

async function open() {
  const cache = CultCache.builder()
    .withRegistry(thingContract)
    .withGenericStore(new SingleFileMessagePackBackingStore(join(goldensDir, "surface.cc")))
    .build();
  await cache.pullAllBackingStores();
  return cache;
}

test("surface.cc opens to one record of each of the five kinds", async () => {
  const cache = await open();
  const snapshot = cache.snapshot();
  assert.equal(snapshot.length, 5);
  assert.deepEqual(
    snapshot.map((envelope) => envelope.type).sort(),
    [
      "gamecult.thing.asset_catalog",
      "gamecult.thing.command_invocation",
      "gamecult.thing.command_result",
      "gamecult.thing.composition",
      "gamecult.thing.surface",
    ],
  );
  for (const envelope of snapshot) assert.equal(envelope.storedAt, PINNED_CLOCK);
});

test("each record equals its value and re-encodes to its value golden", async () => {
  const cache = await open();
  const surface = fullSurface();
  const composition = fullComposition();
  const answered = invocation();
  const result = CommandResult.pending(answered, 1, "working");
  const catalog = assetCatalogValue();

  const surfaceRecordKey = surfaceKey(surface.providerId, surface.label);
  const compositionRecordKey = compositionKey(composition.publisher, composition.name, composition.version);
  const invocationRecordKey = invocationKey(answered.invocationId);
  const resultRecordKey = resultKey(result.invocationId, result.seq);
  const catalogRecordKey = assetCatalogKey(catalog.providerId, catalog.catalogId);

  assert.deepStrictEqual(cache.getRequired(surfaceDocument, surfaceRecordKey), surface);
  assert.deepStrictEqual(cache.getRequired(compositionDocument, compositionRecordKey), composition);
  assert.deepStrictEqual(cache.getRequired(commandInvocationDocument, invocationRecordKey), answered);
  assert.deepStrictEqual(cache.getRequired(commandResultDocument, resultRecordKey), result);
  assert.deepStrictEqual(cache.getRequired(assetCatalogDocument, catalogRecordKey), catalog);

  const goldenOf: Record<string, string> = {
    [surfaceRecordKey]: "surface-all-arms.bin",
    [compositionRecordKey]: "composition-all-params.bin",
    [invocationRecordKey]: "invocation-all-inputs.bin",
    [resultRecordKey]: "result-pending.bin",
    [catalogRecordKey]: "asset-catalog.bin",
  };
  const snapshot = cache.snapshot();
  assert.deepEqual(snapshot.map((envelope) => envelope.key).sort(), Object.keys(goldenOf).sort());
  for (const envelope of snapshot) {
    assert.deepEqual(documentPayloadBytes(envelope.payload), golden(goldenOf[envelope.key]), envelope.key);
  }
});
