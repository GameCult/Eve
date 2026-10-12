using GameCult.Caching;
using GameCult.Caching.MessagePack;
using MessagePack;
using static GameCult.Thing.Contract.Tests.Builders;

namespace GameCult.Thing.Contract.Tests;

public sealed class GoldenTests
{
    private static readonly string[] RefusalGoldens =
    {
        "result-thing1-flat", "node-unknown-arm", "outcome-unknown-arm", "result-extra-slot", "result-seq-zero",
        "surface-version-negative", "surface-label-dotted", "asset-extent-negative", "rgba-channel-out-of-range",
    };

    private static IEnumerable<TestCaseData> ValueGoldens()
    {
        yield return new TestCaseData("surface-all-arms", (Func<object>)FullSurface);
        yield return new TestCaseData("composition-all-params", (Func<object>)FullComposition);
        yield return new TestCaseData("invocation-all-inputs", (Func<object>)Invocation);
        foreach (var (name, _) in Results(Invocation()))
        {
            var captured = name;
            yield return new TestCaseData(captured, (Func<object>)(() => Results(Invocation()).Single(r => r.Name == captured).Result));
        }
        yield return new TestCaseData("asset-catalog", (Func<object>)FullAssetCatalog);
    }

    [TestCaseSource(nameof(ValueGoldens))]
    public void Goldens(string name, Func<object> build)
    {
        var value = build();
        var golden = Wire.Golden($"{name}.bin");

        Assert.That(Convert.ToHexString(Wire.Write(value)), Is.EqualTo(Convert.ToHexString(golden)), $"{name}: the package writes the committed bytes");

        var decoded = Wire.Read(value.GetType(), golden);
        Assert.That(Convert.ToHexString(Wire.Write(decoded)), Is.EqualTo(Convert.ToHexString(golden)), $"{name}: decoding and re-encoding keeps the bytes");
    }

    [Test]
    public void EveryBinGoldenIsNamedByACase()
    {
        var named = ValueGoldens().Select(c => (string)c.Arguments[0]!).Concat(RefusalGoldens)
            .OrderBy(n => n, StringComparer.Ordinal).ToArray();
        var onDisk = Directory.GetFiles(Path.GetDirectoryName(Wire.GoldenPath("x"))!, "*.bin")
            .Select(f => Path.GetFileNameWithoutExtension(f)).OrderBy(n => n, StringComparer.Ordinal).ToArray();
        Assert.That(onDisk, Is.EqualTo(named));
    }

    // ---- refusals ----

    private static string Refused(Type type, string golden)
    {
        var bytes = Wire.Golden($"{golden}.bin");
        var error = Assert.Throws<MessagePackSerializationException>(() => Wire.Read(type, bytes))!;
        var text = Wire.Flatten(error);
        Assert.That(text, Does.Not.Contain(Wire.Canary), $"{golden}: the refusal echoes no value");
        return text;
    }

    [Test]
    public void Thing1FlatMapIsRefused() => Refused(typeof(CommandResult), "result-thing1-flat");

    [TestCase("node-unknown-arm", typeof(SurfaceDocument), "Node", "13")]
    [TestCase("outcome-unknown-arm", typeof(CommandResult), "Outcome", "4")]
    public void UnknownArmsAreRefusedNamingUnionAndKey(string golden, Type type, string union, string key)
    {
        var text = Refused(type, golden);
        Assert.That(text, Does.Contain($"{typeof(CommandResult).Namespace}.{union} has no arm for key {key}"));
    }

    [TestCase("result-seq-zero", typeof(CommandResult), "Seq")]
    [TestCase("surface-version-negative", typeof(SurfaceDocument), "Version")]
    [TestCase("surface-label-dotted", typeof(SurfaceDocument), "Segment")]
    [TestCase("asset-extent-negative", typeof(AssetCatalog), "Count")]
    public void DomainGoldensAreRefusedNamingTheDomain(string golden, Type type, string domain)
    {
        Assert.That(Refused(type, golden), Does.Contain($"{domain} must be"));
    }

    [Test]
    public void RgbaChannelAbove255IsRefused()
    {
        var bytes = Wire.Golden("rgba-channel-out-of-range.bin");
        var error = Assert.Throws<MessagePackSerializationException>(
            () => MessagePackSerializer.Deserialize<Rgba>(bytes, Wire.Options))!;
        var text = Wire.Flatten(error);
        Assert.That(text, Does.Not.Contain(Wire.Canary));
        Assert.That(text, Does.Contain("Rgba"));
    }

    [Test]
    public void ExtraTrailingSlotIsReadAsPendingSeqOne()
    {
        var golden = Wire.Golden("result-extra-slot.bin");
        var result = (CommandResult)Wire.Read(typeof(CommandResult), golden);
        Assert.That(result.InvocationId, Is.EqualTo("inv-1"));
        Assert.That(result.Seq, Is.EqualTo(1));
        Assert.That(result.Outcome, Is.TypeOf<PendingOutcome>());
        Assert.That(((PendingOutcome)result.Outcome).Message, Is.EqualTo("working"));
        // Read, never written back: re-encoding drops the extra slot.
        Assert.That(Wire.Write(result).Length, Is.LessThan(golden.Length));
    }

    // ---- the store ----

    [Test]
    public void StoreRead()
    {
        var scratch = Path.Combine(Path.GetTempPath(), $"thing-contract-store-{Guid.NewGuid():N}.cc");
        File.Copy(Wire.GoldenPath("surface.cc"), scratch);
        try
        {
            using var cache = CultCacheMessagePack.Create(scratch, new CultCacheOpenOptions { Registry = Wire.Registry, ReadOnly = true });

            var cases = new (object Value, string Golden, string Key)[]
            {
                (cache.GetAll<SurfaceDocument>().Single(), "surface-all-arms", "thing:surface:provider.a.main"),
                (cache.GetAll<CompositionDocument>().Single(), "composition-all-params", "thing:composition:provider.a.panel.v3"),
                (cache.GetAll<CommandInvocation>().Single(), "invocation-all-inputs", "thing:invocation:3f2b8c1e-5d44-4a6b-9a07-1c2d3e4f5a6b"),
                (cache.GetAll<CommandResult>().Single(), "result-pending", "thing:result:3f2b8c1e-5d44-4a6b-9a07-1c2d3e4f5a6b.1"),
                (cache.GetAll<AssetCatalog>().Single(), "asset-catalog", "thing:asset_catalog:provider.a.icons"),
            };
            foreach (var (value, golden, key) in cases)
            {
                Assert.That(Convert.ToHexString(Wire.Write(value)), Is.EqualTo(Convert.ToHexString(Wire.Golden($"{golden}.bin"))), golden);
                var recordKey = (string)value.GetType().GetProperty("RecordKey")!.GetValue(value)!;
                Assert.That(recordKey, Is.EqualTo(key), golden);
                Assert.That(cache.Get(new CultRecordKey(recordKey)), Is.SameAs(value), $"{golden}: stored under the package's own key");
            }
        }
        finally
        {
            File.Delete(scratch);
        }
    }
}
