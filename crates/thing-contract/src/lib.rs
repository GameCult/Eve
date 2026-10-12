//! The `gamecult.thing.*` wire types and their bytes. This crate owns the contract: the
//! golden payloads it blesses are what every other language package and core are held to.
//!
//! Every kind is a CultCache `DatabaseEntry`; every closed set is a `CultUnion` written
//! `[armKey, [slots...]]`, the shape the C# reference reads and writes.

mod asset;
mod command;
mod keys;
mod node;
mod result;
mod source;
mod style;

pub use asset::*;
pub use command::*;
pub use keys::{CommandId, NodeId, ProviderId, RecordKey, SchemaId};
pub use node::*;
pub use result::*;
pub use source::*;
pub use style::*;

use cultcache_rs::{CultCache, CultCacheRegistry};

/// Registers the five kinds with a cache.
pub struct ThingContract;

impl CultCacheRegistry for ThingContract {
    fn register_entries(&self, cache: &mut CultCache) -> anyhow::Result<()> {
        cache.register_entry_type::<SurfaceDocument>()?;
        cache.register_entry_type::<CompositionDocument>()?;
        cache.register_entry_type::<CommandInvocation>()?;
        cache.register_entry_type::<CommandResult>()?;
        cache.register_entry_type::<AssetCatalog>()?;
        Ok(())
    }
}
