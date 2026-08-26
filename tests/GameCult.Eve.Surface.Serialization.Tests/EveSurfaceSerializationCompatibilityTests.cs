using System.Buffers;
using System.Text.Json;
using GameCult.Eve.Surface;
using GameCult.Mesh;
using MessagePack;
using NUnit.Framework;

namespace GameCult.Eve.Surface.Tests;

[TestFixture]
public sealed class EveSurfaceSerializationCompatibilityTests
{
    [Test]
    public void EntitySoaV2SerializesLogicalLayoutWithoutTransportFields()
    {
        var document = new EveEntitySoaViewDocument
        {
            ProviderId = "provider",
            ViewId = "entities",
            BodySchemaId = "entity.slab.v1",
            LayoutVersion = 2,
            ProducerEpoch = 3,
            Sequence = 4,
            Capacity = 8,
            FrameId = 91,
            Buffers = new[] { new EveEntitySoaBuffer { BufferId = "entity-hot", ByteLength = 64 } },
            Identities = new[]
            {
                new EveEntityIdentity
                {
                    Index = 0,
                    EntityId = "player",
                    EntityKind = "ship",
                    Label = "Vanguard",
                    Faction = "alliance",
                    Selectable = true,
                    Controllable = true,
                    AssetRef = "cultmesh://assets/player"
                }
            }
        };

        var bytes = MessagePackSerializer.Serialize(document, Options);
        var reader = new MessagePackReader(bytes);
        var restored = MessagePackSerializer.Deserialize<EveEntitySoaViewDocument>(bytes, Options);

        Assert.That(reader.ReadArrayHeader(), Is.EqualTo(15));
        Assert.That(restored.Schema, Is.EqualTo(EveEntitySoaViewDocument.SchemaId));
        Assert.That(restored.Buffers[0].BufferId, Is.EqualTo("entity-hot"));
        Assert.That(restored.FrameId, Is.EqualTo(91));
        Assert.That(restored.Identities[0].Label, Is.EqualTo("Vanguard"));
        Assert.That(restored.Identities[0].Faction, Is.EqualTo("alliance"));
        Assert.That(restored.Identities[0].Selectable, Is.True);
        Assert.That(restored.Identities[0].Controllable, Is.True);
        Assert.That(restored.Identities[0].AssetRef, Is.EqualTo("cultmesh://assets/player"));
    }

    [Test]
    public void EntitySoaContractsExposeNoTransportAuthorityFields()
    {
        var forbidden = new[] { "Backend", "Location", "CapabilityToken", "Synchronization", "SynchronizationMode", "Descriptor" };
        var exposed = new[] { typeof(EveEntitySoaViewDocument), typeof(EveEntitySoaBuffer), typeof(EveEntitySoaColumn) }
            .SelectMany(type => type.GetProperties())
            .Select(property => property.Name);

        Assert.That(exposed, Has.None.Matches<string>(name => forbidden.Contains(name, StringComparer.Ordinal)));
    }

    private static readonly MessagePackSerializerOptions Options = MessagePackSerializerOptions.Standard;

    [Test]
    public void CommandInvocationHashBindsEveryImmutableEnvelopeField()
    {
        var request = new EveSurfaceCommandRequest(
            "provider",
            "surface",
            new CultMeshOperationInvocationDescriptor(
                "launch",
                "launch.v1",
                new CultMeshRouteHint(CultMeshLocalityKind.Network, "commands"),
                "command-1"),
            CultMesh.OperationPayload(("shipId", "ship:one")),
            DateTimeOffset.Parse("2026-08-19T00:00:00Z"),
            "pilot:one",
            "eve:commands",
            EveCommandReceiptDocument.SchemaId);
        var same = new EveSurfaceCommandRequest(
            request.Schema,
            request.ProviderId,
            request.SurfaceId,
            request.OperationRecord,
            new Dictionary<string, string>(request.PayloadFields, StringComparer.Ordinal),
            request.IssuedAt,
            request.ClientId,
            request.CommandBoundary,
            request.ReceiptSchema);
        var changedPayload = new EveSurfaceCommandRequest(
            request.ProviderId,
            request.SurfaceId,
            request.Operation,
            CultMesh.OperationPayload(("shipId", "ship:two")),
            request.IssuedAt,
            request.ClientId,
            request.CommandBoundary,
            request.ReceiptSchema);

        Assert.That(EveCommandInvocationHash.Compute(same), Is.EqualTo(EveCommandInvocationHash.Compute(request)));
        Assert.That(EveCommandInvocationHash.Compute(changedPayload), Is.Not.EqualTo(EveCommandInvocationHash.Compute(request)));
        var delegated = new EveSurfaceCommandRequest(
            request.Schema,
            request.ProviderId,
            request.SurfaceId,
            request.OperationRecord,
            new Dictionary<string, string>(request.PayloadFields, StringComparer.Ordinal),
            request.IssuedAt,
            "progression-router",
            request.CommandBoundary,
            request.ReceiptSchema,
            new EveCommandDelegationRecord(
                EveCommandInvocationHash.Compute(request),
                request.ClientId,
                "progression-router"));
        Assert.That(EveCommandInvocationHash.Compute(delegated), Is.Not.EqualTo(EveCommandInvocationHash.Compute(request)));
        Assert.That(delegated.Delegation!.OriginalInvocationHash, Is.EqualTo(EveCommandInvocationHash.Compute(request)));
    }

