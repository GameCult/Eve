// The five document definitions (crates/thing-contract/src/lib.rs). `type` and `schemaVersion` are the crate's
// cultcache(type, schema). The codec runs on both doors (encodeDocumentPayload and decodeDocumentPayload run it and then
// the definition's schema.parse), so the domains hold whichever way a value enters. The four plain kinds parse as the
// identity; a command_result parses only an instance of CommandResult.
import { defineDocumentRegistry, defineDocumentType } from "@gamecult/cultcache-ts";

import { assetCatalog, commandInvocation, compositionDocument as compositionCodec, surfaceDocument as surfaceCodec } from "./codecs.js";
import { CommandResult, commandResult as commandResultCodec } from "./result.js";
import type { AssetCatalog, CommandInvocation, CompositionDocument, SurfaceDocument } from "./types.js";

const identity = <TValue>(input: unknown): TValue => input as TValue;

export const surfaceDocument = defineDocumentType({
  type: "gamecult.thing.surface",
  schemaName: "gamecult.thing.surface",
  schemaVersion: "gamecult.thing.surface.v1",
  schema: { parse: identity<SurfaceDocument> },
  codec: surfaceCodec,
});

export const compositionDocument = defineDocumentType({
  type: "gamecult.thing.composition",
  schemaName: "gamecult.thing.composition",
  schemaVersion: "gamecult.thing.composition.v1",
  schema: { parse: identity<CompositionDocument> },
  codec: compositionCodec,
});

export const commandInvocationDocument = defineDocumentType({
  type: "gamecult.thing.command_invocation",
  schemaName: "gamecult.thing.command_invocation",
  schemaVersion: "gamecult.thing.command_invocation.v1",
  schema: { parse: identity<CommandInvocation> },
  codec: commandInvocation,
});

export const commandResultDocument = defineDocumentType({
  type: "gamecult.thing.command_result",
  schemaName: "gamecult.thing.command_result",
  schemaVersion: "gamecult.thing.command_result.v1",
  schema: {
    parse(input: unknown): CommandResult {
      if (!CommandResult.isResult(input)) throw new Error("a CommandResult is built by its factories");
      return input;
    },
  },
  codec: commandResultCodec,
});

export const assetCatalogDocument = defineDocumentType({
  type: "gamecult.thing.asset_catalog",
  schemaName: "gamecult.thing.asset_catalog",
  schemaVersion: "gamecult.thing.asset_catalog.v1",
  schema: { parse: identity<AssetCatalog> },
  codec: assetCatalog,
});

/** The five kinds, as the crate's ThingContract registers them. */
export const thingContract = defineDocumentRegistry(
  surfaceDocument,
  compositionDocument,
  commandInvocationDocument,
  commandResultDocument,
  assetCatalogDocument,
);
