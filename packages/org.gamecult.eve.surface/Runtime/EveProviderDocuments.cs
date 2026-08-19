using System;
using System.Collections.Generic;
using GameCult.Caching;
using MessagePack;
using MessagePack.Formatters;

#nullable enable

namespace GameCult.Eve.Surface
{
    [CultDocument("gamecult.eve.provider_advertisement", SchemaId)]
    [MessagePackObject]
    [MessagePackFormatter(typeof(EveProviderAdvertisementCompatibilityFormatter))]
    public sealed class EveProviderAdvertisementDocument
    {
        public const string SchemaId = "gamecult.eve.provider_advertisement.v1";

        public EveProviderAdvertisementDocument(
            string providerId,
            string serviceId,
            string verseId,
            string title,
            string kind,
            string cultMeshAddress,
            string updatedAtUtc,
            EveProviderFreshness freshness,
            IReadOnlyList<string> schemas,
            IReadOnlyList<EveProviderWitness> witnesses,
            IReadOnlyList<EveAdvertisedSurface> surfaces,
            IReadOnlyList<EveAdvertisedCommand> commands,
            IReadOnlyList<string>? authorizedBodyProducerIds = null)
            : this(SchemaId, providerId, serviceId, verseId, title, kind, cultMeshAddress, updatedAtUtc, freshness, schemas, witnesses, surfaces, commands, authorizedBodyProducerIds)
        {
        }

        [SerializationConstructor]
        public EveProviderAdvertisementDocument(
            string schema,
            string providerId,
            string serviceId,
            string verseId,
            string title,
            string kind,
            string cultMeshAddress,
            string updatedAtUtc,
            EveProviderFreshness freshness,
            IReadOnlyList<string> schemas,
            IReadOnlyList<EveProviderWitness> witnesses,
            IReadOnlyList<EveAdvertisedSurface> surfaces,
            IReadOnlyList<EveAdvertisedCommand> commands,
            IReadOnlyList<string>? authorizedBodyProducerIds = null)
        {
            Schema = string.IsNullOrWhiteSpace(schema) ? SchemaId : schema;
            ProviderId = providerId ?? "";
            ServiceId = serviceId ?? "";
            VerseId = verseId ?? "";
            Title = title ?? "";
            Kind = kind ?? "";
            CultMeshAddress = cultMeshAddress ?? "";
            UpdatedAtUtc = updatedAtUtc ?? "";
            Freshness = freshness ?? new EveProviderFreshness("unknown", "", 0);
            Schemas = schemas ?? Array.Empty<string>();
            Witnesses = witnesses ?? Array.Empty<EveProviderWitness>();
            Surfaces = surfaces ?? Array.Empty<EveAdvertisedSurface>();
            Commands = commands ?? Array.Empty<EveAdvertisedCommand>();
            AuthorizedBodyProducerIds = authorizedBodyProducerIds ?? Array.Empty<string>();
        }

        [Key(0)] public string Schema { get; }
        [Key(1)] public string ProviderId { get; }
        [Key(2)] public string ServiceId { get; }
        [Key(3)] public string VerseId { get; }
        [Key(4)] public string Title { get; }
        [Key(5)] public string Kind { get; }
        [Key(6)] public string CultMeshAddress { get; }
        [Key(7)] public string UpdatedAtUtc { get; }
        [Key(8)] public EveProviderFreshness Freshness { get; }
        [Key(9)] public IReadOnlyList<string> Schemas { get; }
        [Key(10)] public IReadOnlyList<EveProviderWitness> Witnesses { get; }
        [Key(11)] public IReadOnlyList<EveAdvertisedSurface> Surfaces { get; }
        [Key(12)] public IReadOnlyList<EveAdvertisedCommand> Commands { get; }
        [Key(13)] public IReadOnlyList<string> AuthorizedBodyProducerIds { get; }
    }

