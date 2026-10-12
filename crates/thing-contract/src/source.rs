//! Where a value comes from: a literal, a binding to a state record, or a composition parameter.
//! A member path is a list of names and indices, never an expression.

use cultcache_rs::{CultSlots, CultUnion};

use crate::domain::Count;
use crate::keys::{ProviderId, RecordKey, SchemaId};

/// A composition parameter, named.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct ParamName {
    #[cultcache(key = 0)]
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct TextLiteral {
    #[cultcache(key = 0)]
    pub value: String,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct NumberLiteral {
    #[cultcache(key = 0)]
    pub value: f64,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct BoolLiteral {
    #[cultcache(key = 0)]
    pub value: bool,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum TextSource {
    #[cultcache(key = 0)]
    Literal(TextLiteral),
    #[cultcache(key = 1)]
    Bound(Bind),
    #[cultcache(key = 2)]
    Param(ParamName),
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum NumberSource {
    #[cultcache(key = 0)]
    Literal(NumberLiteral),
    #[cultcache(key = 1)]
    Bound(Bind),
    #[cultcache(key = 2)]
    Param(ParamName),
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum BoolSource {
    #[cultcache(key = 0)]
    Literal(BoolLiteral),
    #[cultcache(key = 1)]
    Bound(Bind),
    #[cultcache(key = 2)]
    Param(ParamName),
}

/// One member of a record, read through a path, optionally formatted.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct Bind {
    #[cultcache(key = 0)]
    pub source: StateSource,
    #[cultcache(key = 1)]
    pub member: MemberPath,
    #[cultcache(key = 2)]
    pub format: Option<Format>,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum StateSource {
    #[cultcache(key = 0)]
    Record(StateRef),
    /// The current item inside a `Repeat` template.
    #[cultcache(key = 1)]
    Item,
}

/// A state record. An absent provider is the publisher of the document.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct StateRef {
    #[cultcache(key = 0)]
    pub provider: Option<ProviderId>,
    #[cultcache(key = 1)]
    pub schema: SchemaId,
    #[cultcache(key = 2)]
    pub key: RecordKey,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct MemberPath {
    #[cultcache(key = 0)]
    pub steps: Vec<MemberStep>,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum MemberStep {
    #[cultcache(key = 0)]
    Name(MemberName),
    #[cultcache(key = 1)]
    Index(MemberIndex),
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct MemberName {
    #[cultcache(key = 0)]
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct MemberIndex {
    #[cultcache(key = 0)]
    pub index: Count,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Format {
    #[cultcache(key = 0)]
    Number(NumberFormat),
    #[cultcache(key = 1)]
    Duration,
    #[cultcache(key = 2)]
    Timestamp,
    #[cultcache(key = 3)]
    Affix(AffixFormat),
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct NumberFormat {
    #[cultcache(key = 0)]
    pub precision: Count,
    #[cultcache(key = 1)]
    pub percent: bool,
    #[cultcache(key = 2)]
    pub unit: Option<String>,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct AffixFormat {
    #[cultcache(key = 0)]
    pub prefix: String,
    #[cultcache(key = 1)]
    pub suffix: String,
}

/// The records of one type, or a list member of one record.
#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum CollectionSource {
    #[cultcache(key = 0)]
    Records(RecordsSource),
    #[cultcache(key = 1)]
    Member(Bind),
    #[cultcache(key = 2)]
    Param(ParamName),
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct RecordsSource {
    #[cultcache(key = 0)]
    pub provider: Option<ProviderId>,
    #[cultcache(key = 1)]
    pub schema: SchemaId,
    #[cultcache(key = 2)]
    pub key_prefix: String,
}
