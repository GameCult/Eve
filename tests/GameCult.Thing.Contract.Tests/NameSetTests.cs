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
            ContentHash = local.ContentHash[..^1] + (local.ContentHash[^1] == '0' ? '1' : '0'),
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

    // A persisted entry equal in id and content hash resolves without comparison, so the entries below move both.
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

    private static int Patch(byte[] bytes, string from, string to)
    {
        var f = System.Text.Encoding.UTF8.GetBytes(from);
        var t = System.Text.Encoding.UTF8.GetBytes(to);
        Assert.That(t, Has.Length.EqualTo(f.Length));
        var count = 0;
        for (var i = 0; i + f.Length <= bytes.Length; i++)
        {
            if (!bytes.AsSpan(i, f.Length).SequenceEqual(f)) continue;
            t.CopyTo(bytes, i);
            count++;
        }

        return count;
    }

    private static string Moved(string hex) => hex[..^1] + (hex[^1] == '0' ? '1' : '0');

    // CultCache reopens a store by schema id; an id it does not own is resolved by name and compared member by member.
    // A store whose recorded id and content hash name another schema and whose type name was changed is refused, while
    // the same patch without the type name opens: the refusal is the type-name comparison, end to end.
    [Test]
    public void AStoreWhoseRecordedTypeNameDiffersIsRefusedOnReopen()
    {
        var path = Path.Combine(Path.GetTempPath(), $"thing-names-{Guid.NewGuid():N}.cc");
        try
        {
            using (var cache = CultCacheMessagePack.Create(path, new CultCacheOpenOptions { Registry = Wire.Registry }))
            {
                cache.Commit(b => b.Upsert(Builders.FullAssetCatalog()));
                cache.FlushAsync().GetAwaiter().GetResult();
            }

            var entry = Wire.Registry.GetRequired(typeof(AssetCatalog)).ToCatalogEntry();
            var written = File.ReadAllBytes(path);

            byte[] Patched(bool typeName)
            {
                var bytes = (byte[])written.Clone();
                Assert.That(Patch(bytes, entry.SchemaId, Moved(entry.SchemaId)), Is.GreaterThan(0), "the schema id was recorded");
                Assert.That(Patch(bytes, entry.ContentHash, Moved(entry.ContentHash)), Is.GreaterThan(0), "the content hash was recorded");
                if (typeName) Assert.That(Patch(bytes, "System.Int64", "System.Int32"), Is.GreaterThan(0), "a member type name was recorded");
                return bytes;
            }

            int Reopen(byte[] bytes)
            {
                File.WriteAllBytes(path, bytes);
                using var cache = CultCacheMessagePack.Create(path, new CultCacheOpenOptions { Registry = Wire.Registry, ReadOnly = true });
                return cache.GetAll<AssetCatalog>().Count();
            }

            Assert.That(Reopen(written), Is.EqualTo(1), "the unpatched store reopens");
            Assert.That(Reopen(Patched(typeName: false)), Is.EqualTo(1), "a moved id and hash with the same names reopens");
            var error = Assert.Catch(() => Reopen(Patched(typeName: true)))!;
            Assert.That(Wire.Flatten(error), Does.Contain("changed type").And.Contain("System.Int32").And.Contain("System.Int64"));
        }
        finally
        {
            File.Delete(path);
        }
    }
}
