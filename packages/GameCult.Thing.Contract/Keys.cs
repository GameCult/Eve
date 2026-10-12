using System.Globalization;

namespace GameCult.Thing.Contract;

/// <summary>
/// The key of each kind. Each key joins free-string provider or publisher ids (dotted, as the Verse names them)
/// with typed trailing parts: a segment holds no dot and a seq or version is digits, so a key splits at its last dot
/// (surface, asset catalog, result) or last two (composition), and two different field sets never build one key.
/// </summary>
public static class ThingKeys
{
    public static string SurfaceKey(string providerId, string label) =>
        $"thing:surface:{providerId}.{ThingDomain.Segment(label)}";

    public static string CompositionKey(string publisher, string name, long version) =>
        $"thing:composition:{publisher}.{ThingDomain.Segment(name)}.v{ThingDomain.Version(version).ToString(CultureInfo.InvariantCulture)}";

    public static string InvocationKey(string invocationId) => $"thing:invocation:{invocationId}";

    public static string ResultKey(string invocationId, int seq) =>
        $"thing:result:{invocationId}.{ThingDomain.Seq(seq).ToString(CultureInfo.InvariantCulture)}";

    public static string AssetCatalogKey(string providerId, string catalogId) =>
        $"thing:asset_catalog:{providerId}.{ThingDomain.Segment(catalogId)}";
}
