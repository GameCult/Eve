using System.Collections.Generic;
using GameCult.Caching;
using MessagePack;

namespace GameCult.Thing.Contract;

[Union(0, typeof(CommandIdRef))]
[Union(1, typeof(CommandRefParam))]
public abstract class CommandRef
{
    internal CommandRef() { }
}

[MessagePackObject]
public sealed class CommandIdRef : CommandRef
{
    [Key(0)] public string Id { get; }

    public CommandIdRef(string id)
    {
        Id = ThingDomain.Present(id, "Id");
    }
}

[MessagePackObject]
public sealed class CommandRefParam : CommandRef
{
    [Key(0)] public string Name { get; }

    public CommandRefParam(string name)
    {
        Name = ThingDomain.Present(name, "Name");
    }
}

[Union(0, typeof(TextValue))]
[Union(1, typeof(NumberValue))]
[Union(2, typeof(BoolValue))]
[Union(3, typeof(ChoiceValue))]
public abstract class InputValue
{
    internal InputValue() { }
}

[MessagePackObject]
public sealed class TextValue : InputValue
{
    [Key(0)] public string Value { get; }

    public TextValue(string value)
    {
        Value = ThingDomain.Present(value, "Value");
    }
}

[MessagePackObject]
public sealed class NumberValue : InputValue
{
    [Key(0)] public double Value { get; }

    public NumberValue(double value)
    {
        Value = value;
    }
}

[MessagePackObject]
public sealed class BoolValue : InputValue
{
    [Key(0)] public bool Value { get; }

    public BoolValue(bool value)
    {
        Value = value;
    }
}

[MessagePackObject]
public sealed class ChoiceValue : InputValue
{
    [Key(0)] public string Value { get; }

    public ChoiceValue(string value)
    {
        Value = ThingDomain.Present(value, "Value");
    }
}

[MessagePackObject]
public sealed class CommandDecl
{
    [Key(0)] public string Id { get; }
    [Key(1)] public string PayloadSchema { get; }
    [Key(2)] public IReadOnlyList<string> Captures { get; }
    [Key(3)] public string? Confirm { get; }

    public CommandDecl(string id, string payloadSchema, IReadOnlyList<string> captures, string? confirm)
    {
        Id = ThingDomain.Present(id, "Id");
        PayloadSchema = ThingDomain.Present(payloadSchema, "PayloadSchema");
        Captures = ThingDomain.Items(captures, "Captures");
        Confirm = confirm;
    }
}

[MessagePackObject]
public sealed class RecordPayload
{
    [Key(0)] public string Schema { get; }
    [Key(1)] public ReadOnlyMemory<byte> Bytes { get; }

    public RecordPayload(string schema, ReadOnlyMemory<byte> bytes)
    {
        Schema = ThingDomain.Present(schema, "Schema");
        Bytes = bytes.ToArray();
    }
}

[MessagePackObject]
public sealed class CapturedInput
{
    [Key(0)] public string Node { get; }
    [Key(1)] public InputValue Value { get; }

    public CapturedInput(string node, InputValue value)
    {
        Node = ThingDomain.Present(node, "Node");
        Value = ThingDomain.Present(value, "Value");
    }
}

[CultDocument("gamecult.thing.command_invocation", "gamecult.thing.command_invocation.v1")]
[MessagePackObject]
public sealed class CommandInvocation
{
    [Key(0)] public string InvocationId { get; }
    [Key(1)] public string SurfaceKey { get; }
    [Key(2)] public long SurfaceVersion { get; }
    [Key(3)] public string Command { get; }
    [Key(4)] public RecordPayload Payload { get; }
    [Key(5)] public IReadOnlyList<CapturedInput> Captured { get; }
    [Key(6)] public string Client { get; }
    [Key(7)] public string IssuedAt { get; }
    [Key(8)] public string? Delegation { get; }

    public CommandInvocation(string invocationId, string surfaceKey, long surfaceVersion, string command, RecordPayload payload, IReadOnlyList<CapturedInput> captured, string client, string issuedAt, string? delegation)
    {
        InvocationId = ThingDomain.Present(invocationId, "InvocationId");
        SurfaceKey = ThingDomain.Present(surfaceKey, "SurfaceKey");
        SurfaceVersion = ThingDomain.Version(surfaceVersion);
        Command = ThingDomain.Present(command, "Command");
        Payload = ThingDomain.Present(payload, "Payload");
        Captured = ThingDomain.Items(captured, "Captured");
        Client = ThingDomain.Present(client, "Client");
        IssuedAt = ThingDomain.Present(issuedAt, "IssuedAt");
        Delegation = delegation;
    }

    [IgnoreMember] public string RecordKey => ThingKeys.InvocationKey(InvocationId);
}
