using System.Reflection;
using MessagePack;

namespace GameCult.Thing.Contract.Tests;

/// <summary>
/// A unit arm is its arm type: there is one way to build it (<c>new ImageFitFill()</c>) and one way to tell it (a type
/// test). No union base exposes a static instance, so no code can compare by reference and see a decoded arm differ.
/// </summary>
public sealed class UnitArmTests
{
    private static IEnumerable<Type> Unions() =>
        typeof(CommandResult).Assembly.GetExportedTypes().Where(t => t.IsAbstract && t.GetCustomAttributes<UnionAttribute>(false).Any());

    private static IEnumerable<(Type Union, UnionAttribute Arm)> UnitArms() =>
        Unions().SelectMany(u => u.GetCustomAttributes<UnionAttribute>(false).Select(a => (u, a)))
            .Where(x => x.a.SubType.GetConstructor(Type.EmptyTypes) != null);

    [Test]
    public void EveryDecodedUnitArmIsItsArmType()
    {
        var arms = UnitArms().ToList();
        Assert.That(arms, Has.Count.EqualTo(58));
        foreach (var (union, arm) in arms)
        {
            var bytes = new byte[] { 0x92, (byte)arm.Key, 0x90 };
            var read = MessagePackSerializer.Deserialize(union, bytes, Wire.Options);
            Assert.That(read, Is.TypeOf(arm.SubType), $"{union.Name} key {arm.Key}");
            Assert.That(MessagePackSerializer.Serialize(union, read, Wire.Options), Is.EqualTo(bytes), $"{union.Name} key {arm.Key}");
        }
    }

    [Test]
    public void NoUnionBaseExposesAStaticMemberOfItsOwnKind()
    {
        var offenders = new List<string>();
        var unions = Unions().ToList();
        Assert.That(unions, Has.Count.GreaterThan(25));
        foreach (var union in unions)
        {
            foreach (var member in union.GetMembers(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly))
            {
                var type = member switch
                {
                    PropertyInfo p => p.PropertyType,
                    FieldInfo f => f.FieldType,
                    MethodInfo m => m.ReturnType,
                    _ => null,
                };
                if (type != null && type.IsAssignableTo(union)) offenders.Add($"{union.Name}.{member.Name}");
            }
        }

        Assert.That(offenders, Is.Empty);
    }

    [Test]
    public void ConstructingAUnitArmWritesAnEmptySlotArray()
    {
        // [key, []]: array(2), the key, array(0).
        Assert.That(MessagePackSerializer.Serialize<ImageFit>(new ImageFitFill(), Wire.Options), Is.EqualTo(new byte[] { 0x92, 0x02, 0x90 }));
        Assert.That(MessagePackSerializer.Serialize<InputKind>(new InputKindNumber(), Wire.Options), Is.EqualTo(new byte[] { 0x92, 0x01, 0x90 }));
    }
}
