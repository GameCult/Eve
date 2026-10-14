using System.Collections;
using System.Reflection;

namespace GameCult.Thing.Contract.Tests;

/// <summary>
/// A list a consumer can mutate after construction escapes every constructor check, and is how a cycle reaches the
/// writer (cultlib-gaps:follow_up:cs-write-depth-before-serialize owns the writer's side). The package holds each list
/// as a read-only copy of what was passed.
/// </summary>
public sealed class ReadOnlyListTests
{
    private static bool IsMutableCollection(Type type) =>
        type != typeof(byte[]) // an opaque payload, not a tree
        && (typeof(IList).IsAssignableFrom(type) || type.GetInterfaces().Concat(new[] { type }).Any(i =>
            i.IsGenericType && (i.GetGenericTypeDefinition() == typeof(ICollection<>) || i.GetGenericTypeDefinition() == typeof(IDictionary<,>))));

    private static IEnumerable<(Doors.Door Door, int Index, Type Element)> ListParameters() =>
        from door in Doors.All()
        from parameter in door.Parameters.Select((p, i) => (p, i))
        where parameter.p.ParameterType.IsGenericType && parameter.p.ParameterType.GetGenericTypeDefinition() == typeof(IReadOnlyList<>)
        select (door, parameter.i, parameter.p.ParameterType.GetGenericArguments()[0]);

    [Test]
    public void NoPublicPropertyOfAnyContractTypeIsAMutableCollection()
    {
        var offenders = new List<string>();
        var checkedProperties = 0;
        foreach (var type in typeof(CommandResult).Assembly.GetExportedTypes())
        foreach (var property in type.GetProperties(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static))
        {
            checkedProperties++;
            if (IsMutableCollection(property.PropertyType)) offenders.Add($"{type.Name}.{property.Name}: {property.PropertyType.Name}");
        }

        Assert.That(offenders, Is.Empty);
        Assert.That(checkedProperties, Is.GreaterThan(200));
    }

    [Test]
    public void EveryListParameterIsCopiedAndTheCopyCannotGrow()
    {
        var lists = ListParameters().ToList();
        Assert.That(lists, Has.Count.GreaterThanOrEqualTo(14), "the scan reached every list slot");
        foreach (var (door, index, element) in lists)
        {
            var args = door.ValidArgs();
            var passed = Doors.MakeList(element, 1);
            args[index] = passed;
            var value = door.Call(args)!;
            var name = door.Parameters[index].Name!.TrimStart('@');
            var property = value.GetType().GetProperty(char.ToUpperInvariant(name[0]) + name[1..])!;
            var held = (IList)property.GetValue(value)!;
            Assert.That(held, Has.Count.EqualTo(1), door.Name);

            passed.Add(Doors.Make(element));
            Assert.That(held, Has.Count.EqualTo(1), $"{door.Name}: adding to the passed list changed the value");
            Assert.That(held, Is.Not.SameAs(passed), door.Name);
            Assert.Throws<NotSupportedException>(() => held.Add(Doors.Make(element)), $"{door.Name}: the held list grew");
            Assert.Throws<NotSupportedException>(() => held[0] = Doors.Make(element), $"{door.Name}: the held list was written");
        }
    }

    [Test]
    public void EveryListParameterRefusesANilItemAndANilList()
    {
        foreach (var (door, index, element) in ListParameters())
        {
            var args = door.ValidArgs();
            var withNil = Doors.MakeList(element, 1);
            withNil.Add(null);
            args[index] = withNil;
            var item = Assert.Throws<ThingDomainException>(() => door.Call(args), $"{door.Name}: nil item")!;
            Assert.That(item.Bound, Is.EqualTo("free of nil items"), door.Name);

            args[index] = null;
            var list = Assert.Throws<ThingDomainException>(() => door.Call(args), $"{door.Name}: nil list")!;
            Assert.That(list.Bound, Is.EqualTo("present"), door.Name);
        }
    }
}
