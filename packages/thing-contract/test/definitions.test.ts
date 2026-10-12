// The five definitions carry the crate's cultcache(type, schema) and, per document slot, the reference's member name
// and C# type name that a store's schema catalog is compared on.
import assert from "node:assert/strict";
import test from "node:test";

import {
  assetCatalogDocument,
  commandInvocationDocument,
  commandResultDocument,
  compositionDocument,
  surfaceDocument,
  thingContract,
} from "@gamecult/thing-contract";

const NS = "GameCult.Thing.Contract.";
const STRING = "System.String";
const list = (item: string) => `System.Collections.Generic.List<${NS}${item}>`;

const rustName: Record<string, string> = {
  "gamecult.thing.surface": "SurfaceDocument",
  "gamecult.thing.composition": "CompositionDocument",
  "gamecult.thing.command_invocation": "CommandInvocation",
  "gamecult.thing.command_result": "CommandResult",
  "gamecult.thing.asset_catalog": "AssetCatalog",
};

const expected = [
  [surfaceDocument, "gamecult.thing.surface", [
    "0:ProviderId:" + STRING,
    "1:Label:" + STRING,
    "2:Version:System.Int64",
    "3:Title:" + STRING,
    `4:Root:${NS}Node`,
    `5:Commands:${list("CommandDecl")}`,
  ]],
  [compositionDocument, "gamecult.thing.composition", [
    "0:Publisher:" + STRING,
    "1:Name:" + STRING,
    "2:Version:System.Int64",
    `3:Params:${list("ParamDecl")}`,
    `4:Body:${NS}Node`,
  ]],
  [commandInvocationDocument, "gamecult.thing.command_invocation", [
    "0:InvocationId:" + STRING,
    "1:SurfaceKey:" + STRING,
    "2:SurfaceVersion:System.Int64",
    "3:Command:" + STRING,
    `4:Payload:${NS}RecordPayload`,
    `5:Captured:${list("CapturedInput")}`,
    "6:Client:" + STRING,
    "7:IssuedAt:" + STRING,
    "8:Delegation:" + STRING,
  ]],
  [commandResultDocument, "gamecult.thing.command_result", [
    "0:InvocationId:" + STRING,
    "1:Seq:System.Int32",
    `2:Outcome:${NS}Outcome`,
  ]],
  [assetCatalogDocument, "gamecult.thing.asset_catalog", [
    "0:ProviderId:" + STRING,
    "1:CatalogId:" + STRING,
    "2:Version:System.Int64",
    `3:Assets:${list("AssetEntry")}`,
  ]],
] as const;

for (const [definition, type, members] of expected) {
  test(`${type}: type, schema and catalog members`, () => {
    assert.equal(definition.type, type);
    assert.equal(definition.schemaName, type);
    assert.equal(definition.schemaVersion, `${type}.v1`);
    assert.equal(definition.codec?.typeName, `${NS}${rustName[type]}`);
    assert.deepEqual(
      definition.members?.map((member) => `${member.slot}:${member.memberName}:${member.typeName}`),
      members,
    );
  });
}

test("the registry lists the five definitions, in the crate's order", () => {
  assert.deepEqual(
    thingContract.definitions.map((definition) => definition.type),
    expected.map(([, type]) => type),
  );
  assert.equal(new Set(thingContract.definitions).size, 5);
});
