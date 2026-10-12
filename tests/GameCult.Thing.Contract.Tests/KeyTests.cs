using static GameCult.Thing.Contract.Tests.Builders;

namespace GameCult.Thing.Contract.Tests;

public sealed class KeyTests
{
    [Test]
    public void KeysAreBuiltFromTheFields()
    {
        var invocation = InvocationNamed("an-invocation-no-constructor-can-guess");
        Assert.That(invocation.RecordKey, Is.EqualTo("thing:invocation:an-invocation-no-constructor-can-guess"));
        Assert.That(CommandResult.Failed(invocation, 3, "r").RecordKey, Is.EqualTo("thing:result:an-invocation-no-constructor-can-guess.3"));
        Assert.That(SurfaceOf("p", "main").RecordKey, Is.EqualTo("thing:surface:p.main"));
        Assert.That(CompositionOf("pub", "card", 2).RecordKey, Is.EqualTo("thing:composition:pub.card.v2"));
        Assert.That(CatalogOf("p", "icons").RecordKey, Is.EqualTo("thing:asset_catalog:p.icons"));
    }

    [Test]
    public void KeysAreInjective()
    {
        Assert.That(SurfaceOf("a.b", "c").RecordKey, Is.EqualTo("thing:surface:a.b.c"));
        Assert.Throws<ThingDomainException>(() => SurfaceOf("a", "b.c"));
        Assert.That(SurfaceOf("a", "c").RecordKey, Is.Not.EqualTo(SurfaceOf("a.b", "c").RecordKey));
        Assert.That(SurfaceOf("a.b", "c").RecordKey, Is.Not.EqualTo(SurfaceOf("a", "bc").RecordKey));

        Assert.That(CompositionOf("a.b", "c", 1).RecordKey, Is.EqualTo("thing:composition:a.b.c.v1"));
        Assert.That(CompositionOf("a.b", "c", 1).RecordKey, Is.Not.EqualTo(CompositionOf("a", "bc", 1).RecordKey));
        Assert.That(CompositionOf("a", "c", 1).RecordKey, Is.Not.EqualTo(CompositionOf("a", "c", 11).RecordKey));
        Assert.That(CompositionOf("a", "c", 1).RecordKey, Is.Not.EqualTo(CompositionOf("a", "c", 0).RecordKey));

        Assert.That(CatalogOf("a.b", "c").RecordKey, Is.EqualTo("thing:asset_catalog:a.b.c"));
        Assert.That(CatalogOf("a.b", "c").RecordKey, Is.Not.EqualTo(CatalogOf("a", "bc").RecordKey));

        var first = CommandResult.Failed(InvocationNamed("x.1"), 2, "r").RecordKey;
        var second = CommandResult.Failed(InvocationNamed("x"), 12, "r").RecordKey;
        Assert.That(first, Is.EqualTo("thing:result:x.1.2"));
        Assert.That(second, Is.EqualTo("thing:result:x.12"));
        Assert.That(first, Is.Not.EqualTo(second));
    }

    [TestCase("")]
    [TestCase(".")]
    [TestCase("a.b")]
    public void EveryKeyBuilderRefusesABadSegment(string segment)
    {
        void Names(TestDelegate act)
        {
            var error = Assert.Throws<ThingDomainException>(act)!;
            Assert.That(error.Message, Does.StartWith("Segment must be"));
        }

        Names(() => ThingKeys.SurfaceKey("p", segment));
        Names(() => ThingKeys.CompositionKey("p", segment, 1));
        Names(() => ThingKeys.AssetCatalogKey("p", segment));
        Names(() => SurfaceOf("p", segment));
        Names(() => CompositionOf("p", segment, 1));
        Names(() => CatalogOf("p", segment));
    }

    [Test]
    public void KeyBuildersRefuseOutOfDomainNumbers()
    {
        Assert.Throws<ThingDomainException>(() => ThingKeys.CompositionKey("p", "n", -1));
        Assert.Throws<ThingDomainException>(() => ThingKeys.ResultKey("i", 0));
    }
}
