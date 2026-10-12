// The value domains of the contract's numbers and local names (crates/thing-contract/src/domain.rs). Each is a leaf
// codec of cultcache-ts with the contract's bound added, so the bound holds on both doors of a document: encode and
// decode. A refusal names the domain and its bound, never the value (the leaf's own refusals do not echo one either).
import { codecs } from "@gamecult/cultcache-ts";
import type { Codec } from "@gamecult/cultcache-ts";

// A domain's wire form is its value, so its encode hands the checked value back: a caller that holds a number from
// outside (a factory argument, a key part) passes it through `encode` and keeps what comes out.
export interface Domain<TValue> extends Codec<TValue> {
  encode(value: TValue): TValue;
}

function bounded<TValue extends number | bigint | string>(
  leaf: Codec<TValue>,
  refusal: (value: TValue) => string | null,
): Domain<TValue> {
  const hold = (value: TValue): TValue => {
    const refused = refusal(value);
    if (refused !== null) throw new Error(refused);
    return value;
  };
  return {
    typeName: leaf.typeName,
    valueType: leaf.valueType,
    encode: (value) => hold(leaf.encode(value) as TValue),
    decode: (raw) => hold(leaf.decode(raw)),
  };
}

/** A result's position in its invocation's answers, counting from 1. */
export const seq = bounded(codecs.int32, (value) => (value >= 1 ? null : "Seq must be at least 1"));

/** A document or source version, never negative. */
export const version = bounded(codecs.int64, (value) => (value >= 0 ? null : "Version must be at least 0"));

/** A count, an extent or an index, never negative. */
export const count = bounded(codecs.int32, (value) => (value >= 0 ? null : "Count must be at least 0"));

/**
 * A name the contract joins into a record key: non-empty, no '.'. A domain admits no nil, and the library refuses a nil
 * in a value slot, so it is declared one.
 */
export const segment: Domain<string> = {
  ...bounded(codecs.string, (value) =>
    value === "" ? "Segment must be non-empty" : value.includes(".") ? "Segment must be free of '.'" : null,
  ),
  valueType: true,
};

/** One colour channel: a byte. */
export const channel = bounded(codecs.int32, (value) => (value >= 0 && value <= 255 ? null : "Rgba channel must be 0 to 255"));
