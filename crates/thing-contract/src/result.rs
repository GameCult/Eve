//! The answer to a command invocation. A `CommandResult` is built only by its four
//! constructors, each of which copies the invocation's id, and is read through accessors.
//! Nothing here takes a state as a string, and nothing builds a result from a map.

use cultcache_rs::{CultSlots, CultUnion, DatabaseEntry};

use crate::command::{CommandInvocation, CommandRef};
use crate::keys::{NodeId, result_key};

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct PendingOutcome {
    #[cultcache(key = 0)]
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct CompletedOutcome {
    #[cultcache(key = 0)]
    pub source_version: Option<i64>,
    /// Whether the captured drafts of the invocation clear.
    #[cultcache(key = 1)]
    pub clear_drafts: bool,
    #[cultcache(key = 2)]
    pub effect: Option<Effect>,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct DeniedOutcome {
    #[cultcache(key = 0)]
    pub reason: String,
    #[cultcache(key = 1)]
    pub node: Option<NodeId>,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct FailedOutcome {
    #[cultcache(key = 0)]
    pub reason: String,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Outcome {
    #[cultcache(key = 0)]
    Pending(PendingOutcome),
    #[cultcache(key = 1)]
    Completed(CompletedOutcome),
    #[cultcache(key = 2)]
    Denied(DeniedOutcome),
    #[cultcache(key = 3)]
    Failed(FailedOutcome),
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct OpenSurfaceEffect {
    #[cultcache(key = 0)]
    pub key: String,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct OpenExternalEffect {
    #[cultcache(key = 0)]
    pub url: String,
    /// The command run when the external step returns.
    #[cultcache(key = 1)]
    pub resume: CommandRef,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Effect {
    #[cultcache(key = 0)]
    OpenSurface(OpenSurfaceEffect),
    #[cultcache(key = 1)]
    OpenExternal(OpenExternalEffect),
}

/// A provider's answer to one invocation. `seq` counts from 1 per invocation.
///
/// The positive case, a result built by a constructor from the invocation it answers:
///
/// ```
/// use thing_contract::{CommandInvocation, CommandResult};
/// fn answer(invocation: &CommandInvocation) -> CommandResult {
///     CommandResult::failed(invocation, 1, "refused")
/// }
/// ```
///
/// A struct literal does not compile, because the fields are private:
///
/// ```compile_fail,E0451
/// use thing_contract::{CommandResult, Outcome, FailedOutcome};
/// let _ = CommandResult {
///     invocation_id: String::new(),
///     seq: 1,
///     outcome: Outcome::Failed(FailedOutcome { reason: String::new() }),
/// };
/// ```
///
/// Neither does assigning the outcome:
///
/// ```compile_fail,E0616
/// use thing_contract::{CommandInvocation, CommandResult, Outcome, FailedOutcome};
/// fn tamper(invocation: &CommandInvocation) {
///     let mut result = CommandResult::failed(invocation, 1, "refused");
///     result.outcome = Outcome::Failed(FailedOutcome { reason: String::new() });
/// }
/// ```
///
/// Nothing converts a map into a result:
///
/// ```compile_fail,E0277
/// use std::collections::BTreeMap;
/// use thing_contract::CommandResult;
/// let flat: BTreeMap<String, String> = BTreeMap::new();
/// let _ = CommandResult::from(flat);
/// ```
///
/// Nor a string state:
///
/// ```compile_fail,E0277
/// use thing_contract::CommandResult;
/// let _ = CommandResult::from("completed");
/// ```
#[derive(Clone, Debug, PartialEq, DatabaseEntry)]
#[cultcache(type = "gamecult.thing.command_result", schema = "gamecult.thing.command_result.v1")]
pub struct CommandResult {
    #[cultcache(key = 0)]
    invocation_id: String,
    #[cultcache(key = 1)]
    seq: i32,
    #[cultcache(key = 2)]
    outcome: Outcome,
}

impl CommandResult {
    fn answering(invocation: &CommandInvocation, seq: i32, outcome: Outcome) -> Self {
        Self { invocation_id: invocation.invocation_id.clone(), seq, outcome }
    }

    pub fn pending(invocation: &CommandInvocation, seq: i32, message: impl Into<String>) -> Self {
        Self::answering(invocation, seq, Outcome::Pending(PendingOutcome { message: message.into() }))
    }

    pub fn completed(
        invocation: &CommandInvocation,
        seq: i32,
        source_version: Option<i64>,
        clear_drafts: bool,
        effect: Option<Effect>,
    ) -> Self {
        Self::answering(
            invocation,
            seq,
            Outcome::Completed(CompletedOutcome { source_version, clear_drafts, effect }),
        )
    }

    pub fn denied(
        invocation: &CommandInvocation,
        seq: i32,
        reason: impl Into<String>,
        node: Option<NodeId>,
    ) -> Self {
        Self::answering(invocation, seq, Outcome::Denied(DeniedOutcome { reason: reason.into(), node }))
    }

    pub fn failed(invocation: &CommandInvocation, seq: i32, reason: impl Into<String>) -> Self {
        Self::answering(invocation, seq, Outcome::Failed(FailedOutcome { reason: reason.into() }))
    }

    pub fn invocation_id(&self) -> &str {
        &self.invocation_id
    }

    pub fn seq(&self) -> i32 {
        self.seq
    }

    pub fn outcome(&self) -> &Outcome {
        &self.outcome
    }

    pub fn record_key(&self) -> String {
        result_key(&self.invocation_id, self.seq)
    }
}
