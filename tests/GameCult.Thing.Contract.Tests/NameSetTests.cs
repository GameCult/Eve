using GameCult.Caching;
using GameCult.Caching.MessagePack;

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

    private static int Replace(byte[] bytes, byte[] from, byte[] to)
    {
        var count = 0;
        for (var i = 0; i + from.Length <= bytes.Length; i++)
        {
            if (!bytes.AsSpan(i, from.Length).SequenceEqual(from)) continue;
            to.CopyTo(bytes, i);
            count++;
        }

        return count;
    }

    [Test]
    public void AStoreWhoseRecordedTypeNameChangedIsRefusedOnReopen()
    {
        var scratch = Path.Combine(Path.GetTempPath(), $"thing-contract-names-{Guid.NewGuid():N}.cc");
        try
        {
            using (var cache = CultCacheMessagePack.Create(scratch, new CultCacheOpenOptions { Registry = Wire.Registry }))
            {
                Assert.That(cache.Commit(batch => batch.Upsert(Builders.FullAssetCatalog())), Is.True);
                cache.FlushAsync().GetAwaiter().GetResult();
            }

            using (var cache = CultCacheMessagePack.Create(scratch, new CultCacheOpenOptions { Registry = Wire.Registry, ReadOnly = true }))
                Assert.That(cache.GetAll<AssetCatalog>().Single().Assets, Has.Count.EqualTo(2), "the unpatched store reopens");

            // A store written by a different type shape carries a different schema id and different type names. The
            // reopen compares names only when the ids differ, so the patch moves both: the id's last digit and Int64.
            var id = Wire.Registry.GetRequired(typeof(AssetCatalog)).ToCatalogEntry().SchemaId;
            var movedId = id[..^1] + (id[^1] == '0' ? '1' : '0');
            var bytes = File.ReadAllBytes(scratch);
            var patched = Replace(bytes, System.Text.Encoding.UTF8.GetBytes(id), System.Text.Encoding.UTF8.GetBytes(movedId))
                + Replace(bytes, "System.Int64"u8.ToArray(), "System.Int32"u8.ToArray());
            Assert.That(patched, Is.GreaterThan(0), "the store records the type name");
            File.WriteAllBytes(scratch, bytes);
            var error = Assert.Catch(() =>
            {
                using var cache = CultCacheMessagePack.Create(scratch, new CultCacheOpenOptions { Registry = Wire.Registry, ReadOnly = true });
                _ = cache.GetAll<AssetCatalog>().ToList();
            })!;
            TestContext.Progress.WriteLine($"NAMEPATCH patched={patched} refused-by: {Wire.Flatten(error)}");
            Assert.That(Wire.Flatten(error), Does.Contain("System.Int64").And.Contain("System.Int32"), "the refusal is the type-name comparison");
        }
        finally
        {
            File.Delete(scratch);
        }
    }
}