    /// <summary>
    /// Reads canonical provider advertisements and the original Aetheria-expanded v1 layout.
    /// </summary>
    public sealed class EveProviderAdvertisementCompatibilityFormatter :
        IMessagePackFormatter<EveProviderAdvertisementDocument?>
    {
        private const int CurrentFieldCount = 14;
        private const int LegacyFieldCount = 16;

        public void Serialize(
            ref MessagePackWriter writer,
            EveProviderAdvertisementDocument? value,
            MessagePackSerializerOptions options)
        {
            if (value == null) { writer.WriteNil(); return; }
            writer.WriteArrayHeader(CurrentFieldCount);
            writer.Write(value.Schema);
            writer.Write(value.ProviderId);
            writer.Write(value.ServiceId);
            writer.Write(value.VerseId);
            writer.Write(value.Title);
            writer.Write(value.Kind);
            writer.Write(value.CultMeshAddress);
            writer.Write(value.UpdatedAtUtc);
            Formatter<EveProviderFreshness>(options).Serialize(ref writer, value.Freshness, options);
            Formatter<IReadOnlyList<string>>(options).Serialize(ref writer, value.Schemas, options);
            Formatter<IReadOnlyList<EveProviderWitness>>(options).Serialize(ref writer, value.Witnesses, options);
            Formatter<IReadOnlyList<EveAdvertisedSurface>>(options).Serialize(ref writer, value.Surfaces, options);
            Formatter<IReadOnlyList<EveAdvertisedCommand>>(options).Serialize(ref writer, value.Commands, options);
            Formatter<IReadOnlyList<string>>(options).Serialize(ref writer, value.AuthorizedBodyProducerIds, options);
        }

        public EveProviderAdvertisementDocument? Deserialize(
            ref MessagePackReader reader,
            MessagePackSerializerOptions options)
        {
            if (reader.TryReadNil()) return null;
            if (reader.NextMessagePackType != MessagePackType.Array)
                throw new MessagePackSerializationException("Eve provider advertisement must be an array.");

            options.Security.DepthStep(ref reader);
            try
            {
                var fields = reader.ReadArrayHeader();
                if (fields == LegacyFieldCount)
                    return ReadLegacy(ref reader, options);

                var schema = ReadString(ref reader, fields, 0);
                var providerId = ReadString(ref reader, fields, 1);
                var serviceId = ReadString(ref reader, fields, 2);
                var verseId = ReadString(ref reader, fields, 3);
                var title = ReadString(ref reader, fields, 4);
                var kind = ReadString(ref reader, fields, 5);
                var address = ReadString(ref reader, fields, 6);
                var updatedAtUtc = ReadString(ref reader, fields, 7);
                var freshness = fields > 8 ? Formatter<EveProviderFreshness>(options).Deserialize(ref reader, options) : null;
                var schemas = fields > 9 ? Formatter<IReadOnlyList<string>>(options).Deserialize(ref reader, options) : null;
                var witnesses = fields > 10 ? Formatter<IReadOnlyList<EveProviderWitness>>(options).Deserialize(ref reader, options) : null;
                var surfaces = fields > 11 ? Formatter<IReadOnlyList<EveAdvertisedSurface>>(options).Deserialize(ref reader, options) : null;
                var commands = fields > 12 ? Formatter<IReadOnlyList<EveAdvertisedCommand>>(options).Deserialize(ref reader, options) : null;
                var authorizedBodyProducerIds = fields > 13 ? Formatter<IReadOnlyList<string>>(options).Deserialize(ref reader, options) : null;
                for (var index = CurrentFieldCount; index < fields; index++) reader.Skip();
                return new EveProviderAdvertisementDocument(
                    schema, providerId, serviceId, verseId, title, kind, address, updatedAtUtc,
                    freshness ?? new EveProviderFreshness("unknown", "", 0),
                    schemas ?? Array.Empty<string>(),
                    witnesses ?? Array.Empty<EveProviderWitness>(),
                    surfaces ?? Array.Empty<EveAdvertisedSurface>(),
                    commands ?? Array.Empty<EveAdvertisedCommand>(),
                    authorizedBodyProducerIds ?? Array.Empty<string>());
            }
            finally { reader.Depth--; }
        }

        private static EveProviderAdvertisementDocument ReadLegacy(
            ref MessagePackReader reader,
            MessagePackSerializerOptions options)
        {
            var schema = ReadString(ref reader);
            var providerId = ReadString(ref reader);
            var serviceId = ReadString(ref reader);
            var verseId = ReadString(ref reader);
            reader.Skip(); // RootVerse remains provider-owned settings, not portable advertisement state.
            reader.Skip(); // CanonicalService
            reader.Skip(); // LocatedService
            var address = ReadString(ref reader);
            var title = ReadString(ref reader);
            var kind = ReadString(ref reader);
            var updatedAtUtc = ReadString(ref reader);
            var freshness = Formatter<EveProviderFreshness>(options).Deserialize(ref reader, options)
                ?? new EveProviderFreshness("unknown", "", 0);
            var schemas = Formatter<IReadOnlyList<string>>(options).Deserialize(ref reader, options)
                ?? Array.Empty<string>();
            var witnesses = Formatter<IReadOnlyList<EveProviderWitness>>(options).Deserialize(ref reader, options)
                ?? Array.Empty<EveProviderWitness>();
            var surfaces = ReadLegacySurfaces(ref reader);
            var commands = ReadLegacyCommands(ref reader);
            return new EveProviderAdvertisementDocument(
                schema, providerId, serviceId, verseId, title, kind, address, updatedAtUtc,
                freshness, schemas, witnesses, surfaces, commands);
        }

        private static EveAdvertisedSurface[] ReadLegacySurfaces(ref MessagePackReader reader)
        {
            var count = reader.ReadArrayHeader();
            var values = new EveAdvertisedSurface[count];
            for (var index = 0; index < count; index++)
            {
                var fields = reader.ReadArrayHeader();
                var schema = ReadString(ref reader, fields, 0);
                var surfaceId = ReadString(ref reader, fields, 1);
                var recordRef = ReadString(ref reader, fields, 2);
                var transport = ReadString(ref reader, fields, 3);
                var status = ReadString(ref reader, fields, 4);
                for (var field = 5; field < fields; field++) reader.Skip();
                values[index] = new EveAdvertisedSurface(
                    surfaceId, schema, recordRef, transport, status, "", null);
            }
            return values;
        }

        private static EveAdvertisedCommand[] ReadLegacyCommands(ref MessagePackReader reader)
        {
            var count = reader.ReadArrayHeader();
            var values = new EveAdvertisedCommand[count];
            for (var index = 0; index < count; index++)
            {
                var fields = reader.ReadArrayHeader();
                var command = ReadString(ref reader, fields, 0);
                var transport = ReadString(ref reader, fields, 1);
                var summary = ReadString(ref reader, fields, 2);
                for (var field = 3; field < fields; field++) reader.Skip();
                values[index] = new EveAdvertisedCommand(command, "", transport, summary);
            }
            return values;
        }

        private static IMessagePackFormatter<T> Formatter<T>(MessagePackSerializerOptions options) =>
            options.Resolver.GetFormatter<T>()
            ?? throw new MessagePackSerializationException($"No formatter is registered for {typeof(T).FullName}.");

        private static string ReadString(ref MessagePackReader reader) => reader.ReadString() ?? "";
        private static string ReadString(ref MessagePackReader reader, int fields, int index) =>
            index < fields ? ReadString(ref reader) : "";
    }


