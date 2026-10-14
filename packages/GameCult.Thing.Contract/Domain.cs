using System;
using System.Collections.Generic;

namespace GameCult.Thing.Contract;

/// <summary>A value was outside its domain. Names the domain and its bound, never the value.</summary>
public sealed class ThingDomainException : Exception
{
    public ThingDomainException(string domain, string bound) : base($"{domain} must be {bound}")
    {
        Domain = domain;
        Bound = bound;
    }

    /// <summary>The domain that refused.</summary>
    public string Domain { get; }

    /// <summary>The bound that was not met.</summary>
    public string Bound { get; }
}

/// <summary>
/// The value domains of the contract's numbers, local names and slots. A required slot is never null, and a list is a
/// private copy that holds no nil item. Every constructor whose field carries a domain calls the
/// matching check, and every deserializer reaches a value through that constructor, so no door skips a check.
/// </summary>
public static class ThingDomain
{
    /// <summary>A result's position in its invocation's answers, counting from 1.</summary>
    public static int Seq(int value) => value >= 1 ? value : throw new ThingDomainException("Seq", "at least 1");

    /// <summary>A document or source version, never negative.</summary>
    public static long Version(long value) => value >= 0 ? value : throw new ThingDomainException("Version", "at least 0");

    public static long? Version(long? value) => value.HasValue ? Version(value.Value) : null;

    /// <summary>A count, an extent or an index, never negative.</summary>
    public static int Count(int value) => value >= 0 ? value : throw new ThingDomainException("Count", "at least 0");

    public static int? Count(int? value) => value.HasValue ? Count(value.Value) : null;

    /// <summary>A name the contract joins into a key: non-empty, no '.'.</summary>
    public static string Segment(string value) =>
        string.IsNullOrEmpty(value) ? throw new ThingDomainException("Segment", "non-empty")
        : value.IndexOf('.') >= 0 ? throw new ThingDomainException("Segment", "free of '.'")
        : value;

    /// <summary>A required slot: the value, or a refusal naming the slot when it is null.</summary>
    public static T Present<T>(T? value, string slot) where T : class =>
        value ?? throw new ThingDomainException(slot, "present");

    /// <summary>
    /// A required byte slot. A null on the wire decodes to a default view with no backing store, so a view that is
    /// empty and backed by nothing is refused as nil; an empty array is a present, empty payload.
    /// </summary>
    public static ReadOnlyMemory<byte> Present(ReadOnlyMemory<byte> value, string slot) =>
        value.IsEmpty && !System.Runtime.InteropServices.MemoryMarshal.TryGetArray(value, out _)
            ? throw new ThingDomainException(slot, "present")
            : value;

    /// <summary>
    /// A required list slot: a read-only copy, so the caller's list cannot change the value afterwards. A null list or
    /// a null item is refused naming the slot.
    /// </summary>
    public static IReadOnlyList<T> Items<T>(IReadOnlyList<T>? items, string slot) where T : class
    {
        if (items is null) throw new ThingDomainException(slot, "present");
        var copy = new T[items.Count];
        for (var i = 0; i < copy.Length; i++)
            copy[i] = items[i] ?? throw new ThingDomainException(slot, "free of nil items");
        return Array.AsReadOnly(copy);
    }
}
