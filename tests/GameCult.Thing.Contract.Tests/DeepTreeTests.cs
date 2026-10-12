using MessagePack;
using static GameCult.Thing.Contract.Tests.Builders;

namespace GameCult.Thing.Contract.Tests;

/// <summary>
/// CultLib bounds payload nesting at 256 MessagePack containers (the document array is 1). A Box chain costs 3 containers per
/// level (union array, slots array, children list), and the deepest leaf's style adds 4 beyond its slots, so a chain of
/// 84 boxes nests 3 * 84 + 4 = 256 deep and 85 nests 259. Decoding recurses per level, so the default test thread carries
/// the deepest chain the bound admits: this package sets no thread size.
/// </summary>
public sealed class DeepTreeTests
{
    private const int DeepestAdmitted = 84;

    private static SurfaceDocument Chain(int levels)
    {
        var node = Boxed("leaf");
        for (var level = levels - 1; level >= 1; level--) node = Boxed($"deep-{level}", node);
        return new SurfaceDocument("provider.a", "deep", 1, "deep", node, new List<CommandDecl>());
    }

    [Test]
    public void TheDeepestChainTheBoundAdmitsRoundTripsOnTheTestThread()
    {
        var chain = Chain(DeepestAdmitted);
        var bytes = Wire.Write(chain);
        var decoded = (SurfaceDocument)Wire.Read(typeof(SurfaceDocument), bytes);
        Assert.That(Convert.ToHexString(Wire.Write(decoded)), Is.EqualTo(Convert.ToHexString(bytes)));

        var depth = 0;
        for (var node = decoded.Root; node is BoxNode box; node = box.Children.SingleOrDefault()!) depth++;
        Assert.That(depth, Is.EqualTo(DeepestAdmitted));
    }

    [Test]
    public void OneLevelDeeperIsRefusedByTheBoundOnReadAndOnWrite()
    {
        var chain = Chain(DeepestAdmitted + 1);

        var write = Assert.Throws<MessagePackSerializationException>(() => Wire.Write(chain))!;
        Assert.That(write.Message, Does.Contain("payload nests 257").And.Contain("the limit is 256"));

        // The bytes a hostile sender could produce, past the writer's own check.
        var bytes = MessagePackSerializer.Serialize(typeof(SurfaceDocument), chain, Wire.Options);
        var read = Assert.Throws<MessagePackSerializationException>(() => Wire.Read(typeof(SurfaceDocument), bytes))!;
        Assert.That(read.Message, Does.Contain("payload nests 257").And.Contain("the limit is 256"));
    }

    [Test]
    public void AThousandNodesWideRoundTrips()
    {
        var children = Enumerable.Range(0, 998).Select(index => Text($"t{index}", "x")).ToList();
        children.Add(Boxed("tail"));
        var wide = new SurfaceDocument("provider.a", "wide", 1, "wide", Boxed("root", children.ToArray()), new List<CommandDecl>());
        var bytes = Wire.Write(wide);
        var decoded = (SurfaceDocument)Wire.Read(typeof(SurfaceDocument), bytes);
        Assert.That(((BoxNode)decoded.Root).Children, Has.Count.EqualTo(999));
        Assert.That(Convert.ToHexString(Wire.Write(decoded)), Is.EqualTo(Convert.ToHexString(bytes)));
    }
}
