using System;

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
/// The value domains of the contract's numbers and local names. Every constructor whose field carries a domain calls the
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

    /// <summary>A name the contract joins into a record key: non-empty, no '.'.</summary>
    public static string Segment(string value) =>
        string.IsNullOrEmpty(value) ? throw new ThingDomainException("Segment", "non-empty")
        : value.IndexOf('.') >= 0 ? throw new ThingDomainException("Segment", "free of '.'")
        : value;
}
