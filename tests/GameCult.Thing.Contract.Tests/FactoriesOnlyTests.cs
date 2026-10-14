using System.Reflection;
using System.Runtime.CompilerServices;
using MessagePack;
using static GameCult.Thing.Contract.Tests.Builders;

namespace GameCult.Thing.Contract.Tests;

/// <summary>
/// The package is attacked as an outside consumer would: through its public surface only. A public or init setter would
/// admit an object initializer or a with-expression; a record would admit both; a public union constructor would admit a
/// subtype nobody declared; a public CommandResult constructor would admit a result no factory built.
/// </summary>
public sealed class FactoriesOnlyTests
{
    private static readonly Assembly Package = typeof(CommandResult).Assembly;

    private static IEnumerable<Type> PublicTypes() => Package.GetExportedTypes();

    [Test]
    public void TheCommandResultHasNoPublicConstructor()
    {
        Assert.That(typeof(CommandResult).GetConstructors(BindingFlags.Public | BindingFlags.Instance), Is.Empty);
        Assert.That(typeof(CommandResult).GetConstructors(BindingFlags.NonPublic | BindingFlags.Instance), Has.Length.EqualTo(1));
    }

    [Test]
    public void NoContractTypeHasAPublicOrInitSetterAField_OrIsARecord()
    {
        var offenders = new List<string>();
        foreach (var type in PublicTypes())
        {
            foreach (var property in type.GetProperties(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            {
                var setter = property.SetMethod;
                if (setter == null) continue;
                var init = setter.ReturnParameter.GetRequiredCustomModifiers().Contains(typeof(IsExternalInit));
                if (setter.IsPublic || init || setter.IsAssembly || setter.IsFamily) offenders.Add($"{type.Name}.{property.Name} setter{(init ? " (init)" : "")}");
            }

            foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
                offenders.Add($"{type.Name}.{field.Name} public field");

            if (type.GetMethod("<Clone>$", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance) != null)
                offenders.Add($"{type.Name} is a record (<Clone>$)");
        }

        Assert.That(offenders, Is.Empty);
        Assert.That(PublicTypes().Count(), Is.GreaterThan(100), "the scan reached the package's types");
    }

    [Test]
    public void EveryUnionBaseConstructorIsNonPublic()
    {
        var unions = PublicTypes().Where(t => t.IsAbstract && t.GetCustomAttributes<UnionAttribute>(false).Any()).ToList();
        Assert.That(unions, Has.Count.GreaterThan(25));
        foreach (var union in unions)
        {
            Assert.That(union.GetConstructors(BindingFlags.Public | BindingFlags.Instance), Is.Empty, union.Name);
            Assert.That(union.GetConstructors(BindingFlags.NonPublic | BindingFlags.Instance), Is.Not.Empty, union.Name);
        }
    }

    [Test]
    public void EveryUnionArmIsSealedAndDeclared()
    {
        // The arms are the union attributes' types, each sealed and deriving the union directly: no outside subtype exists.
        var unions = PublicTypes().Where(t => t.IsAbstract && t.GetCustomAttributes<UnionAttribute>(false).Any());
        foreach (var union in unions)
        {
            var arms = union.GetCustomAttributes<UnionAttribute>(false).ToList();
            Assert.That(arms.Select(a => a.Key), Is.Unique, union.Name);
            foreach (var arm in arms)
            {
                Assert.That(arm.SubType.IsSealed, Is.True, $"{union.Name}.{arm.SubType.Name}");
                Assert.That(arm.SubType.BaseType, Is.EqualTo(union), $"{union.Name}.{arm.SubType.Name}");
            }

            var derived = Package.GetTypes().Where(t => t.BaseType == union).ToList();
            Assert.That(derived, Is.EquivalentTo(arms.Select(a => a.SubType)), $"{union.Name}: every subtype is a declared arm");
        }
    }

    [Test]
    public void EveryDocumentCarriesTheCratesSchemaNameAndVersion()
    {
        var expected = new Dictionary<Type, (string, string)>
        {
            [typeof(SurfaceDocument)] = ("gamecult.thing.surface", "gamecult.thing.surface.v1"),
            [typeof(CompositionDocument)] = ("gamecult.thing.composition", "gamecult.thing.composition.v1"),
            [typeof(CommandInvocation)] = ("gamecult.thing.command_invocation", "gamecult.thing.command_invocation.v1"),
            [typeof(CommandResult)] = ("gamecult.thing.command_result", "gamecult.thing.command_result.v1"),
            [typeof(AssetCatalog)] = ("gamecult.thing.asset_catalog", "gamecult.thing.asset_catalog.v1"),
        };
        foreach (var (type, (name, version)) in expected)
        {
            var attribute = type.GetCustomAttribute<GameCult.Caching.CultDocumentAttribute>()!;
            Assert.That((attribute.SchemaName, attribute.SchemaVersion), Is.EqualTo((name, version)), type.Name);
        }

        var documents = PublicTypes().Where(t => t.GetCustomAttribute<GameCult.Caching.CultDocumentAttribute>() != null).ToList();
        Assert.That(documents, Is.EquivalentTo(expected.Keys));
    }

    [Test]
    public void TheFactoriesCopyTheInvocationIdAndHoldSeq()
    {
        var invocation = InvocationNamed("an-invocation-no-constructor-can-guess");
        var built = new[]
        {
            CommandResult.Pending(invocation, 1, "m"),
            CommandResult.Completed(invocation, 2, null, false, null),
            CommandResult.Denied(invocation, 3, "r", null),
            CommandResult.Failed(invocation, 4, "r"),
        };
        for (var index = 0; index < built.Length; index++)
        {
            Assert.That(built[index].InvocationId, Is.EqualTo("an-invocation-no-constructor-can-guess"));
            Assert.That(built[index].Seq, Is.EqualTo(index + 1));
        }

        Assert.That(built[0].Outcome, Is.TypeOf<PendingOutcome>());
        Assert.That(((PendingOutcome)built[0].Outcome).Message, Is.EqualTo("m"));
        Assert.That(built[1].Outcome, Is.TypeOf<CompletedOutcome>());
        Assert.That(built[2].Outcome, Is.TypeOf<DeniedOutcome>());
        Assert.That(built[3].Outcome, Is.TypeOf<FailedOutcome>());
    }

    [Test]
    public void TheFactoriesFillEveryOutcomeSlot()
    {
        var invocation = InvocationNamed("i");
        var effect = new OpenSurfaceEffect("k");
        var completed = (CompletedOutcome)CommandResult.Completed(invocation, 1, 5, true, effect).Outcome;
        Assert.That((completed.SourceVersion, completed.ClearDrafts, completed.Effect), Is.EqualTo(((long?)5, true, (Effect?)effect)));
        var bare = (CompletedOutcome)CommandResult.Completed(invocation, 1, null, false, null).Outcome;
        Assert.That((bare.SourceVersion, bare.ClearDrafts, bare.Effect), Is.EqualTo(((long?)null, false, (Effect?)null)));
        var denied = (DeniedOutcome)CommandResult.Denied(invocation, 1, "no", "go").Outcome;
        Assert.That((denied.Reason, denied.Node), Is.EqualTo(("no", (string?)"go")));
        var failed = (FailedOutcome)CommandResult.Failed(invocation, 1, "broke").Outcome;
        Assert.That(failed.Reason, Is.EqualTo("broke"));
    }
}