    [Test]
    public void LegacySevenFieldSurfaceDocumentDeserializes()
    {
        var bytes = WriteLegacySurfaceDocument();

        var document = MessagePackSerializer.Deserialize<EveSurfaceDocument>(bytes, Options);

        Assert.Multiple(() =>
        {
            Assert.That(document.Type, Is.EqualTo(EveSurfaceDocument.DefaultType));
            Assert.That(document.Schema, Is.EqualTo(EveSurfaceDocument.SchemaId));
            Assert.That(document.ProviderId, Is.EqualTo("legacy-provider"));
            Assert.That(document.ProviderKind, Is.EqualTo("legacy-kind"));
            Assert.That(document.Title, Is.EqualTo("Legacy surface"));
            Assert.That(document.Version, Is.EqualTo(17));
            Assert.That(document.UpdatedAtUtc, Is.EqualTo("2026-07-13T12:00:00Z"));
            Assert.That(document.Surface.Id, Is.EqualTo("legacy-surface"));
            Assert.That(document.Commands, Has.Count.EqualTo(1));
            Assert.That(document.Commands[0].Command, Is.EqualTo("legacy.execute"));
        });
    }

    [Test]
    public void LegacyDirectFiveStringCommandTemplateDeserializes()
    {
        var bytes = WriteLegacyCommandTemplate();

        var command = MessagePackSerializer.Deserialize<EveCommandTemplate>(bytes, Options);

        Assert.Multiple(() =>
        {
            Assert.That(command.Command, Is.EqualTo("legacy.execute"));
            Assert.That(command.Label, Is.EqualTo("Execute legacy command"));
            Assert.That(command.Operation.SchemaId, Is.EqualTo("gamecult.legacy.command.v1"));
            Assert.That(command.OperationRecord.RouteKind, Is.EqualTo("cultmesh"));
            Assert.That(command.OperationRecord.RouteDescription, Is.EqualTo("legacy.commands"));
            Assert.That(command.Transport, Is.EqualTo("legacy.commands"));
        });
    }

    [Test]
    public void CurrentSerializationWritesSchemaShapedMessagePackMap()
    {
        var document = CreateCurrentDocument();

        var bytes = MessagePackSerializer.Serialize(document, Options);
        var fixturePath = Path.Combine(
            AppContext.BaseDirectory,
            "Fixtures",
            "eve-surface-csharp-v1.base64");
        Assert.That(
            Convert.ToBase64String(bytes),
            Is.EqualTo(File.ReadAllText(fixturePath).Trim()),
            "The checked cross-runtime fixture must be regenerated from the real C# formatter when the wire changes.");
        using var wire = JsonDocument.Parse(MessagePackSerializer.ConvertToJson(bytes));
        var root = wire.RootElement;
        var surface = root.GetProperty("surface");
        var component = surface.GetProperty("root");
        var command = root.GetProperty("commands")[0];

        Assert.Multiple(() =>
        {
            Assert.That(root.ValueKind, Is.EqualTo(JsonValueKind.Object));
            Assert.That(root.GetProperty("schema").GetString(), Is.EqualTo(EveSurfaceDocument.SchemaId));
            Assert.That(surface.ValueKind, Is.EqualTo(JsonValueKind.Object));
            Assert.That(component.ValueKind, Is.EqualTo(JsonValueKind.Object));
            Assert.That(component.GetProperty("stateBindings").ValueKind, Is.EqualTo(JsonValueKind.Array));
            Assert.That(command.ValueKind, Is.EqualTo(JsonValueKind.Object));
            Assert.That(command.GetProperty("schema").GetString(), Is.EqualTo("gamecult.eve.command.v1"));
            Assert.That(command.GetProperty("command").GetString(), Is.EqualTo("current.execute"));
            Assert.That(command.GetProperty("payloadSchema").GetString(), Is.EqualTo("gamecult.current.command.v1"));
        });

        var roundTrip = MessagePackSerializer.Deserialize<EveSurfaceDocument>(bytes, Options);
        Assert.That(roundTrip.Commands[0].Command, Is.EqualTo("current.execute"));
    }

