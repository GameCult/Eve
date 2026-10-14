using MessagePack;
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
        (typeof(IList).IsAssignableFrom(type) || type.GetInterfaces().Concat(new[] { type }).Any(i =>
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

    [Test]
    public void AnArrayPassedToAConstructorIsCopiedNotKept()
    {
        var child = Builders.Text("t", "x");
        var other = Builders.Text("u", "y");
        var array = new[] { child };
        var box = (BoxNode)Builders.Boxed("b", array);
        array[0] = other;
        Assert.That(box.Children[0], Is.SameAs(child), "writing the caller's array changed the value");
        Assert.That(box.Children, Is.Not.SameAs(array));
        Assert.That(box.Children is Node[], Is.False, "the held list is the caller's array type");
        var boxed = (BoxNode)Builders.Boxed("c", child, other);
        Assert.That(boxed.Children, Has.Count.EqualTo(2));

        foreach (var (door, index, element) in ListParameters())
        {
            var args = door.ValidArgs();
            var passed = Array.CreateInstance(element, 1);
            passed.SetValue(Doors.Make(element), 0);
            args[index] = passed;
            var value = door.Call(args)!;
            var name = door.Parameters[index].Name!.TrimStart('@');
            var held = (IList)value.GetType().GetProperty(char.ToUpperInvariant(name[0]) + name[1..])!.GetValue(value)!;
            var first = held[0];
            passed.SetValue(Doors.Make(element), 0);
            Assert.That(held[0], Is.SameAs(first), $"{door.Name}: writing the caller's array changed the value");
            Assert.That(held, Is.Not.SameAs(passed), door.Name);
        }
    }

    private static void WalkLists(object? value, int depth, Action<object> onList)
    {
        if (value is null || depth > 200 || value is string || value.GetType().IsPrimitive || value is ReadOnlyMemory<byte>) return;
        if (value is IList list)
        {
            onList(list);
            foreach (var item in list) WalkLists(item, depth + 1, onList);
            return;
        }

        if (value.GetType().Namespace != "GameCult.Thing.Contract") return;
        foreach (var property in value.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
            WalkLists(property.GetValue(value), depth + 1, onList);
    }

    private static readonly (string Golden, Type Type)[] DecodedGoldens =
    {
        ("surface-all-arms", typeof(SurfaceDocument)), ("composition-all-params", typeof(CompositionDocument)),
        ("invocation-all-inputs", typeof(CommandInvocation)), ("asset-catalog", typeof(AssetCatalog)),
        ("result-pending", typeof(CommandResult)), ("result-completed", typeof(CommandResult)),
        ("result-completed-open-surface", typeof(CommandResult)), ("result-completed-open-external", typeof(CommandResult)),
        ("result-denied", typeof(CommandResult)), ("result-denied-no-node", typeof(CommandResult)), ("result-failed", typeof(CommandResult)),
    };

    [Test]
    public void NoListOfADecodedGoldenIsWritable()
    {
        var lists = 0;
        foreach (var (golden, type) in DecodedGoldens)
            WalkLists(Wire.Read(type, Wire.Golden($"{golden}.bin")), 0, list =>
            {
                lists++;
                var l = (IList)list;
                Assert.That(l.IsReadOnly && l.IsFixedSize, Is.True, $"{golden}: {l.GetType().Name} is writable");
                Assert.That(l is Array, Is.False, $"{golden}: {l.GetType().Name} is an array");
                Assert.Throws<NotSupportedException>(() => l.Add(null), golden);
                if (l.Count > 0) Assert.Throws<NotSupportedException>(() => l[0] = l[0], golden);
            });
        Assert.That(lists, Is.GreaterThan(20));
    }

    [Test]
    public void APayloadHoldsACopyOfTheBytesItWasBuiltFrom()
    {
        var buffer = new byte[] { 1, 2, 3 };
        var payload = new RecordPayload("s", buffer);
        buffer[0] = 9;
        Assert.That(payload.Bytes.ToArray(), Is.EqualTo(new byte[] { 1, 2, 3 }), "writing the caller's buffer changed the payload");

        var shared = new byte[] { 4, 5, 6, 7 };
        var slice = new RecordPayload("s", new ReadOnlyMemory<byte>(shared, 1, 2));
        shared[1] = 0;
        Assert.That(slice.Bytes.ToArray(), Is.EqualTo(new byte[] { 5, 6 }));
        Assert.That(System.Runtime.InteropServices.MemoryMarshal.TryGetArray(payload.Bytes, out var segment) && ReferenceEquals(segment.Array, buffer), Is.False);
    }

    [Test]
    public void EveryEmptyMemoryIsAnEmptyPayloadThatWritesAsRustsEmptyVec()
    {
        // Rust's empty Vec<u8> is bin8 of length 0 (c4 00); a RecordPayload is [schema, bytes].
        var rust = new byte[] { 0x92, 0xA1, (byte)'s', 0xC4, 0x00 };
        var empties = new Dictionary<string, ReadOnlyMemory<byte>>
        {
            ["ReadOnlyMemory.Empty"] = ReadOnlyMemory<byte>.Empty,
            ["Memory.Empty"] = Memory<byte>.Empty,
            ["default"] = default(ReadOnlyMemory<byte>),
            ["Array.Empty"] = Array.Empty<byte>(),
            ["new byte[0]"] = new byte[0],
        };
        foreach (var (name, memory) in empties)
        {
            var payload = new RecordPayload("s", memory);
            Assert.That(payload.Bytes.Length, Is.EqualTo(0), name);
            Assert.That(MessagePackSerializer.Serialize(payload, Wire.Options), Is.EqualTo(rust), name);
            Assert.That(MessagePackSerializer.Serialize(MessagePackSerializer.Deserialize<RecordPayload>(rust, Wire.Options), Wire.Options), Is.EqualTo(rust), name);
        }
    }

    [Test]
    public void ANilPayloadOnTheWireIsRefusedAndAnEmptyOneIsKeptThroughTheWire()
    {
        Assert.Throws<MessagePackSerializationException>(() => MessagePackSerializer.Deserialize<RecordPayload>(new byte[] { 0x92, 0xA1, (byte)'s', 0xC0 }, Wire.Options));

        var empty = new CommandInvocation("i", "k", 1, "go", new RecordPayload("s", Array.Empty<byte>()), new List<CapturedInput>(), "c", "t", null);
        var decoded = (CommandInvocation)Wire.Read(typeof(CommandInvocation), Wire.Write(empty));
        Assert.That(decoded.Payload.Bytes.IsEmpty, Is.True);
        Assert.That(Wire.Write(decoded), Is.EqualTo(Wire.Write(empty)));
    }
}
