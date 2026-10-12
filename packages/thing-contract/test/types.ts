// Compile-time half of the construction rules, compiled by tsconfig.test.json: every @ts-expect-error line must be an
// error, or the compile fails. This file runs nothing.
import { CommandResult } from "@gamecult/thing-contract";
import type { CommandInvocation, Handler, Outcome } from "@gamecult/thing-contract";

declare const invocation: CommandInvocation;
declare const result: CommandResult;
declare const plain: { invocationId: string; seq: number; outcome: Outcome };

// An object literal does not satisfy CommandResult, because the class carries a private brand.
// @ts-expect-error
export const literal: CommandResult = { invocationId: "x", seq: 1, outcome: { kind: "Failed", reason: "r" } };

// Nor does a plain value of the same shape, nor a spread of a result.
// @ts-expect-error
export const shaped: CommandResult = plain;
// @ts-expect-error
export const spread: CommandResult = { ...result };

// The constructor is private: even a call whose arguments all type-check (the door argument is typed `never` here) is
// refused, so the error is the access, not the arity.
// @ts-expect-error
export const constructed = new CommandResult(undefined as never, "x", 1, { kind: "Failed", reason: "r" });

// The fields are read-only.
// @ts-expect-error
result.seq = 2;
// @ts-expect-error
result.invocationId = "y";
// @ts-expect-error
result.outcome = { kind: "Failed", reason: "r" };

// An Outcome is a tagged value, never a state string.
// @ts-expect-error
export const stringOutcome: Outcome = "completed";
// @ts-expect-error
export const stringFactory = CommandResult.failed(invocation, 1, "r", "completed", 3);
// @ts-expect-error
export const noInvocation = CommandResult.failed("inv-1", 1, "r");
// @ts-expect-error
export const stateInHandler: Handler = (): string => "completed";

// The positive cases compile.
export const built: CommandResult = CommandResult.failed(invocation, 1, "r");
export const handler: Handler = async () => ({ kind: "Pending", message: "m" });
