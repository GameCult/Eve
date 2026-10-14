using System.Reflection;
using MessagePack;

namespace GameCult.Thing.Contract.Tests;

/// <summary>
/// Every way a caller can build a contract value without decoding: each public constructor, each public static factory
/// returning its own type, and the key builders. Arguments are built through the same public constructors a consumer
/// would use, so a test's inputs never come from a private door.
/// </summary>
internal static class Doors
{
    private static readonly Assembly Package = typeof(CommandResult).Assembly;

    public sealed record Door(string Name, MethodBase Method)
    {
        public ParameterInfo[] Parameters => Method.GetParameters();

        public object? Call(object?[] args)
        {
            try
            {
                return Method is ConstructorInfo ctor ? ctor.Invoke(args) : Method.Invoke(null, args);
            }
            catch (TargetInvocationException error)
            {
                System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(error.InnerException!).Throw();
                throw;
            }
        }

        public object?[] ValidArgs() => Parameters.Select(p => Make(p.ParameterType)).ToArray();
    }

    public static IReadOnlyList<Door> All()
    {
        var doors = new List<Door>();
        foreach (var type in Package.GetExportedTypes().Where(t => (!t.IsAbstract || t.IsSealed) && t != typeof(ThingDomainException)))
        {
            foreach (var ctor in type.GetConstructors(BindingFlags.Public | BindingFlags.Instance))
                doors.Add(new Door($"new {type.Name}", ctor));
            foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly))
            {
                if (type.Name == nameof(ThingDomain)) continue;
                if (method.ReturnType == type || type.Name == nameof(ThingKeys)) doors.Add(new Door($"{type.Name}.{method.Name}", method));
            }
        }

        return doors;
    }

    /// <summary>A valid value of <paramref name="type"/>: the first union arm of a union, the first public constructor otherwise.</summary>
    public static object Make(Type type, int depth = 0)
    {
        if (depth > 40) throw new InvalidOperationException($"no finite valid value of {type.Name}");
        var underlying = Nullable.GetUnderlyingType(type);
        if (underlying != null) return Make(underlying, depth);
        if (type == typeof(string)) return "x";
        if (type == typeof(int)) return 1;
        if (type == typeof(long)) return 1L;
        if (type == typeof(double)) return 1.0;
        if (type == typeof(bool)) return true;
        if (type == typeof(byte)) return (byte)1;
        if (type == typeof(byte[])) return new byte[] { 1 };
        if (type == typeof(ReadOnlyMemory<byte>)) return new ReadOnlyMemory<byte>(new byte[] { 1 });
        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(IReadOnlyList<>))
            return MakeList(type.GetGenericArguments()[0], 0, depth);
        var arms = type.GetCustomAttributes<UnionAttribute>(false).ToList();
        if (type.IsAbstract && arms.Count > 0) return Make(arms[0].SubType, depth + 1);
        var ctor = type.GetConstructors(BindingFlags.Public | BindingFlags.Instance).First();
        return ctor.Invoke(ctor.GetParameters().Select(p => Make(p.ParameterType, depth + 1)).ToArray());
    }

    /// <summary>A mutable list of <paramref name="count"/> valid elements, as a consumer holds one before constructing.</summary>
    public static System.Collections.IList MakeList(Type element, int count, int depth = 0)
    {
        var list = (System.Collections.IList)Activator.CreateInstance(typeof(List<>).MakeGenericType(element))!;
        for (var i = 0; i < count; i++) list.Add(Make(element, depth + 1));
        return list;
    }
}