    [MessagePackObject]
    public sealed class EveProviderFreshness
    {
        [SerializationConstructor]
        public EveProviderFreshness(string state, string lastSeenAtUtc, long maxAgeMs)
        {
            State = state ?? "";
            LastSeenAtUtc = lastSeenAtUtc ?? "";
            MaxAgeMs = maxAgeMs;
        }

        [Key(0)] public string State { get; }
        [Key(1)] public string LastSeenAtUtc { get; }
        [Key(2)] public long MaxAgeMs { get; }
    }

    [MessagePackObject]
    public sealed class EveProviderWitness
    {
        [SerializationConstructor]
        public EveProviderWitness(string kind, string reference, string summary)
        {
            Kind = kind ?? "";
            Reference = reference ?? "";
            Summary = summary ?? "";
        }

        [Key(0)] public string Kind { get; }
        [Key(1)] public string Reference { get; }
        [Key(2)] public string Summary { get; }
    }

    [MessagePackObject]
    public sealed class EveAdvertisedSurface
    {
        [SerializationConstructor]
        public EveAdvertisedSurface(
            string surfaceId,
            string schema,
            string recordRef,
            string transport,
            string status,
            string surfaceKind,
            EveWorldInteractionAdvertisement? worldInteraction = null)
        {
            SurfaceId = surfaceId ?? "";
            Schema = schema ?? "";
            RecordRef = recordRef ?? "";
            Transport = transport ?? "";
            Status = status ?? "";
            SurfaceKind = surfaceKind ?? "";
            WorldInteraction = worldInteraction;
        }

