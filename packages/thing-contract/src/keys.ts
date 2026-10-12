// The record key of each kind (crates/thing-contract/src/keys.rs). Provider, publisher and invocation ids are free
// strings (dotted, as the Verse names them); the trailing parts are typed, so a key splits at its last dot (surface,
// asset catalog, result) or last two (composition) and two different field sets never build one key. Each local
// segment goes through the segment codec, and a seq or version through its own.
import { segment, seq, version } from "./domain.js";

export function surfaceKey(providerId: string, label: string): string {
  return `thing:surface:${providerId}.${segment.encode(label)}`;
}

export function compositionKey(publisher: string, name: string, versionNumber: number | bigint): string {
  return `thing:composition:${publisher}.${segment.encode(name)}.v${version.encode(versionNumber)}`;
}

export function invocationKey(invocationId: string): string {
  return `thing:invocation:${invocationId}`;
}

export function resultKey(invocationId: string, position: number): string {
  return `thing:result:${invocationId}.${seq.encode(position)}`;
}

export function assetCatalogKey(providerId: string, catalogId: string): string {
  return `thing:asset_catalog:${providerId}.${segment.encode(catalogId)}`;
}
