using System.Collections.Generic;
using GameCult.Caching;
using MessagePack;

namespace GameCult.Thing.Contract;

[Union(0, typeof(TextLiteral))]
[Union(1, typeof(TextSourceBound))]
[Union(2, typeof(TextSourceParam))]
public abstract class TextSource
{
    internal TextSource() { }
}

[MessagePackObject]
public sealed class TextLiteral : TextSource
{
    [Key(0)] public string Value { get; }

    public TextLiteral(string value)
    {
        Value = ThingDomain.Present(value, "Value");
    }
}

[MessagePackObject]
public sealed class TextSourceBound : TextSource
{
    [Key(0)] public StateSource Source { get; }
    [Key(1)] public MemberPath Member { get; }
    [Key(2)] public Format? Format { get; }

    public TextSourceBound(StateSource source, MemberPath member, Format? format)
    {
        Source = ThingDomain.Present(source, "Source");
        Member = ThingDomain.Present(member, "Member");
        Format = format;
    }
}

[MessagePackObject]
public sealed class TextSourceParam : TextSource
{
    [Key(0)] public string Name { get; }

    public TextSourceParam(string name)
    {
        Name = ThingDomain.Present(name, "Name");
    }
}

[Union(0, typeof(NumberLiteral))]
[Union(1, typeof(NumberSourceBound))]
[Union(2, typeof(NumberSourceParam))]
public abstract class NumberSource
{
    internal NumberSource() { }
}

[MessagePackObject]
public sealed class NumberLiteral : NumberSource
{
    [Key(0)] public double Value { get; }

    public NumberLiteral(double value)
    {
        Value = value;
    }
}

[MessagePackObject]
public sealed class NumberSourceBound : NumberSource
{
    [Key(0)] public StateSource Source { get; }
    [Key(1)] public MemberPath Member { get; }
    [Key(2)] public Format? Format { get; }

    public NumberSourceBound(StateSource source, MemberPath member, Format? format)
    {
        Source = ThingDomain.Present(source, "Source");
        Member = ThingDomain.Present(member, "Member");
        Format = format;
    }
}

[MessagePackObject]
public sealed class NumberSourceParam : NumberSource
{
    [Key(0)] public string Name { get; }

    public NumberSourceParam(string name)
    {
        Name = ThingDomain.Present(name, "Name");
    }
}

[Union(0, typeof(BoolLiteral))]
[Union(1, typeof(BoolSourceBound))]
[Union(2, typeof(BoolSourceParam))]
public abstract class BoolSource
{
    internal BoolSource() { }
}

[MessagePackObject]
public sealed class BoolLiteral : BoolSource
{
    [Key(0)] public bool Value { get; }

    public BoolLiteral(bool value)
    {
        Value = value;
    }
}

[MessagePackObject]
public sealed class BoolSourceBound : BoolSource
{
    [Key(0)] public StateSource Source { get; }
    [Key(1)] public MemberPath Member { get; }
    [Key(2)] public Format? Format { get; }

    public BoolSourceBound(StateSource source, MemberPath member, Format? format)
    {
        Source = ThingDomain.Present(source, "Source");
        Member = ThingDomain.Present(member, "Member");
        Format = format;
    }
}

[MessagePackObject]
public sealed class BoolSourceParam : BoolSource
{
    [Key(0)] public string Name { get; }

    public BoolSourceParam(string name)
    {
        Name = ThingDomain.Present(name, "Name");
    }
}

[Union(0, typeof(StateRef))]
[Union(1, typeof(StateSourceItem))]
public abstract class StateSource
{
    internal StateSource() { }
}

[MessagePackObject]
public sealed class StateRef : StateSource
{
    [Key(0)] public string? Provider { get; }
    [Key(1)] public string Schema { get; }
    [Key(2)] public string Key { get; }

    public StateRef(string? provider, string schema, string key)
    {
        Provider = provider;
        Schema = ThingDomain.Present(schema, "Schema");
        Key = ThingDomain.Present(key, "Key");
    }
}