    [Test]
    public void LegacyExpandedProviderAdvertisementDeserializesAsCanonicalContract()
    {
        var document = MessagePackSerializer.Deserialize<EveProviderAdvertisementDocument>(
            WriteLegacyProviderAdvertisement(),
            Options);

        Assert.Multiple(() =>
        {
            Assert.That(document.ProviderId, Is.EqualTo("aetheria"));
            Assert.That(document.ServiceId, Is.EqualTo("aetheria-daemon"));
            Assert.That(document.VerseId, Is.EqualTo("aetheria.local"));
            Assert.That(document.Title, Is.EqualTo("Aetheria"));
            Assert.That(document.CultMeshAddress, Is.EqualTo("cultmesh://aetheria.local/aetheria"));
            Assert.That(document.Surfaces[0].SurfaceId, Is.EqualTo("aetheria.pilot"));
            Assert.That(document.Surfaces[0].Schema, Is.EqualTo(EveSurfaceDocument.SchemaId));
            Assert.That(document.Commands[0].Command, Is.EqualTo("aetheria.pilot.move"));
            Assert.That(document.Commands[0].SurfaceId, Is.Empty);
        });
    }

    [Test]
    public void CurrentProviderAdvertisementSerializationWritesCanonicalFourteenFields()
    {
        var document = new EveProviderAdvertisementDocument(
            "provider", "service", "verse", "Title", "game.runtime", "cultmesh://verse/provider",
            "2026-07-13T14:00:00Z", new EveProviderFreshness("fresh", "2026-07-13T14:00:00Z", 15000),
            new[] { EveSurfaceDocument.SchemaId }, Array.Empty<EveProviderWitness>(),
            Array.Empty<EveAdvertisedSurface>(), Array.Empty<EveAdvertisedCommand>(),
            new[] { "body-producer" });

        var bytes = MessagePackSerializer.Serialize(document, Options);
        var reader = new MessagePackReader(bytes);

        Assert.That(reader.ReadArrayHeader(), Is.EqualTo(14));
        var roundTrip = MessagePackSerializer.Deserialize<EveProviderAdvertisementDocument>(bytes, Options);
        Assert.Multiple(() =>
        {
            Assert.That(roundTrip.Title, Is.EqualTo("Title"));
            Assert.That(roundTrip.AuthorizedBodyProducerIds, Is.EqualTo(new[] { "body-producer" }));
        });
    }

