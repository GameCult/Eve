using System.Reflection;
using MessagePack;

namespace GameCult.Thing.Contract.Tests;

/// <summary>One name in every runtime: Rust input_kind, C# InputKind, TypeScript inputKind. The wire is the slot key, 2.</summary>
public sealed class InputKindNameTests
{
    [Test]
    public void TextInputNodeSlotTwoIsInputKindAndThereIsNoKind()
    {
        var properties = typeof(TextInputNode).GetProperties(BindingFlags.Public | BindingFlags.Instance);
        var slotTwo = properties.Single(p => p.GetCustomAttribute<KeyAttribute>()?.IntKey == 2);
        Assert.That((slotTwo.Name, slotTwo.PropertyType), Is.EqualTo(("InputKind", typeof(InputKind))));
        Assert.That(properties.Select(p => p.Name), Does.Not.Contain("Kind"));
        Assert.That(typeof(TextInputNode).GetConstructors().Single().GetParameters()[2].Name, Is.EqualTo("inputKind"));
    }
}
