using GameCult.Caching;

namespace GameCult.Thing.Contract.Tests;

/// <summary>
/// The names a CultCache store records for the package's documents. CultLib's C# reference compares catalog type names
/// when a store reopens, so these names are the C# package's to own: tests/thing-contract-parity holds them for every
/// runtime package, and they change only in the commit that changes the C# types.
/// </summary>
public sealed class NameSetTests
{
    private static string ParityPath(string file) => Path.Combine(AppContext.BaseDirectory, "parity", file);

    private static string[] Lines(string file) => File.ReadAllLines(ParityPath(file)).Where(l => l.Length > 0).ToArray();

    [Test]
    public void TheCatalogEntriesAreTheMembersFile()
    {
        var actual = Wire.DocumentTypes.OrderBy(t => Wire.Registry.GetRequired(t).ToCatalogEntry().SchemaId, StringComparer.Ordinal)
            .SelectMany(t =>
            {
                var entry = Wire.Registry.GetRequired(t).ToCatalogEntry();
                return entry.Members.Select(m => $"{entry.SchemaId}\t{m.Slot}\t{m.MemberName}\t{m.TypeName}");
            }).ToArray();
        Assert.That(actual, Is.EqualTo(Lines("catalog-members.tsv")));
        Assert.That(actual, Has.Length.GreaterThan(20));
    }

    [Test]
    public void ThePublicTypesAreTheTypeNamesFile()
    {
        var actual = typeof(CommandResult).Assembly.GetExportedTypes().Select(t => t.FullName!).OrderBy(n => n, StringComparer.Ordinal).ToArray();
        Assert.That(actual, Is.EqualTo(Lines("type-names.txt")));
        Assert.That(actual, Has.Length.GreaterThan(150));
    }

    private static CultSchemaCatalogEntry Persisted(Type document, string memberTypeFrom, string memberTypeTo)
    {
        var local = Wire.Registry.GetRequired(document).ToCatalogEntry();
        return new CultSchemaCatalogEntry
        {
            SchemaId = local.SchemaId[..^1] + (local.SchemaId[^1] == '0' ? '1' : '0'),
            SchemaName = local.SchemaName,
            SchemaVersion = local.SchemaVersion,
            ContentHash = local.ContentHash,
            CanonicalSchemaJson = local.CanonicalSchemaJson,
            Members = local.Members.Select(m => new CultSchemaMemberCatalogEntry
            {
                Slot = m.Slot,
                MemberName = m.MemberName,
                TypeName = m.TypeName == memberTypeFrom ? memberTypeTo : m.TypeName,
                IsReference = m.IsReference,
                IsMany = m.IsMany,
                TargetSchemaName = m.TargetSchemaName,
                IsName = m.IsName,
                IndexAlias = m.IndexAlias,
            }).ToArray(),
        };
    }

    // CultCache compares a persisted catalog with the package's names where it resolves a persisted schema id that is not
    // its own (ResolvePersistedSchema). Reopening a single-file store does not call it: a store whose recorded names were
    // patched (id and Int64 both) opens and reads at b3bd8dd5, so the comparison is exercised on the entry the store
    // would record.
    [Test]
    public void APersistedCatalogWhoseTypeNameDiffersIsRefusedByTheComparison()
    {
        var unchanged = Persisted(typeof(AssetCatalog), "-", "-");
        Assert.That(Wire.Registry.ResolvePersistedSchemaReport(unchanged.SchemaId, new[] { unchanged }).Kind,
            Is.EqualTo(CultSchemaMigrationKind.CompatibleDrift), "a moved id with the same names resolves");

        var renamed = Persisted(typeof(AssetCatalog), "System.Int64", "System.Int32");
        var error = Assert.Throws<InvalidOperationException>(() => Wire.Registry.ResolvePersistedSchema(renamed.SchemaId, new[] { renamed }))!;
        Assert.That(error.Message, Does.Contain("changed type").And.Contain("System.Int32").And.Contain("System.Int64"));

        var listed = Persisted(typeof(AssetCatalog), "System.Collections.Generic.IReadOnlyList<GameCult.Thing.Contract.AssetEntry>",
            "System.Collections.Generic.List<GameCult.Thing.Contract.AssetEntry>");
        Assert.Throws<InvalidOperationException>(() => Wire.Registry.ResolvePersistedSchema(listed.SchemaId, new[] { listed }),
            "a store written when Assets was a List is refused");
    }
}