    [Test]
    public void CommandReceiptCarriesRendererNeutralNavigationTarget()
    {
        var document = new EveCommandReceiptDocument(
            "receipt:launch",
            "launch",
            "aetheria.hangar.launch",
            "accepted",
            "Aetheria",
            "commander-daemon",
            "aetheria.daemon",
            "aetheria.hangar",
            "",
            "2026-08-17T20:00:00Z",
            42,
            new EveSurfaceNavigationTarget(
                "gamecult.aetheria",
                "aetheria.daemon",
                "aetheria.pilot",
                "interactive-world",
                new[] { "cultnet+tcp://odin.gamecult.example:3076" },
                "commander-daemon"),
            "sha256:launch-envelope",
            presentationSurfaceVersion: 77);

        var bytes = MessagePackSerializer.Serialize(document, Options);
        var reader = new MessagePackReader(bytes);
        using var wireJson = JsonDocument.Parse(MessagePackSerializer.ConvertToJson(bytes));
        var restored = MessagePackSerializer.Deserialize<EveCommandReceiptDocument>(bytes, Options);

        Assert.That(reader.NextMessagePackType, Is.EqualTo(MessagePackType.Map));
        Assert.That(reader.ReadMapHeader(), Is.EqualTo(15));
        Assert.That(wireJson.RootElement.GetProperty("navigation").ValueKind, Is.EqualTo(JsonValueKind.Object));
        Assert.That(restored.Navigation, Is.Not.Null);
        Assert.That(restored.Navigation!.VerseId, Is.EqualTo("gamecult.aetheria"));
        Assert.That(restored.Navigation.AuthorityRuntimeId, Is.EqualTo("commander-daemon"));
        Assert.That(restored.Navigation.SurfaceId, Is.EqualTo("aetheria.pilot"));
        Assert.That(restored.Navigation.SurfaceKind, Is.EqualTo("interactive-world"));
        Assert.That(restored.Navigation.RendezvousEndpoints, Is.EqualTo(new[] { "cultnet+tcp://odin.gamecult.example:3076" }));
        Assert.That(restored.InvocationHash, Is.EqualTo("sha256:launch-envelope"));
        Assert.That(restored.PresentationSurfaceVersion, Is.EqualTo(77));
    }

    [Test]
    public void CommandReceiptReadsLegacyPositionalRepresentation()
    {
        var buffer = new ArrayBufferWriter<byte>();
        var writer = new MessagePackWriter(buffer);
        writer.WriteArrayHeader(13);
        writer.Write(EveCommandReceiptDocument.SchemaId);
        writer.Write("receipt:legacy");
        writer.Write("legacy-command");
        writer.Write("aetheria.hangar.launch");
        writer.Write("accepted");
        writer.Write("Aetheria");
        writer.Write("commander-daemon");
        writer.Write("aetheria.daemon");
        writer.Write("aetheria.hangar");
        writer.Write("");
        writer.Write("2026-08-17T20:00:00Z");
        writer.Write(42L);
        writer.WriteArrayHeader(5);
        writer.Write("gamecult.aetheria");
        writer.Write("aetheria.daemon");
        writer.Write("aetheria.pilot");
        writer.Write("interactive-world");
        writer.WriteArrayHeader(1);
        writer.Write("cultnet+tcp://odin.gamecult.example:3076");
        writer.Flush();

        var restored = MessagePackSerializer.Deserialize<EveCommandReceiptDocument>(buffer.WrittenMemory, Options);

        Assert.Multiple(() =>
        {
            Assert.That(restored.ReceiptId, Is.EqualTo("receipt:legacy"));
            Assert.That(restored.CommandId, Is.EqualTo("legacy-command"));
            Assert.That(restored.Navigation, Is.Not.Null);
            Assert.That(restored.Navigation!.SurfaceId, Is.EqualTo("aetheria.pilot"));
            Assert.That(restored.Navigation.AuthorityRuntimeId, Is.Empty);
            Assert.That(restored.InvocationHash, Is.Empty);
            Assert.That(restored.PresentationSurfaceVersion, Is.Zero);
        });
    }

    [Test]
    public void CommandReceiptOmitsAbsentOptionalNavigation()
    {
        var document = new EveCommandReceiptDocument(
            "receipt:no-navigation",
            "select-verse",
            "aetheria.hangar.select_verse",
            "accepted",
            "Aetheria",
            "commander-daemon",
            "aetheria.daemon",
            "aetheria.hangar",
            "",
            "2026-08-17T20:00:00Z",
            42);

        var bytes = MessagePackSerializer.Serialize(document, Options);
        using var wireJson = JsonDocument.Parse(MessagePackSerializer.ConvertToJson(bytes));
        var restored = MessagePackSerializer.Deserialize<EveCommandReceiptDocument>(bytes, Options);

        Assert.Multiple(() =>
        {
            Assert.That(wireJson.RootElement.TryGetProperty("navigation", out _), Is.False);
            Assert.That(wireJson.RootElement.TryGetProperty("invocationHash", out _), Is.False);
            Assert.That(wireJson.RootElement.TryGetProperty("presentationSurfaceVersion", out _), Is.False);
            Assert.That(restored.Navigation, Is.Null);
            Assert.That(restored.InvocationHash, Is.Empty);
            Assert.That(restored.PresentationSurfaceVersion, Is.Zero);
        });
    }