        [Key(0)] public string SurfaceId { get; }
        [Key(1)] public string Schema { get; }
        [Key(2)] public string RecordRef { get; }
        [Key(3)] public string Transport { get; }
        [Key(4)] public string Status { get; }
        [Key(5)] public string SurfaceKind { get; }
        [Key(6)] public EveWorldInteractionAdvertisement? WorldInteraction { get; }
    }

    [MessagePackObject]
    public sealed class EveWorldInteractionAdvertisement
    {
        [SerializationConstructor]
        public EveWorldInteractionAdvertisement(
            string projectionKind,
            IReadOnlyList<string> stateSchemas,
            string commandBoundary,
            string commandRecordRef,
            string receiptSchema,
            string receiptRecordRef,
            string assetManifestRecordRef,
            IReadOnlyList<string> loweringTargets,
            string ownership)
        {
            ProjectionKind = projectionKind ?? "";
            StateSchemas = stateSchemas ?? Array.Empty<string>();
            CommandBoundary = commandBoundary ?? "";
            CommandRecordRef = commandRecordRef ?? "";
            ReceiptSchema = receiptSchema ?? "";
            ReceiptRecordRef = receiptRecordRef ?? "";
            AssetManifestRecordRef = assetManifestRecordRef ?? "";
            LoweringTargets = loweringTargets ?? Array.Empty<string>();
            Ownership = ownership ?? "";
        }

        [Key(0)] public string ProjectionKind { get; }
        [Key(1)] public IReadOnlyList<string> StateSchemas { get; }
        [Key(2)] public string CommandBoundary { get; }
        [Key(3)] public string CommandRecordRef { get; }
        [Key(4)] public string ReceiptSchema { get; }
        [Key(5)] public string ReceiptRecordRef { get; }
        [Key(6)] public string AssetManifestRecordRef { get; }
        [Key(7)] public IReadOnlyList<string> LoweringTargets { get; }
        [Key(8)] public string Ownership { get; }
    }

    [MessagePackObject]
    public sealed class EveAdvertisedCommand
    {
        [SerializationConstructor]
        public EveAdvertisedCommand(string command, string surfaceId, string transport, string summary)
        {
            Command = command ?? "";
            SurfaceId = surfaceId ?? "";
            Transport = transport ?? "";
            Summary = summary ?? "";
        }

        [Key(0)] public string Command { get; }
        [Key(1)] public string SurfaceId { get; }
        [Key(2)] public string Transport { get; }
        [Key(3)] public string Summary { get; }
    }

    [CultDocument("gamecult.eve.command_receipt", SchemaId)]
    [MessagePackObject]
    [MessagePackFormatter(typeof(EveCommandReceiptCompatibilityFormatter))]
    public sealed class EveCommandReceiptDocument
    {
        public const string SchemaId = "gamecult.eve.command_receipt.v1";

        public EveCommandReceiptDocument(
            string receiptId,
            string commandId,
            string command,
            string state,
            string ownerRepo,
            string authority,
            string providerId,
            string surfaceId,
            string message,
            string issuedAtUtc,
            long sourceVersion,
            EveSurfaceNavigationTarget? navigation = null,
            string invocationHash = "",
            long presentationSurfaceVersion = 0)
            : this(SchemaId, receiptId, commandId, command, state, ownerRepo, authority, providerId, surfaceId, message, issuedAtUtc, sourceVersion, navigation, invocationHash, presentationSurfaceVersion)
        {
        }

