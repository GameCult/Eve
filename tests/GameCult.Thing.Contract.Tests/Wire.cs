using GameCult.Caching;
using GameCult.Caching.MessagePack;
using MessagePack;

namespace GameCult.Thing.Contract.Tests;

/// <summary>The one way the tests reach the wire: CultLib's document serialization and the committed Rust goldens.</summary>
internal static class Wire
{
    public const string Canary = "CANARY-7f3a91c2";

    public static readonly Type[] DocumentTypes =
    {
        typeof(SurfaceDocument), typeof(CompositionDocument), typeof(CommandInvocation), typeof(CommandResult), typeof(AssetCatalog),
    };

    public static readonly CultDocumentRegistry Registry = CultDocumentRegistry.ForTypes(DocumentTypes);

    public static MessagePackSerializerOptions Options => CultDocumentMessagePackSerialization.OptionsFor(typeof(CommandResult).Assembly);

    public static byte[] Write(object value) => CultDocumentMessagePackSerialization.SerializeUntyped(value, value.GetType(), Registry);

    public static object Read(Type type, byte[] bytes) => CultDocumentMessagePackSerialization.DeserializeUntyped(type, bytes, Registry);

    public static string GoldenPath(string file) => Path.Combine(AppContext.BaseDirectory, "goldens", file);

    public static byte[] Golden(string file)
    {
        var bytes = File.ReadAllBytes(GoldenPath(file));
        Assert.That(bytes, Is.Not.Empty, file);
        return bytes;
    }

    public static string Flatten(Exception error)
    {
        var parts = new List<string>();
        for (Exception? e = error; e != null; e = e.InnerException) parts.Add($"{e.GetType().Name}: {e.Message}");
        return string.Join(" | ", parts);
    }
}
