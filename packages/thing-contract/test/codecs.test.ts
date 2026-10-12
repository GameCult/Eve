// Every codec of the package is named GameCult.Thing.Contract.<RustName>, the reference's full type name, and every union
// names itself in its refusals. The exports are the lowerCamel of the Rust type names, so the test reads the expected name
// off the export.
import assert from "node:assert/strict";
import test from "node:test";

import { codecs } from "@gamecult/thing-contract";

const NS = "GameCult.Thing.Contract.";
const entries = Object.entries(codecs) as [string, { typeName?: string; decode(raw: unknown): unknown }][];
const rustName = (key: string) => key[0].toUpperCase() + key.slice(1);

test("the package exports ninety-five codecs", () => {
  assert.equal(entries.length, 95);
});

test("every codec carries the reference's full type name", () => {
  for (const [key, codec] of entries) assert.equal(codec.typeName, `${NS}${rustName(key)}`, key);
});

test("every union refuses an unknown arm by its own name, and the twenty-nine unions are all of them", () => {
  const unions: string[] = [];
  for (const [key, codec] of entries) {
    let message: string;
    try {
      codec.decode([2 ** 30, []]);
      continue;
    } catch (error) {
      message = (error as Error).message;
    }
    const named = /^Union (\w+): unknown arm key 1073741824 \(declared keys: [-\d, ]+\)\.$/.exec(message);
    if (named === null) continue;
    unions.push(key);
    assert.equal(named[1], rustName(key), key);
  }
  assert.equal(unions.length, 29);
});