        [SerializationConstructor]
        public EveCommandReceiptDocument(
            string schema,
            string receiptId,
            string commandId,
            string command,
            string state,
            string ownerRepo,
            string authority,
            string providerId,
            string surfaceId,
            string message,
            string issuedAtUtc,
            long sourceVersion,
            EveSurfaceNavigationTarget? navigation = null,
            string invocationHash = "",
            long presentationSurfaceVersion = 0)
        {
            Schema = string.IsNullOrWhiteSpace(schema) ? SchemaId : schema;
            ReceiptId = receiptId ?? "";
            CommandId = commandId ?? "";
            Command = command ?? "";
            State = state ?? "";
            OwnerRepo = ownerRepo ?? "";
            Authority = authority ?? "";
            ProviderId = providerId ?? "";
            SurfaceId = surfaceId ?? "";
            Message = message ?? "";
            IssuedAtUtc = issuedAtUtc ?? "";
            SourceVersion = sourceVersion;
            Navigation = navigation;
            InvocationHash = invocationHash ?? "";
            PresentationSurfaceVersion = presentationSurfaceVersion;
        }

        [Key(0)] public string Schema { get; }
        [Key(1)] public string ReceiptId { get; }
        [Key(2)] public string CommandId { get; }
        [Key(3)] public string Command { get; }
        [Key(4)] public string State { get; }
        [Key(5)] public string OwnerRepo { get; }
        [Key(6)] public string Authority { get; }
        [Key(7)] public string ProviderId { get; }
        [Key(8)] public string SurfaceId { get; }
        [Key(9)] public string Message { get; }
        [Key(10)] public string IssuedAtUtc { get; }
        [Key(11)] public long SourceVersion { get; }
        [Key(12)] public EveSurfaceNavigationTarget? Navigation { get; }
        [Key(13)] public string InvocationHash { get; }
        [Key(14)] public long PresentationSurfaceVersion { get; }
    }

