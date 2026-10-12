using System.Text.Json;
using MessagePack;
using static GameCult.Thing.Contract.Tests.Builders;

namespace GameCult.Thing.Contract.Tests;

/// <summary>The four domains, at every constructor that carries one and at every door that reaches a constructor.</summary>
public sealed class DomainTests
{
    private static CommandInvocation Inv() => Invocation();

    // Each domain-carrying field of contract-rs r2, with one out-of-domain value. The expected text is Rust's DomainError Display.
    private static IEnumerable<TestCaseData> OutOfDomain()
    {
        TestCaseData Case(string field, string message, Action build) => new TestCaseData(message, build).SetName($"OutOfDomain({field})");

        yield return Case("CommandResult.Seq", "Seq must be at least 1", () => CommandResult.Pending(Inv(), 0, "m"));
        yield return Case("CommandResult.Seq min", "Seq must be at least 1", () => CommandResult.Failed(Inv(), int.MinValue, "r"));
        yield return Case("CompletedOutcome.SourceVersion", "Version must be at least 0", () => new CompletedOutcome(-1, false, null));
        yield return Case("CommandResult.Completed source version", "Version must be at least 0", () => CommandResult.Completed(Inv(), 1, -1, false, null));
        yield return Case("CommandInvocation.SurfaceVersion", "Version must be at least 0",
            () => new CommandInvocation("i", "k", -1, "go", new RecordPayload("s", Array.Empty<byte>()), new List<CapturedInput>(), "c", "t", null));
        yield return Case("SurfaceDocument.Label empty", "Segment must be non-empty", () => SurfaceOf("p", ""));
        yield return Case("SurfaceDocument.Label dotted", "Segment must be free of '.'", () => SurfaceOf("p", "a.b"));
        yield return Case("SurfaceDocument.Version", "Version must be at least 0", () => new SurfaceDocument("p", "l", -1, "t", Boxed("r"), new List<CommandDecl>()));
        yield return Case("CompositionDocument.Name empty", "Segment must be non-empty", () => CompositionOf("p", "", 1));
        yield return Case("CompositionDocument.Name dotted", "Segment must be free of '.'", () => CompositionOf("p", "a.b", 1));
        yield return Case("CompositionDocument.Version", "Version must be at least 0", () => CompositionOf("p", "n", -1));
        yield return Case("CompositionRef.Name empty", "Segment must be non-empty", () => new CompositionRef("p", "", 1));
        yield return Case("CompositionRef.Name dotted", "Segment must be free of '.'", () => new CompositionRef("p", "a.b", 1));
        yield return Case("CompositionRef.Version", "Version must be at least 0", () => new CompositionRef("p", "n", -1));
        yield return Case("AssetCatalog.CatalogId empty", "Segment must be non-empty", () => CatalogOf("p", ""));
        yield return Case("AssetCatalog.CatalogId dotted", "Segment must be free of '.'", () => CatalogOf("p", "a.b"));
        yield return Case("AssetCatalog.Version", "Version must be at least 0", () => new AssetCatalog("p", "c", -1, new List<AssetEntry>()));
        yield return Case("AssetEntry.Width", "Count must be at least 0", () => new AssetEntry("i", "m", "u", -1, 0));
        yield return Case("AssetEntry.Height", "Count must be at least 0", () => new AssetEntry("i", "m", "u", 0, int.MinValue));
        yield return Case("TextNode.MaxLines", "Count must be at least 0",
            () => new TextNode(Common("t"), LitText("x"), "body", true, -1, false));
        yield return Case("MemberIndex.Index", "Count must be at least 0", () => new MemberIndex(-1));
        yield return Case("NumberFormat.Precision", "Count must be at least 0", () => new NumberFormat(-1, false, null));
    }

    [TestCaseSource(nameof(OutOfDomain))]
    public void OutOfDomainConstructionIsRefusedNamingTheDomainAndBound(string message, Action build)
    {
        var error = Assert.Throws<ThingDomainException>(() => build())!;
        Assert.That(error.Message, Is.EqualTo(message));
    }

    [Test]
    public void BoundaryValuesAreInDomain()
    {
        Assert.DoesNotThrow(() => CommandResult.Pending(Inv(), 1, "m"));
        Assert.DoesNotThrow(() => CommandResult.Pending(Inv(), int.MaxValue, "m"));
        Assert.DoesNotThrow(() => new CompletedOutcome(0, false, null));
        Assert.DoesNotThrow(() => new CompletedOutcome(null, false, null));
        Assert.DoesNotThrow(() => new AssetEntry("i", "m", "u", 0, 0));
        Assert.DoesNotThrow(() => new TextNode(Common("t"), LitText("x"), "body", true, 0, false));
        Assert.DoesNotThrow(() => new TextNode(Common("t"), LitText("x"), "body", true, null, false));
        Assert.DoesNotThrow(() => new MemberIndex(0));
        Assert.DoesNotThrow(() => new CompositionRef("p", "n", 0));
        Assert.DoesNotThrow(() => SurfaceOf("p", "a-b_c"));
    }

