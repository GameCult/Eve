// The key grammar of crates/thing-contract/src/keys.rs and the cases of tests/result.rs: keys are built from the fields,
// every local segment is a Segment, and two different field sets never build one key.
import assert from "node:assert/strict";
import test from "node:test";

import { assetCatalogKey, compositionKey, invocationKey, resultKey, surfaceKey } from "@gamecult/thing-contract";

import { CANARY } from "./builders.js";

const builders: [string, (segment: string) => string][] = [
  ["surfaceKey", (segment) => surfaceKey("p", segment)],
  ["compositionKey name", (segment) => compositionKey("pub", segment, 1)],
  ["assetCatalogKey", (segment) => assetCatalogKey("p", segment)],
];

for (const [name, build] of builders) {
  test(`${name} refuses an empty, a dot and a dotted segment, naming Segment and not the value`, () => {
    assert.throws(() => build(""), /Segment must be non-empty/);
    assert.throws(() => build("."), /Segment must be free of '\.'/);
    assert.throws(() => build("a.b"), /Segment must be free of '\.'/);
    assert.throws(
      () => build(`${CANARY}.x`),
      (error: Error) => /Segment/.test(error.message) && !error.message.includes(CANARY),
    );
  });
}

test("the keys are spelled from the fields", () => {
  assert.equal(invocationKey("an-invocation-no-constructor-can-guess"), "thing:invocation:an-invocation-no-constructor-can-guess");
  assert.equal(resultKey("an-invocation-no-constructor-can-guess", 3), "thing:result:an-invocation-no-constructor-can-guess.3");
  assert.equal(surfaceKey("p", "main"), "thing:surface:p.main");
  assert.equal(compositionKey("pub", "card", 2), "thing:composition:pub.card.v2");
  assert.equal(compositionKey("pub", "card", 2n ** 40n), "thing:composition:pub.card.v1099511627776");
  assert.equal(assetCatalogKey("p", "icons"), "thing:asset_catalog:p.icons");
});

test("a result key refuses a seq below 1 and a composition key a version below 0", () => {
  assert.throws(() => resultKey("x", 0), /Seq must be at least 1/);
  assert.throws(() => compositionKey("pub", "card", -1), /Version must be at least 0/);
  assert.equal(compositionKey("pub", "card", 0), "thing:composition:pub.card.v0");
  assert.throws(() => compositionKey("pub", "card", 1.5), /int64/);
  assert.throws(() => resultKey("x", 1.5), /int32/);
  assert.throws(() => resultKey("x", 2 ** 31), /int32/);
});

test("keys are injective over their field sets", () => {
  // A dotted provider with a plain label, and a plain provider with a dotted label: the second cannot be built.
  assert.equal(surfaceKey("a.b", "c"), "thing:surface:a.b.c");
  assert.throws(() => surfaceKey("a", "b.c"), /Segment/);
  assert.notEqual(surfaceKey("a", "c"), surfaceKey("a.b", "c"));
  assert.notEqual(surfaceKey("a.b", "c"), surfaceKey("a", "bc"));

  // A composition splits at its last two dots: publisher, name, then the version.
  assert.equal(compositionKey("a.b", "c", 1), "thing:composition:a.b.c.v1");
  assert.notEqual(compositionKey("a.b", "c", 1), compositionKey("a", "bc", 1));
  assert.notEqual(compositionKey("a", "c", 1), compositionKey("a", "c", 11));
  assert.notEqual(compositionKey("a", "c", 1), compositionKey("a", "c", 0));

  // A catalog likewise, under the asset_catalog prefix.
  assert.equal(assetCatalogKey("a.b", "c"), "thing:asset_catalog:a.b.c");
  assert.notEqual(assetCatalogKey("a.b", "c"), assetCatalogKey("a", "bc"));

  // A result splits at its last dot, and the seq is digits.
  assert.equal(resultKey("x.1", 2), "thing:result:x.1.2");
  assert.equal(resultKey("x", 12), "thing:result:x.12");
  assert.notEqual(resultKey("x.1", 2), resultKey("x", 12));
});