[MessagePackObject]
public sealed class StateSourceItem : StateSource
{
    public StateSourceItem() { }
}

[Union(0, typeof(MemberName))]
[Union(1, typeof(MemberIndex))]
public abstract class MemberStep
{
    internal MemberStep() { }
}

[MessagePackObject]
public sealed class MemberName : MemberStep
{
    [Key(0)] public string Name { get; }

    public MemberName(string name)
    {
        Name = ThingDomain.Present(name, "Name");
    }
}

[MessagePackObject]
public sealed class MemberIndex : MemberStep
{
    [Key(0)] public int Index { get; }

    public MemberIndex(int index)
    {
        Index = ThingDomain.Count(index);
    }
}

[Union(0, typeof(NumberFormat))]
[Union(1, typeof(FormatDuration))]
[Union(2, typeof(FormatTimestamp))]
[Union(3, typeof(AffixFormat))]
public abstract class Format
{
    internal Format() { }
}

[MessagePackObject]
public sealed class NumberFormat : Format
{
    [Key(0)] public int Precision { get; }
    [Key(1)] public bool Percent { get; }
    [Key(2)] public string? Unit { get; }

    public NumberFormat(int precision, bool percent, string? unit)
    {
        Precision = ThingDomain.Count(precision);
        Percent = percent;
        Unit = unit;
    }
}

[MessagePackObject]
public sealed class FormatDuration : Format
{
    public FormatDuration() { }
}

[MessagePackObject]
public sealed class FormatTimestamp : Format
{
    public FormatTimestamp() { }
}

[MessagePackObject]
public sealed class AffixFormat : Format
{
    [Key(0)] public string Prefix { get; }
    [Key(1)] public string Suffix { get; }

    public AffixFormat(string prefix, string suffix)
    {
        Prefix = ThingDomain.Present(prefix, "Prefix");
        Suffix = ThingDomain.Present(suffix, "Suffix");
    }
}

[Union(0, typeof(RecordsSource))]
[Union(1, typeof(CollectionSourceMember))]
[Union(2, typeof(CollectionSourceParam))]
public abstract class CollectionSource
{
    internal CollectionSource() { }
}

[MessagePackObject]
public sealed class RecordsSource : CollectionSource
{
    [Key(0)] public string? Provider { get; }
    [Key(1)] public string Schema { get; }
    [Key(2)] public string KeyPrefix { get; }

    public RecordsSource(string? provider, string schema, string keyPrefix)
    {
        Provider = provider;
        Schema = ThingDomain.Present(schema, "Schema");
        KeyPrefix = ThingDomain.Present(keyPrefix, "KeyPrefix");
    }
}

[MessagePackObject]
public sealed class CollectionSourceMember : CollectionSource
{
    [Key(0)] public StateSource Source { get; }
    [Key(1)] public MemberPath Member { get; }
    [Key(2)] public Format? Format { get; }

    public CollectionSourceMember(StateSource source, MemberPath member, Format? format)
    {
        Source = ThingDomain.Present(source, "Source");
        Member = ThingDomain.Present(member, "Member");
        Format = format;
    }
}

[MessagePackObject]
public sealed class CollectionSourceParam : CollectionSource
{
    [Key(0)] public string Name { get; }

    public CollectionSourceParam(string name)
    {
        Name = ThingDomain.Present(name, "Name");
    }
}

[MessagePackObject]
public sealed class Bind
{
    [Key(0)] public StateSource Source { get; }
    [Key(1)] public MemberPath Member { get; }
    [Key(2)] public Format? Format { get; }

    public Bind(StateSource source, MemberPath member, Format? format)
    {
        Source = ThingDomain.Present(source, "Source");
        Member = ThingDomain.Present(member, "Member");
        Format = format;
    }
}

[MessagePackObject]
public sealed class MemberPath
{
    [Key(0)] public IReadOnlyList<MemberStep> Steps { get; }

    public MemberPath(IReadOnlyList<MemberStep> steps)
    {
        Steps = ThingDomain.Items(steps, "Steps");
    }
}
