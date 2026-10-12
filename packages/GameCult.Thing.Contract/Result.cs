using System.Collections.Generic;
using GameCult.Caching;
using MessagePack;

namespace GameCult.Thing.Contract;

[Union(0, typeof(PendingOutcome))]
[Union(1, typeof(CompletedOutcome))]
[Union(2, typeof(DeniedOutcome))]
[Union(3, typeof(FailedOutcome))]
public abstract class Outcome
{
    internal Outcome() { }
}

[MessagePackObject]
public sealed class PendingOutcome : Outcome
{
    [Key(0)] public string Message { get; }

    public PendingOutcome(string message)
    {
        Message = message;
    }
}

[MessagePackObject]
public sealed class CompletedOutcome : Outcome
{
    [Key(0)] public long? SourceVersion { get; }
    [Key(1)] public bool ClearDrafts { get; }
    [Key(2)] public Effect? Effect { get; }

    public CompletedOutcome(long? sourceVersion, bool clearDrafts, Effect? effect)
    {
        SourceVersion = ThingDomain.Version(sourceVersion);
        ClearDrafts = clearDrafts;
        Effect = effect;
    }
}

[MessagePackObject]
public sealed class DeniedOutcome : Outcome
{
    [Key(0)] public string Reason { get; }
    [Key(1)] public string? Node { get; }

    public DeniedOutcome(string reason, string? node)
    {
        Reason = reason;
        Node = node;
    }
}

[MessagePackObject]
public sealed class FailedOutcome : Outcome
{
    [Key(0)] public string Reason { get; }

    public FailedOutcome(string reason)
    {
        Reason = reason;
    }
}

[Union(0, typeof(OpenSurfaceEffect))]
[Union(1, typeof(OpenExternalEffect))]
public abstract class Effect
{
    internal Effect() { }
}

[MessagePackObject]
public sealed class OpenSurfaceEffect : Effect
{
    [Key(0)] public string Key { get; }

    public OpenSurfaceEffect(string key)
    {
        Key = key;
    }
}

[MessagePackObject]
public sealed class OpenExternalEffect : Effect
{
    [Key(0)] public string Url { get; }
    [Key(1)] public CommandRef Resume { get; }

    public OpenExternalEffect(string url, CommandRef resume)
    {
        Url = url;
        Resume = resume;
    }
}

/// <summary>
/// A provider's answer to one invocation. Results are built by the four factories and nothing else: the constructor is
/// private (MessagePack calls it on decode, and it holds the same <see cref="ThingDomain.Seq"/> bound), and no API takes a
/// state as free text or as an untyped value. <c>Seq</c> counts from 1 per invocation. The copied invocation id is a
/// convenience: core binds a result to an invocation it issued, so the copy is not provenance.
/// </summary>
[CultDocument("gamecult.thing.command_result", "gamecult.thing.command_result.v1")]
[MessagePackObject(AllowPrivate = true)]
public sealed class CommandResult
{
    [Key(0)] public string InvocationId { get; }
    [Key(1)] public int Seq { get; }
    [Key(2)] public Outcome Outcome { get; }

    [SerializationConstructor]
    private CommandResult(string invocationId, int seq, Outcome outcome)
    {
        InvocationId = invocationId;
        Seq = ThingDomain.Seq(seq);
        Outcome = outcome;
    }

    [IgnoreMember] public string RecordKey => ThingKeys.ResultKey(InvocationId, Seq);

    public static CommandResult Pending(CommandInvocation invocation, int seq, string message) =>
        new(invocation.InvocationId, seq, new PendingOutcome(message));

    public static CommandResult Completed(CommandInvocation invocation, int seq, long? sourceVersion, bool clearDrafts, Effect? effect) =>
        new(invocation.InvocationId, seq, new CompletedOutcome(sourceVersion, clearDrafts, effect));

    public static CommandResult Denied(CommandInvocation invocation, int seq, string reason, string? node) =>
        new(invocation.InvocationId, seq, new DeniedOutcome(reason, node));

    public static CommandResult Failed(CommandInvocation invocation, int seq, string reason) =>
        new(invocation.InvocationId, seq, new FailedOutcome(reason));
}