    [Test]
    public void TheMessageNeverEchoesTheValue()
    {
        var dotted = Assert.Throws<ThingDomainException>(() => SurfaceOf("p", $"{Wire.Canary}.x"))!;
        Assert.That(dotted.Message, Is.EqualTo("Segment must be free of '.'"));
        Assert.That(dotted.ToString(), Does.Not.Contain(Wire.Canary));
        Assert.That((dotted.Domain, dotted.Bound), Is.EqualTo(("Segment", "free of '.'")));

        var seq = Assert.Throws<ThingDomainException>(() => CommandResult.Failed(Inv(), -77, "r"))!;
        Assert.That(seq.Message, Does.Not.Contain("77"));
        var version = Assert.Throws<ThingDomainException>(() => CompositionOf("p", "n", -77))!;
        Assert.That(version.Message, Does.Not.Contain("77"));
        var count = Assert.Throws<ThingDomainException>(() => new MemberIndex(-77))!;
        Assert.That(count.Message, Does.Not.Contain("77"));
    }

    // ---- the doors: every deserializer reaches the one constructor ----

    private static byte[] AssetEntryBytes(int width)
    {
        var buffer = new System.Buffers.ArrayBufferWriter<byte>();
        var writer = new MessagePackWriter(buffer);
        writer.WriteArrayHeader(5);
        writer.Write("gear");
        writer.Write("image/png");
        writer.Write(Wire.Canary);
        writer.Write(width);
        writer.Write(32);
        writer.Flush();
        return buffer.WrittenSpan.ToArray();
    }

    [Test]
    public void CultLibMessagePackRefusesThroughTheConstructor()
    {
        var error = Assert.Throws<MessagePackSerializationException>(
            () => MessagePackSerializer.Deserialize<AssetEntry>(AssetEntryBytes(-5), Wire.Options))!;
        Assert.That(Wire.Flatten(error), Does.Contain("Count must be at least 0"));
        Assert.That(Wire.Flatten(error), Does.Not.Contain(Wire.Canary));
        Assert.That(MessagePackSerializer.Deserialize<AssetEntry>(AssetEntryBytes(5), Wire.Options).Width, Is.EqualTo(5));
    }

    [Test]
    public void MessagePackStandardRefusesThroughTheConstructor()
    {
        var error = Assert.Throws<MessagePackSerializationException>(
            () => MessagePackSerializer.Deserialize<AssetEntry>(AssetEntryBytes(-5), MessagePackSerializerOptions.Standard))!;
        Assert.That(Wire.Flatten(error), Does.Contain("Count must be at least 0"));
        Assert.That(Wire.Flatten(error), Does.Not.Contain(Wire.Canary));
        Assert.That(MessagePackSerializer.Deserialize<AssetEntry>(AssetEntryBytes(5), MessagePackSerializerOptions.Standard).Width, Is.EqualTo(5));
    }

    [Test]
    public void SystemTextJsonRefusesThroughTheConstructor()
    {
        string Json(int width) => $"{{\"Id\":\"gear\",\"MediaType\":\"image/png\",\"Uri\":\"{Wire.Canary}\",\"Width\":{width},\"Height\":32}}";
        var error = Assert.Catch(() => JsonSerializer.Deserialize<AssetEntry>(Json(-5)))!;
        Assert.That(Wire.Flatten(error), Does.Contain("Count must be at least 0"));
        Assert.That(Wire.Flatten(error), Does.Not.Contain(Wire.Canary));
        Assert.That(JsonSerializer.Deserialize<AssetEntry>(Json(5))!.Width, Is.EqualTo(5));
    }

    [Test]
    public void ResultSeqZeroIsRefusedByEveryDoor()
    {
        var bytes = Wire.Golden("result-seq-zero.bin");

        var cult = Assert.Throws<MessagePackSerializationException>(() => Wire.Read(typeof(CommandResult), bytes))!;
        Assert.That(Wire.Flatten(cult), Does.Contain("Seq must be at least 1"));

        var standard = Assert.Throws<MessagePackSerializationException>(
            () => MessagePackSerializer.Deserialize<CommandResult>(bytes, MessagePackSerializerOptions.Standard))!;
        Assert.That(Wire.Flatten(standard), Does.Contain("Seq must be at least 1"));
        Assert.That(Wire.Flatten(standard), Does.Not.Contain(Wire.Canary));

        // System.Text.Json has no constructor it may call on a result: the type is refused outright.
        Assert.Throws<NotSupportedException>(
            () => JsonSerializer.Deserialize<CommandResult>("{\"InvocationId\":\"inv-1\",\"Seq\":1,\"Outcome\":null}"));
    }

    [Test]
    public void ResultsAtSeqOneDecodeThroughTheStandardDoorToo()
    {
        var bytes = Wire.Golden("result-pending.bin");
        var standard = MessagePackSerializer.Deserialize<CommandResult>(bytes, MessagePackSerializerOptions.Standard);
        Assert.That(standard.Seq, Is.EqualTo(1));
        Assert.That(standard.Outcome, Is.TypeOf<PendingOutcome>());
    }
}