    private static EveSurfaceDocument CreateCurrentDocument() => new(
        "current-provider",
        "current-kind",
        "Current surface",
        23,
        "2026-07-13T13:00:00Z",
        CreateSurfaceTree("current-surface"),
        new[]
        {
            new EveCommandTemplate(new CultMeshOperationBindingRecord(
                "current.execute",
                "Execute current command",
                "gamecult.current.command.v1",
                "cultmesh",
                "current.commands"))
        });

    private static EveSurfaceTree CreateSurfaceTree(string id) => new(
        id,
        new EveSurfaceComponent(
            "root",
            "column",
            new Dictionary<string, string> { ["label"] = "Vanguard" },
            Array.Empty<EveSurfaceComponent>(),
            new[]
            {
                new CultMeshStateBindingRecord(
                    "label",
                    "hangar.selectedShip.name",
                    "hangar:current",
                    "gamecult.aetheria.hangar.v1",
                    "CultMesh",
                    "local")
            },
            new[]
            {
                new EveEmbeddedDocumentSlot(
                    "inventory",
                    "hangar:inventory",
                    "gamecult.aetheria.inventory.v1",
                    "inventory-grid",
                    new CultMeshRouteRecord("CultMesh", "local"))
            },
            new Dictionary<string, string> { ["grow"] = "1" },
            new Dictionary<string, string> { ["accent"] = "hangar" }),
        new[] { new EveStyleToken("accent", "#50f5dc") });

    private static byte[] WriteLegacySurfaceDocument()
    {
        var buffer = new ArrayBufferWriter<byte>();
        var writer = new MessagePackWriter(buffer);
        writer.WriteArrayHeader(7);
        writer.Write("legacy-provider");
        writer.Write("legacy-kind");
        writer.Write("Legacy surface");
        writer.Write(17L);
        writer.Write("2026-07-13T12:00:00Z");
        writer.WriteRaw(MessagePackSerializer.Serialize(CreateSurfaceTree("legacy-surface"), Options));
        writer.WriteArrayHeader(1);
        writer.WriteRaw(WriteLegacyCommandTemplate());
        writer.Flush();
        return buffer.WrittenSpan.ToArray();
    }

    private static byte[] WriteLegacyCommandTemplate()
    {
        var buffer = new ArrayBufferWriter<byte>();
        var writer = new MessagePackWriter(buffer);
        writer.WriteArrayHeader(5);
        writer.Write("legacy.execute");
        writer.Write("Execute legacy command");
        writer.Write("gamecult.legacy.command.v1");
        writer.Write("cultmesh");
        writer.Write("legacy.commands");
        writer.Flush();
        return buffer.WrittenSpan.ToArray();
    }

    private static byte[] WriteLegacyProviderAdvertisement()
    {
        var buffer = new ArrayBufferWriter<byte>();
        var writer = new MessagePackWriter(buffer);
        writer.WriteArrayHeader(16);
        writer.Write(EveProviderAdvertisementDocument.SchemaId);
        writer.Write("aetheria");
        writer.Write("aetheria-daemon");
        writer.Write("aetheria.local");
        writer.Write("asgard");
        writer.Write("aetheria");
        writer.Write("aetheria.local/aetheria");
        writer.Write("cultmesh://aetheria.local/aetheria");
        writer.Write("Aetheria");
        writer.Write("game.runtime");
        writer.Write("2026-07-13T14:00:00Z");
        writer.WriteArrayHeader(3);
        writer.Write("fresh");
        writer.Write("2026-07-13T14:00:00Z");
        writer.Write(15000);
        writer.WriteArrayHeader(1);
        writer.Write(EveSurfaceDocument.SchemaId);
        writer.WriteArrayHeader(0);
        writer.WriteArrayHeader(1);
        writer.WriteArrayHeader(5);
        writer.Write(EveSurfaceDocument.SchemaId);
        writer.Write("aetheria.pilot");
        writer.Write("eve:surface:aetheria.pilot");
        writer.Write("cultmesh");
        writer.Write("available");
        writer.WriteArrayHeader(1);
        writer.WriteArrayHeader(3);
        writer.Write("aetheria.pilot.move");
        writer.Write("cultmesh");
        writer.Write("Move the pilot ship");
        writer.Flush();
        return buffer.WrittenSpan.ToArray();
    }
}
