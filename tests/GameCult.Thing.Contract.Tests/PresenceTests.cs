using System.Reflection;

namespace GameCult.Thing.Contract.Tests;

/// <summary>
/// The constructor door: a slot the annotations make non-null refuses null, naming the slot; a slot they make nullable
/// accepts it. The annotations mirror the Rust contract's Option types (the nil vector proves that against Rust), so no
/// list of required slots lives here.
/// </summary>
public sealed class PresenceTests
{
    private static string Slot(string parameter) => parameter.TrimStart('@');

    [Test]
    public void EveryConstructorAndFactoryHoldsPresenceAtEveryReferenceParameter()
    {
        var failures = new List<string>();
        var required = 0;
        var optional = 0;
        var context = new NullabilityInfoContext();
        foreach (var door in Doors.All())
        {
            var parameters = door.Parameters;
            for (var index = 0; index < parameters.Length; index++)
            {
                var parameter = parameters[index];
                var isValue = parameter.ParameterType.IsValueType && Nullable.GetUnderlyingType(parameter.ParameterType) == null;
                if (isValue) continue;
                var state = context.Create(parameter).WriteState;
                var args = door.ValidArgs();
                args[index] = null;
                try
                {
                    door.Call(args);
                    if (state == NullabilityState.NotNull) failures.Add($"{door.Name}({parameter.Name}) accepted null");
                    else optional++;
                }
                catch (ThingDomainException error)
                {
                    if (state != NullabilityState.NotNull) failures.Add($"{door.Name}({parameter.Name}) refused null though nullable: {error.Message}");
                    else if (!string.Equals(error.Domain, Slot(parameter.Name!), StringComparison.OrdinalIgnoreCase) && error.Domain != "Segment")
                        failures.Add($"{door.Name}({parameter.Name}) named {error.Domain}");
                    else required++;
                }
                catch (Exception error)
                {
                    failures.Add($"{door.Name}({parameter.Name}) threw {error.GetType().Name}");
                }
            }
        }

        Assert.That(failures, Is.Empty);
        TestContext.Progress.WriteLine($"PRESENCE required={required} optional={optional}");
        Assert.That(required, Is.GreaterThan(200), "the scan reached the required slots");
        Assert.That(optional, Is.GreaterThan(15), "the scan reached the optional slots");
    }

    [Test]
    public void ARefusalNamesTheSlotAndNeverAValue()
    {
        var invocation = Builders.InvocationNamed("i");
        var pending = Assert.Throws<ThingDomainException>(() => CommandResult.Pending(invocation, 1, null!))!;
        Assert.That(pending.Domain, Is.EqualTo("Message"));
        Assert.That(pending.Message, Is.EqualTo("Message must be present"));
        var outcome = Assert.Throws<ThingDomainException>(() => CommandResult.Pending(null!, 1, Wire.Canary))!;
        Assert.That(outcome.Domain, Is.EqualTo("Invocation"));
        Assert.That(outcome.Message, Does.Not.Contain(Wire.Canary));
        var uri = Assert.Throws<ThingDomainException>(() => new AssetEntry("id", "image/png", null!, 1, 1))!;
        Assert.That(uri.Domain, Is.EqualTo("Uri"));
    }

    [Test]
    public void ARefusedListNamesTheSlot()
    {
        Assert.That(Assert.Throws<ThingDomainException>(() => ThingDomain.Items<string>(null, "Captures"))!.Domain, Is.EqualTo("Captures"));
        var nilItem = Assert.Throws<ThingDomainException>(() => ThingDomain.Items<string>(new List<string> { "a", null! }, "Captures"))!;
        Assert.That((nilItem.Domain, nilItem.Bound), Is.EqualTo(("Captures", "free of nil items")));
        var withCanary = Assert.Throws<ThingDomainException>(() => ThingDomain.Items<string>(new List<string> { Wire.Canary, null! }, "Captures"))!;
        Assert.That(withCanary.Message, Does.Not.Contain(Wire.Canary));
    }
}
