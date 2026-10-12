//! An asset catalog: the images a provider's surfaces reference by catalog id and asset id.

use cultcache_rs::{CultSlots, DatabaseEntry};

use crate::keys::{ProviderId, asset_catalog_key};

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct AssetEntry {
    #[cultcache(key = 0)]
    pub id: String,
    #[cultcache(key = 1)]
    pub media_type: String,
    #[cultcache(key = 2)]
    pub uri: String,
    #[cultcache(key = 3)]
    pub width: i32,
    #[cultcache(key = 4)]
    pub height: i32,
}

#[derive(Clone, Debug, PartialEq, DatabaseEntry)]
#[cultcache(type = "gamecult.thing.asset_catalog", schema = "gamecult.thing.asset_catalog.v1")]
pub struct AssetCatalog {
    #[cultcache(key = 0)]
    pub provider_id: ProviderId,
    #[cultcache(key = 1)]
    pub catalog_id: String,
    #[cultcache(key = 2)]
    pub version: i64,
    #[cultcache(key = 3)]
    pub assets: Vec<AssetEntry>,
}

impl AssetCatalog {
    pub fn record_key(&self) -> String {
        asset_catalog_key(&self.provider_id, &self.catalog_id)
    }
}
