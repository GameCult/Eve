//! Identifier newtypes and the record key of each kind. No caller spells a key as a free string.

use serde::{Deserialize, Serialize};

use crate::domain::{Segment, Seq, Version};

macro_rules! id_type {
    ($(#[$doc:meta])* $name:ident) => {
        $(#[$doc])*
        #[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
        #[serde(transparent)]
        pub struct $name(String);

        impl $name {
            pub fn new(value: impl Into<String>) -> Self {
                Self(value.into())
            }

            pub fn as_str(&self) -> &str {
                &self.0
            }
        }
    };
}

id_type!(
    /// A provider of surfaces and state.
    ProviderId
);
id_type!(
    /// The schema id of a CultCache entry type, for example `gamecult.thing.surface.v1`.
    SchemaId
);
id_type!(
    /// The record key of a state record.
    RecordKey
);
id_type!(
    /// A node id, unique within its document after composition expansion.
    NodeId
);
id_type!(
    /// A command declared by a surface.
    CommandId
);

// Each key joins free-string provider or publisher ids (dotted, as the Verse names them)
// with typed trailing parts: a `Segment` holds no dot and a `Seq` or `Version` is digits. A
// key therefore splits at its last dot (surface, asset catalog, result) or last two
// (composition), so two different field sets never build one key.

pub(crate) fn surface_key(provider: &ProviderId, label: &Segment) -> String {
    format!("thing:surface:{}.{}", provider.as_str(), label.as_str())
}

pub(crate) fn composition_key(publisher: &str, name: &Segment, version: Version) -> String {
    format!("thing:composition:{publisher}.{}.v{}", name.as_str(), version.get())
}

pub(crate) fn invocation_key(invocation_id: &str) -> String {
    format!("thing:invocation:{invocation_id}")
}

pub(crate) fn result_key(invocation_id: &str, seq: Seq) -> String {
    format!("thing:result:{invocation_id}.{}", seq.get())
}

pub(crate) fn asset_catalog_key(provider: &ProviderId, catalog_id: &Segment) -> String {
    format!("thing:asset_catalog:{}.{}", provider.as_str(), catalog_id.as_str())
}
