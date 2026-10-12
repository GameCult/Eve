using System.Collections.Generic;
using GameCult.Caching;
using MessagePack;

namespace GameCult.Thing.Contract;

[MessagePackObject]
public sealed class AssetEntry
{
    [Key(0)] public string Id { get; }
    [Key(1)] public string MediaType { get; }
    [Key(2)] public string Uri { get; }
    [Key(3)] public int Width { get; }
    [Key(4)] public int Height { get; }

    public AssetEntry(string id, string mediaType, string uri, int width, int height)
    {
        Id = id;
        MediaType = mediaType;
        Uri = uri;
        Width = ThingDomain.Count(width);
        Height = ThingDomain.Count(height);
    }
}

[CultDocument("gamecult.thing.asset_catalog", "gamecult.thing.asset_catalog.v1")]
[MessagePackObject]
public sealed class AssetCatalog
{
    [Key(0)] public string ProviderId { get; }
    [Key(1)] public string CatalogId { get; }
    [Key(2)] public long Version { get; }
    [Key(3)] public List<AssetEntry> Assets { get; }

    public AssetCatalog(string providerId, string catalogId, long version, List<AssetEntry> assets)
    {
        ProviderId = providerId;
        CatalogId = ThingDomain.Segment(catalogId);
        Version = ThingDomain.Version(version);
        Assets = assets;
    }

    [IgnoreMember] public string RecordKey => ThingKeys.AssetCatalogKey(ProviderId, CatalogId);
}
