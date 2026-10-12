// The answer to a command invocation. A CommandResult is built by its four factories, each of which copies the
// invocation's id, and by the command_result document codec when it decodes. Decoding is the other door and holds the
// same domain: `seq` is refused below 1 whichever door it enters by. No export takes a state as a string or converts a
// plain object: an object literal, a spread, structuredClone or JSON.parse output is not a result, and encoding one is
// refused (schema.parse in documents.ts).
//
// The copied invocation id is a convenience and not provenance: core binds a result to an invocation it issued.
import { codecs } from "@gamecult/cultcache-ts";
import type { SlotsCodec } from "@gamecult/cultcache-ts";

import { outcome } from "./codecs.js";
import { seq } from "./domain.js";
import type { CommandInvocation, Effect, NodeId, Outcome } from "./types.js";

// The one constructor call. The class's static block sets `mint`; the factories and the codec below use it; it is not
// exported. The constructor refuses any call that does not carry `door`, so a script that reaches the constructor at run
// time (the TypeScript `private` is compile-time only) builds nothing, and it holds the seq domain for every door.
const door: unique symbol = Symbol("CommandResult.door");
let mint: (invocationId: string, position: number, outcome: Outcome) => CommandResult;

export class CommandResult {
  readonly #brand = true;
  readonly invocationId: string;
  readonly seq: number;
  readonly outcome: Outcome;

  private constructor(key: typeof door, invocationId: string, position: number, outcome: Outcome) {
    if (key !== door) throw new Error("a CommandResult is built by its factories");
    this.invocationId = invocationId;
    this.seq = seq.encode(position);
    this.outcome = outcome;
    Object.freeze(this);
  }

  static {
    mint = (invocationId, position, outcome) => new CommandResult(door, invocationId, position, outcome);
  }

  static pending(invocation: CommandInvocation, position: number, message: string): CommandResult {
    return mint(invocation.invocationId, position, { kind: "Pending", message });
  }

  static completed(
    invocation: CommandInvocation,
    position: number,
    sourceVersion: number | bigint | null,
    clearDrafts: boolean,
    effect: Effect | null,
  ): CommandResult {
    return mint(invocation.invocationId, position, { kind: "Completed", sourceVersion, clearDrafts, effect });
  }

  static denied(invocation: CommandInvocation, position: number, reason: string, node: NodeId | null): CommandResult {
    return mint(invocation.invocationId, position, { kind: "Denied", reason, node });
  }

  static failed(invocation: CommandInvocation, position: number, reason: string): CommandResult {
    return mint(invocation.invocationId, position, { kind: "Failed", reason });
  }

  /** True for an instance a factory or the codec made; false for any other value, whatever its shape or prototype. */
  static isResult(value: unknown): value is CommandResult {
    return typeof value === "object" && value !== null && #brand in value;
  }
}

// The command_result document codec: the slot record, with decode minting an instance. Encode reads the instance's
// fields through the same slot record, so the seq domain is held on both doors.
const slotRecord = codecs.slots<{ invocationId: string; seq: number; outcome: Outcome }>(
  { 0: ["invocationId", codecs.string], 1: ["seq", seq], 2: ["outcome", outcome] },
  "GameCult.Thing.Contract.CommandResult",
);

export const commandResult: SlotsCodec<CommandResult> = {
  names: slotRecord.names,
  typeName: slotRecord.typeName,
  get members() {
    return slotRecord.members;
  },
  encode: (value) => slotRecord.encode(value),
  decode: (raw) => {
    const { invocationId, seq: position, outcome: answer } = slotRecord.decode(raw);
    return mint(invocationId, position, answer);
  },
};

