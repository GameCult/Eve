//! Commands: what a surface declares, and the one envelope a consumer sends. The caller's
//! identity has no field here: the transport sets it.

use cultcache_rs::{CultSlots, CultUnion, DatabaseEntry};

use crate::domain::Version;
use crate::keys::{CommandId, NodeId, SchemaId, invocation_key};
use crate::source::ParamName;

/// A command a surface declares. A node may reference only a declared command.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct CommandDecl {
    #[cultcache(key = 0)]
    pub id: CommandId,
    #[cultcache(key = 1)]
    pub payload_schema: SchemaId,
    /// The input nodes whose current values travel with an invocation.
    #[cultcache(key = 2)]
    pub captures: Vec<NodeId>,
    #[cultcache(key = 3)]
    pub confirm: Option<String>,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct CommandIdRef {
    #[cultcache(key = 0)]
    pub id: CommandId,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum CommandRef {
    #[cultcache(key = 0)]
    Id(CommandIdRef),
    #[cultcache(key = 1)]
    Param(ParamName),
}

/// A typed record of the declared `payload_schema`, as its MessagePack bytes.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct RecordPayload {
    #[cultcache(key = 0)]
    pub schema: SchemaId,
    #[cultcache(key = 1, bytes)]
    pub bytes: Vec<u8>,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct TextValue {
    #[cultcache(key = 0)]
    pub value: String,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct NumberValue {
    #[cultcache(key = 0)]
    pub value: f64,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct BoolValue {
    #[cultcache(key = 0)]
    pub value: bool,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct ChoiceValue {
    #[cultcache(key = 0)]
    pub value: String,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum InputValue {
    #[cultcache(key = 0)]
    Text(TextValue),
    #[cultcache(key = 1)]
    Number(NumberValue),
    #[cultcache(key = 2)]
    Bool(BoolValue),
    #[cultcache(key = 3)]
    Choice(ChoiceValue),
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct CapturedInput {
    #[cultcache(key = 0)]
    pub node: NodeId,
    #[cultcache(key = 1)]
    pub value: InputValue,
}

/// A consumer's request that a provider run a declared command. Its fields are public, so a
/// result's copy of `invocation_id` is a convenience and not provenance: core binds results
/// to the invocations it issued.
#[derive(Clone, Debug, PartialEq, DatabaseEntry)]
#[cultcache(type = "gamecult.thing.command_invocation", schema = "gamecult.thing.command_invocation.v1")]
pub struct CommandInvocation {
    /// A UUID string, unique per invocation.
    #[cultcache(key = 0)]
    pub invocation_id: String,
    #[cultcache(key = 1)]
    pub surface_key: String,
    #[cultcache(key = 2)]
    pub surface_version: Version,
    #[cultcache(key = 3)]
    pub command: CommandId,
    #[cultcache(key = 4)]
    pub payload: RecordPayload,
    #[cultcache(key = 5)]
    pub captured: Vec<CapturedInput>,
    #[cultcache(key = 6)]
    pub client: String,
    /// RFC 3339, UTC.
    #[cultcache(key = 7)]
    pub issued_at: String,
    #[cultcache(key = 8)]
    pub delegation: Option<String>,
}

impl CommandInvocation {
    pub fn record_key(&self) -> String {
        invocation_key(&self.invocation_id)
    }
}