    /// <summary>
    /// Writes the public command-receipt contract as a string-keyed map while retaining
    /// read compatibility with the original positional C# representation.
    /// </summary>
    public sealed class EveCommandReceiptCompatibilityFormatter :
        IMessagePackFormatter<EveCommandReceiptDocument?>
    {
        private const int LegacyFieldCount = 15;
        private const int RequiredAndScalarFieldCount = 12;

        public void Serialize(
            ref MessagePackWriter writer,
            EveCommandReceiptDocument? value,
            MessagePackSerializerOptions options)
        {
            if (value == null) { writer.WriteNil(); return; }

            var optionalFields = (value.Navigation == null ? 0 : 1) +
                (string.IsNullOrWhiteSpace(value.InvocationHash) ? 0 : 1) +
                (value.PresentationSurfaceVersion <= 0 ? 0 : 1);
            writer.WriteMapHeader(RequiredAndScalarFieldCount + optionalFields);
            Write(ref writer, "schema", value.Schema);
            Write(ref writer, "receiptId", value.ReceiptId);
            Write(ref writer, "commandId", value.CommandId);
            Write(ref writer, "command", value.Command);
            Write(ref writer, "state", value.State);
            Write(ref writer, "ownerRepo", value.OwnerRepo);
            Write(ref writer, "authority", value.Authority);
            Write(ref writer, "providerId", value.ProviderId);
            Write(ref writer, "surfaceId", value.SurfaceId);
            Write(ref writer, "message", value.Message);
            Write(ref writer, "issuedAtUtc", value.IssuedAtUtc);
            writer.Write("sourceVersion"); writer.Write(value.SourceVersion);
            if (value.Navigation != null)
            {
                writer.Write("navigation");
                WriteNavigation(ref writer, value.Navigation);
            }
            if (!string.IsNullOrWhiteSpace(value.InvocationHash))
                Write(ref writer, "invocationHash", value.InvocationHash);
            if (value.PresentationSurfaceVersion > 0)
            {
                writer.Write("presentationSurfaceVersion");
                writer.Write(value.PresentationSurfaceVersion);
            }
        }

        public EveCommandReceiptDocument? Deserialize(
            ref MessagePackReader reader,
            MessagePackSerializerOptions options)
        {
            if (reader.TryReadNil()) return null;
            if (reader.NextMessagePackType == MessagePackType.Map)
                return ReadMap(ref reader, options);
            if (reader.NextMessagePackType != MessagePackType.Array)
                throw new MessagePackSerializationException("Eve command receipt must be a map or legacy array.");

            options.Security.DepthStep(ref reader);
            try
            {
                var fields = reader.ReadArrayHeader();
                var schema = ReadString(ref reader, fields, 0, EveCommandReceiptDocument.SchemaId);
                var receiptId = ReadString(ref reader, fields, 1);
                var commandId = ReadString(ref reader, fields, 2);
                var command = ReadString(ref reader, fields, 3);
                var state = ReadString(ref reader, fields, 4);
                var ownerRepo = ReadString(ref reader, fields, 5);
                var authority = ReadString(ref reader, fields, 6);
                var providerId = ReadString(ref reader, fields, 7);
                var surfaceId = ReadString(ref reader, fields, 8);
                var message = ReadString(ref reader, fields, 9);
                var issuedAtUtc = ReadString(ref reader, fields, 10);
                var sourceVersion = fields > 11 ? reader.ReadInt64() : 0;
                var navigation = fields > 12 ? ReadNavigation(ref reader, options) : null;
                var invocationHash = ReadString(ref reader, fields, 13);
                var presentationSurfaceVersion = fields > 14 ? reader.ReadInt64() : 0;
                for (var index = LegacyFieldCount; index < fields; index++) reader.Skip();
                return new EveCommandReceiptDocument(
                    schema, receiptId, commandId, command, state, ownerRepo, authority,
                    providerId, surfaceId, message, issuedAtUtc, sourceVersion, navigation, invocationHash,
                    presentationSurfaceVersion);
            }
            finally { reader.Depth--; }
        }

        private static EveCommandReceiptDocument ReadMap(
            ref MessagePackReader reader,
            MessagePackSerializerOptions options)
        {
            options.Security.DepthStep(ref reader);
            try
            {
                var schema = EveCommandReceiptDocument.SchemaId;
                var receiptId = "";
                var commandId = "";
                var command = "";
                var state = "";
                var ownerRepo = "";
                var authority = "";
                var providerId = "";
                var surfaceId = "";
                var message = "";
                var issuedAtUtc = "";
                long sourceVersion = 0;
                EveSurfaceNavigationTarget? navigation = null;
                var invocationHash = "";
                long presentationSurfaceVersion = 0;
                var fields = reader.ReadMapHeader();
                for (var index = 0; index < fields; index++)
                {
                    switch (reader.ReadString())
                    {
                        case "schema": schema = ReadString(ref reader); break;
                        case "receiptId": receiptId = ReadString(ref reader); break;
                        case "commandId": commandId = ReadString(ref reader); break;
                        case "command": command = ReadString(ref reader); break;
                        case "state": state = ReadString(ref reader); break;
                        case "ownerRepo": ownerRepo = ReadString(ref reader); break;
                        case "authority": authority = ReadString(ref reader); break;
                        case "providerId": providerId = ReadString(ref reader); break;
                        case "surfaceId": surfaceId = ReadString(ref reader); break;
                        case "message": message = ReadString(ref reader); break;
                        case "issuedAtUtc": issuedAtUtc = ReadString(ref reader); break;
                        case "sourceVersion": sourceVersion = reader.ReadInt64(); break;
                        case "navigation": navigation = ReadNavigation(ref reader, options); break;
                        case "invocationHash": invocationHash = ReadString(ref reader); break;
                        case "presentationSurfaceVersion": presentationSurfaceVersion = reader.ReadInt64(); break;
                        default: reader.Skip(); break;
                    }
                }

                return new EveCommandReceiptDocument(
                    schema, receiptId, commandId, command, state, ownerRepo, authority,
                    providerId, surfaceId, message, issuedAtUtc, sourceVersion, navigation, invocationHash,
                    presentationSurfaceVersion);
            }
            finally { reader.Depth--; }
        }

        private static void WriteNavigation(
            ref MessagePackWriter writer,
            EveSurfaceNavigationTarget? navigation)
        {
            if (navigation == null) { writer.WriteNil(); return; }

            writer.WriteMapHeader(6);
            Write(ref writer, "verseId", navigation.VerseId);
            Write(ref writer, "authorityRuntimeId", navigation.AuthorityRuntimeId);
            Write(ref writer, "providerId", navigation.ProviderId);
            Write(ref writer, "surfaceId", navigation.SurfaceId);
            Write(ref writer, "surfaceKind", navigation.SurfaceKind);
            writer.Write("rendezvousEndpoints");
            writer.WriteArrayHeader(navigation.RendezvousEndpoints.Length);
            foreach (var endpoint in navigation.RendezvousEndpoints) writer.Write(endpoint);
        }

        private static EveSurfaceNavigationTarget? ReadNavigation(
            ref MessagePackReader reader,
            MessagePackSerializerOptions options)
        {
            if (reader.TryReadNil()) return null;
            if (reader.NextMessagePackType == MessagePackType.Array)
                return options.Resolver.GetFormatterWithVerify<EveSurfaceNavigationTarget>()
                    .Deserialize(ref reader, options);
            if (reader.NextMessagePackType != MessagePackType.Map)
                throw new MessagePackSerializationException("Eve receipt navigation must be a map or legacy array.");

            options.Security.DepthStep(ref reader);
            try
            {
                var verseId = "";
                var authorityRuntimeId = "";
                var providerId = "";
                var surfaceId = "";
                var surfaceKind = "";
                var endpoints = Array.Empty<string>();
                var fields = reader.ReadMapHeader();
                for (var index = 0; index < fields; index++)
                {
                    switch (reader.ReadString())
                    {
                        case "verseId": verseId = ReadString(ref reader); break;
                        case "authorityRuntimeId": authorityRuntimeId = ReadString(ref reader); break;
                        case "providerId": providerId = ReadString(ref reader); break;
                        case "surfaceId": surfaceId = ReadString(ref reader); break;
                        case "surfaceKind": surfaceKind = ReadString(ref reader); break;
                        case "rendezvousEndpoints": endpoints = ReadStrings(ref reader); break;
                        default: reader.Skip(); break;
                    }
                }
                return new EveSurfaceNavigationTarget(
                    verseId, providerId, surfaceId, surfaceKind, endpoints, authorityRuntimeId);
            }
            finally { reader.Depth--; }
        }

        private static string[] ReadStrings(ref MessagePackReader reader)
        {
            if (reader.TryReadNil()) return Array.Empty<string>();
            var count = reader.ReadArrayHeader();
            var values = new string[count];
            for (var index = 0; index < count; index++) values[index] = ReadString(ref reader);
            return values;
        }

        private static string ReadString(ref MessagePackReader reader) => reader.TryReadNil() ? "" : reader.ReadString() ?? "";

        private static string ReadString(
            ref MessagePackReader reader,
            int fields,
            int index,
            string fallback = "") => fields > index ? ReadString(ref reader) : fallback;

        private static void Write(ref MessagePackWriter writer, string key, string value)
        {
            writer.Write(key);
            writer.Write(value ?? "");
        }
    }

    [MessagePackObject]
    public sealed class EveSurfaceNavigationTarget
    {
        [SerializationConstructor]
        public EveSurfaceNavigationTarget(
            string verseId,
            string providerId,
            string surfaceId,
            string surfaceKind,
            string[]? rendezvousEndpoints = null,
            string authorityRuntimeId = "")
        {
            VerseId = verseId ?? "";
            AuthorityRuntimeId = authorityRuntimeId ?? "";
            ProviderId = providerId ?? "";
            SurfaceId = surfaceId ?? "";
            SurfaceKind = surfaceKind ?? "";
            RendezvousEndpoints = rendezvousEndpoints ?? Array.Empty<string>();
        }

        [Key(0)] public string VerseId { get; }
        [Key(1)] public string ProviderId { get; }
        [Key(2)] public string SurfaceId { get; }
        [Key(3)] public string SurfaceKind { get; }
        [Key(4)] public string[] RendezvousEndpoints { get; }
        [Key(5)] public string AuthorityRuntimeId { get; }
    }
}
