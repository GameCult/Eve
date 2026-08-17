using System;
using System.Collections.Generic;
using System.Linq;
using GameCult.Caching;
using GameCult.Mesh;
using MessagePack;
using MessagePack.Formatters;

#nullable enable

namespace GameCult.Eve.Surface
{
    [CultDocument("gamecult.eve.surface", "gamecult.eve.surface.v1")]
    [MessagePackObject]
    [MessagePackFormatter(typeof(EveSurfaceDocumentCompatibilityFormatter))]
    public sealed class EveSurfaceDocument
    {
        public const string DefaultType = "surface-state";
        public const string SchemaId = "gamecult.eve.surface.v1";

        public EveSurfaceDocument(
            string providerId,
            string providerKind,
            string title,
            long version,
            string updatedAtUtc,
            EveSurfaceTree surface,
            IReadOnlyList<EveCommandTemplate> commands)
            : this(DefaultType, SchemaId, providerId, providerKind, title, version, updatedAtUtc, surface, commands)
        {
        }

        [SerializationConstructor]
        public EveSurfaceDocument(
            string type,
            string schema,
            string providerId,
            string providerKind,
            string title,
            long version,
            string updatedAtUtc,
            EveSurfaceTree surface,
            IReadOnlyList<EveCommandTemplate> commands)
        {
            Type = string.IsNullOrWhiteSpace(type) ? DefaultType : type;
            Schema = string.IsNullOrWhiteSpace(schema) ? SchemaId : schema;
            ProviderId = providerId ?? "";
            ProviderKind = providerKind ?? "";
            Title = title ?? "";
            Version = version;
            UpdatedAtUtc = updatedAtUtc ?? "";
            Surface = surface ?? throw new ArgumentNullException(nameof(surface));
            Commands = commands ?? Array.Empty<EveCommandTemplate>();
        }

        [Key(0)]
        public string Type { get; }

        [Key(1)]
        public string Schema { get; }

        [Key(2)]
        public string ProviderId { get; }

        [Key(3)]
        public string ProviderKind { get; }

        [Key(4)]
        public string Title { get; }

        [Key(5)]
        public long Version { get; }

        [Key(6)]
        public string UpdatedAtUtc { get; }

        [Key(7)]
        public EveSurfaceTree Surface { get; }

        [Key(8)]
        public IReadOnlyList<EveCommandTemplate> Commands { get; }
    }

    [MessagePackObject]
    public sealed class EveSurfaceTree
    {
        [SerializationConstructor]
        public EveSurfaceTree(string id, EveSurfaceComponent root, IReadOnlyList<EveStyleToken> styles)
        {
            Id = id ?? "";
            Root = root ?? throw new ArgumentNullException(nameof(root));
            Styles = styles ?? Array.Empty<EveStyleToken>();
        }

        [Key(0)]
        public string Id { get; }

        [Key(1)]
        public EveSurfaceComponent Root { get; }

        [Key(2)]
        public IReadOnlyList<EveStyleToken> Styles { get; }
    }

    [MessagePackObject]
    public sealed class EveSurfaceComponent
    {
        public EveSurfaceComponent(
            string id,
            string kind,
            IReadOnlyDictionary<string, string> props,
            IReadOnlyList<EveSurfaceComponent> children)
            : this(id, kind, props, children, StateBindingsFromProps(props))
        {
        }

        public EveSurfaceComponent(
            string id,
            string kind,
            IReadOnlyDictionary<string, string> props,
            IReadOnlyList<EveSurfaceComponent> children,
            IReadOnlyList<CultMeshStateBindingDescriptor> stateBindings)
            : this(id, kind, props, children, stateBindings, Array.Empty<EveEmbeddedDocumentSlot>())
        {
        }

        public EveSurfaceComponent(
            string id,
            string kind,
            IReadOnlyDictionary<string, string> props,
            IReadOnlyList<EveSurfaceComponent> children,
            IReadOnlyList<CultMeshStateBindingDescriptor> stateBindings,
            IReadOnlyList<EveEmbeddedDocumentSlot> embeddedDocuments,
            IReadOnlyDictionary<string, string>? layout = null,
            IReadOnlyDictionary<string, string>? style = null)
            : this(
                id,
                kind,
                props,
                children,
                (stateBindings ?? Array.Empty<CultMeshStateBindingDescriptor>())
                    .Select(CultMeshStateBindingRecord.FromBinding)
                    .ToArray(),
                embeddedDocuments,
                layout,
                style)
        {
        }

        [SerializationConstructor]
        public EveSurfaceComponent(
            string id,
            string kind,
            IReadOnlyDictionary<string, string> props,
            IReadOnlyList<EveSurfaceComponent> children,
            CultMeshStateBindingRecord[] stateBindingRecords,
            IReadOnlyList<EveEmbeddedDocumentSlot> embeddedDocuments,
            IReadOnlyDictionary<string, string>? layout = null,
            IReadOnlyDictionary<string, string>? style = null)
        {
            Id = id ?? "";
            Kind = kind ?? "";
            Props = props ?? new Dictionary<string, string>(StringComparer.Ordinal);
            Children = children ?? Array.Empty<EveSurfaceComponent>();
            StateBindingRecords = stateBindingRecords ?? Array.Empty<CultMeshStateBindingRecord>();
            EmbeddedDocuments = embeddedDocuments ?? Array.Empty<EveEmbeddedDocumentSlot>();
            Layout = layout ?? new Dictionary<string, string>(StringComparer.Ordinal);
            Style = style ?? new Dictionary<string, string>(StringComparer.Ordinal);
        }

        [Key(0)]
        public string Id { get; }

        [Key(1)]
        public string Kind { get; }

        [Key(2)]
        public IReadOnlyDictionary<string, string> Props { get; }

        [Key(3)]
        public IReadOnlyList<EveSurfaceComponent> Children { get; }

        [Key(4)]
        public CultMeshStateBindingRecord[] StateBindingRecords { get; }

        [IgnoreMember]
        public IReadOnlyList<CultMeshStateBindingDescriptor> StateBindings =>
            StateBindingRecords.Select(record => record.ToBinding()).ToArray();

        [Key(5)]
        public IReadOnlyList<EveEmbeddedDocumentSlot> EmbeddedDocuments { get; }

        [Key(6)]
        public IReadOnlyDictionary<string, string> Layout { get; }

        [Key(7)]
        public IReadOnlyDictionary<string, string> Style { get; }

        public string GetProp(string key, string fallback = "")
        {
            return Props.TryGetValue(key, out var value) ? value : fallback;
        }

        private static IReadOnlyList<CultMeshStateBindingDescriptor> StateBindingsFromProps(
            IReadOnlyDictionary<string, string>? props)
        {
            if (props == null || props.Count == 0)
                return Array.Empty<CultMeshStateBindingDescriptor>();

            var bindings = new List<CultMeshStateBindingDescriptor>();
            foreach (var prop in props)
            {
                if (string.IsNullOrWhiteSpace(prop.Value) ||
                    !prop.Key.EndsWith("PointerId", StringComparison.Ordinal))
                {
                    continue;
                }

                var targetProp = prop.Key.Substring(0, prop.Key.Length - "PointerId".Length);
                if (targetProp.Length == 0)
                    targetProp = "value";
                bindings.Add(new CultMeshStateBindingDescriptor(targetProp, prop.Value));
            }

            return bindings;
        }
    }

    [MessagePackObject]
    public sealed class EveEmbeddedDocumentSlot
    {
        public EveEmbeddedDocumentSlot(
            string slotId,
            string documentId,
            string schemaId,
            string presentationKind,
            CultMeshRouteHint? routeHint = null)
            : this(slotId, documentId, schemaId, presentationKind, CultMeshRouteRecord.FromRoute(routeHint))
        {
        }

        [SerializationConstructor]
        public EveEmbeddedDocumentSlot(
            string slotId,
            string documentId,
            string schemaId,
            string presentationKind,
            CultMeshRouteRecord route)
        {
            SlotId = slotId ?? "";
            DocumentId = documentId ?? "";
            SchemaId = schemaId ?? "";
            PresentationKind = presentationKind ?? "";
            Route = route ?? CultMeshRouteRecord.FromRoute(CultMeshRouteHint.Automatic);
        }

        [Key(0)]
        public string SlotId { get; }

        [Key(1)]
        public string DocumentId { get; }

        [Key(2)]
        public string SchemaId { get; }

        [Key(3)]
        public string PresentationKind { get; }

        [Key(4)]
        public CultMeshRouteRecord Route { get; }

        [IgnoreMember]
        public CultMeshRouteHint RouteHint => Route.ToRoute();
    }

    [MessagePackObject]
    public sealed class EveStyleToken
    {
        [SerializationConstructor]
        public EveStyleToken(string name, string value)
        {
            Name = name ?? "";
            Value = value ?? "";
        }

        [Key(0)]
        public string Name { get; }

        [Key(1)]
        public string Value { get; }
    }

    [MessagePackObject]
    [MessagePackFormatter(typeof(EveCommandTemplateCompatibilityFormatter))]
    public sealed class EveCommandTemplate
    {
        public EveCommandTemplate(CultMeshOperationBindingDescriptor operation)
            : this(CultMeshOperationBindingRecord.FromBinding(operation))
        {
        }

        [SerializationConstructor]
        public EveCommandTemplate(CultMeshOperationBindingRecord operationRecord)
        {
            OperationRecord = operationRecord ?? throw new ArgumentNullException(nameof(operationRecord));
        }

        [Key(0)]
        public CultMeshOperationBindingRecord OperationRecord { get; }

        [IgnoreMember]
        public CultMeshOperationBindingDescriptor Operation => OperationRecord.ToBinding();

        [IgnoreMember]
        public string Command => Operation.OperationId;

        [IgnoreMember]
        public string Label => Operation.Label;

        [IgnoreMember]
        public string Transport => Operation.RouteHint.Description ?? "";
    }

    [CultDocument("gamecult.eve.command_invocation", SchemaId)]
    [MessagePackObject]
    public sealed class EveSurfaceCommandRequest
    {
        public const string SchemaId = "gamecult.eve.command_invocation.v1";

        public EveSurfaceCommandRequest(
            string providerId,
            string surfaceId,
            CultMeshOperationInvocationDescriptor operation,
            CultMeshOperationPayload payload,
            DateTimeOffset issuedAt,
            string clientId,
            string commandBoundary = "",
            string receiptSchema = "")
            : this(
                SchemaId,
                providerId,
                surfaceId,
                CultMeshOperationInvocationRecord.FromInvocation(operation),
                payload?.ToDictionary(entry => entry.Key, entry => entry.Value, StringComparer.Ordinal)
                    ?? new Dictionary<string, string>(StringComparer.Ordinal),
                issuedAt,
                clientId,
                commandBoundary,
                receiptSchema)
        {
        }

        [SerializationConstructor]
        public EveSurfaceCommandRequest(
            string schema,
            string providerId,
            string surfaceId,
            CultMeshOperationInvocationRecord operation,
            Dictionary<string, string> payload,
            DateTimeOffset issuedAt,
            string clientId,
            string commandBoundary,
            string receiptSchema)
        {
            Schema = string.IsNullOrWhiteSpace(schema) ? SchemaId : schema;
            ProviderId = providerId;
            SurfaceId = surfaceId;
            OperationRecord = operation ?? throw new ArgumentNullException(nameof(operation));
            PayloadFields = payload == null
                ? new Dictionary<string, string>(StringComparer.Ordinal)
                : new Dictionary<string, string>(payload, StringComparer.Ordinal);
            IssuedAt = issuedAt;
            ClientId = clientId;
            CommandBoundary = commandBoundary ?? "";
            ReceiptSchema = receiptSchema ?? "";
        }

        [Key(0)]
        public string Schema { get; }

        [Key(1)]
        public string ProviderId { get; }

        [Key(2)]
        public string SurfaceId { get; }

        [Key(3)]
        public CultMeshOperationInvocationRecord OperationRecord { get; }

        [IgnoreMember]
        public CultMeshOperationInvocationDescriptor Operation => OperationRecord.ToInvocation();

        [IgnoreMember]
        public string Command => Operation.OperationId;

        [Key(4)]
        public Dictionary<string, string> PayloadFields { get; }

        [IgnoreMember]
        public CultMeshOperationPayload Payload => new CultMeshOperationPayload(PayloadFields);

        [Key(5)]
        public DateTimeOffset IssuedAt { get; }

        [Key(6)]
        public string ClientId { get; }

        [Key(7)]
        public string CommandBoundary { get; }

        [Key(8)]
        public string ReceiptSchema { get; }

        [IgnoreMember]
        public string CommandId => Operation.IdempotencyKey ?? "";
    }

    /// <summary>
    /// Reads the current Eve surface envelope and the original seven-field v1 envelope.
    /// </summary>
    public sealed class EveSurfaceDocumentCompatibilityFormatter : IMessagePackFormatter<EveSurfaceDocument?>
    {
        private const int LegacyFieldCount = 7;
        private const int CurrentFieldCount = 9;

        public void Serialize(ref MessagePackWriter writer, EveSurfaceDocument? value, MessagePackSerializerOptions options)
        {
            if (value == null) { writer.WriteNil(); return; }
            writer.WriteMapHeader(CurrentFieldCount);
            Write(ref writer, "type", value.Type);
            Write(ref writer, "schema", value.Schema);
            Write(ref writer, "providerId", value.ProviderId);
            Write(ref writer, "providerKind", value.ProviderKind);
            Write(ref writer, "title", value.Title);
            writer.Write("version"); writer.Write(value.Version);
            Write(ref writer, "updatedAtUtc", value.UpdatedAtUtc);
            writer.Write("surface"); WriteSurface(ref writer, value.Surface, options);
            writer.Write("commands");
            writer.WriteArrayHeader(value.Commands.Count);
            foreach (var command in value.Commands)
                Formatter<EveCommandTemplate>(options).Serialize(ref writer, command, options);
        }

        public EveSurfaceDocument? Deserialize(ref MessagePackReader reader, MessagePackSerializerOptions options)
        {
            if (reader.TryReadNil()) return null;
            if (reader.NextMessagePackType == MessagePackType.Map)
                return ReadMap(ref reader, options);
            if (reader.NextMessagePackType != MessagePackType.Array)
                throw new MessagePackSerializationException("Eve surface document must be a map or legacy array.");

            options.Security.DepthStep(ref reader);
            try
            {
                var fields = reader.ReadArrayHeader();
                if (fields == LegacyFieldCount)
                {
                    return new EveSurfaceDocument(
                        ReadString(ref reader), ReadString(ref reader), ReadString(ref reader),
                        reader.ReadInt64(), ReadString(ref reader),
                        Formatter<EveSurfaceTree>(options).Deserialize(ref reader, options)!,
                        Formatter<IReadOnlyList<EveCommandTemplate>>(options).Deserialize(ref reader, options)
                            ?? Array.Empty<EveCommandTemplate>());
                }

                var type = ReadString(ref reader, fields, 0);
                var schema = ReadString(ref reader, fields, 1);
                var providerId = ReadString(ref reader, fields, 2);
                var providerKind = ReadString(ref reader, fields, 3);
                var title = ReadString(ref reader, fields, 4);
                var version = fields > 5 ? reader.ReadInt64() : 0;
                var updatedAtUtc = ReadString(ref reader, fields, 6);
                var surface = fields > 7 ? Formatter<EveSurfaceTree>(options).Deserialize(ref reader, options) : null;
                var commands = fields > 8 ? Formatter<IReadOnlyList<EveCommandTemplate>>(options).Deserialize(ref reader, options) : null;
                for (var index = CurrentFieldCount; index < fields; index++) reader.Skip();
                return new EveSurfaceDocument(
                    type, schema, providerId, providerKind, title, version, updatedAtUtc,
                    surface ?? throw new MessagePackSerializationException("Eve surface tree is required."),
                    commands ?? Array.Empty<EveCommandTemplate>());
            }
            finally { reader.Depth--; }
        }

        private static EveSurfaceDocument ReadMap(ref MessagePackReader reader, MessagePackSerializerOptions options)
        {
            options.Security.DepthStep(ref reader);
            try
            {
                var type = EveSurfaceDocument.DefaultType;
                var schema = EveSurfaceDocument.SchemaId;
                var providerId = "";
                var providerKind = "";
                var title = "";
                long version = 0;
                var updatedAtUtc = "";
                EveSurfaceTree? surface = null;
                IReadOnlyList<EveCommandTemplate> commands = Array.Empty<EveCommandTemplate>();
                var fields = reader.ReadMapHeader();
                for (var index = 0; index < fields; index++)
                {
                    switch (reader.ReadString())
                    {
                        case "type": type = ReadString(ref reader); break;
                        case "schema": schema = ReadString(ref reader); break;
                        case "providerId": providerId = ReadString(ref reader); break;
                        case "providerKind": providerKind = ReadString(ref reader); break;
                        case "title": title = ReadString(ref reader); break;
                        case "version": version = reader.ReadInt64(); break;
                        case "updatedAt":
                        case "updatedAtUtc": updatedAtUtc = ReadString(ref reader); break;
                        case "surface": surface = ReadSurface(ref reader, options); break;
                        case "commands": commands = ReadCommands(ref reader, options); break;
                        default: reader.Skip(); break;
                    }
                }

                return new EveSurfaceDocument(
                    type, schema, providerId, providerKind, title, version, updatedAtUtc,
                    surface ?? throw new MessagePackSerializationException("Eve surface tree is required."),
                    commands);
            }
            finally { reader.Depth--; }
        }

        private static void WriteSurface(
            ref MessagePackWriter writer,
            EveSurfaceTree surface,
            MessagePackSerializerOptions options)
        {
            writer.WriteMapHeader(3);
            Write(ref writer, "id", surface.Id);
            writer.Write("root"); WriteComponent(ref writer, surface.Root, options);
            writer.Write("styles");
            writer.WriteArrayHeader(surface.Styles.Count);
            foreach (var style in surface.Styles)
            {
                writer.WriteMapHeader(2);
                Write(ref writer, "name", style.Name);
                Write(ref writer, "value", style.Value);
            }
        }

        private static EveSurfaceTree ReadSurface(
            ref MessagePackReader reader,
            MessagePackSerializerOptions options)
        {
            if (reader.NextMessagePackType == MessagePackType.Array)
                return Formatter<EveSurfaceTree>(options).Deserialize(ref reader, options)!;
            options.Security.DepthStep(ref reader);
            try
            {
                var fields = reader.ReadMapHeader();
                var id = "";
                EveSurfaceComponent? root = null;
                IReadOnlyList<EveStyleToken> styles = Array.Empty<EveStyleToken>();
                for (var index = 0; index < fields; index++)
                {
                    switch (reader.ReadString())
                    {
                        case "id": id = ReadString(ref reader); break;
                        case "root": root = ReadComponent(ref reader, options); break;
                        case "styles": styles = ReadStyles(ref reader); break;
                        default: reader.Skip(); break;
                    }
                }
                return new EveSurfaceTree(
                    id,
                    root ?? throw new MessagePackSerializationException("Eve surface root is required."),
                    styles);
            }
            finally { reader.Depth--; }
        }

        private static void WriteComponent(
            ref MessagePackWriter writer,
            EveSurfaceComponent component,
            MessagePackSerializerOptions options)
        {
            writer.WriteMapHeader(8);
            Write(ref writer, "id", component.Id);
            Write(ref writer, "kind", component.Kind);
            writer.Write("props"); WriteStringMap(ref writer, component.Props);
            writer.Write("children");
            writer.WriteArrayHeader(component.Children.Count);
            foreach (var child in component.Children) WriteComponent(ref writer, child, options);
            writer.Write("stateBindings");
            writer.WriteArrayHeader(component.StateBindingRecords.Length);
            foreach (var binding in component.StateBindingRecords) WriteStateBinding(ref writer, binding);
            writer.Write("embeddedDocuments");
            writer.WriteArrayHeader(component.EmbeddedDocuments.Count);
            foreach (var embedded in component.EmbeddedDocuments) WriteEmbedded(ref writer, embedded);
            writer.Write("layout"); WriteStringMap(ref writer, component.Layout);
            writer.Write("style"); WriteStringMap(ref writer, component.Style);
        }

        private static EveSurfaceComponent ReadComponent(
            ref MessagePackReader reader,
            MessagePackSerializerOptions options)
        {
            if (reader.NextMessagePackType == MessagePackType.Array)
                return Formatter<EveSurfaceComponent>(options).Deserialize(ref reader, options)!;
            options.Security.DepthStep(ref reader);
            try
            {
                var fields = reader.ReadMapHeader();
                var id = "";
                var kind = "";
                IReadOnlyDictionary<string, string> props = new Dictionary<string, string>();
                IReadOnlyList<EveSurfaceComponent> children = Array.Empty<EveSurfaceComponent>();
                CultMeshStateBindingRecord[] stateBindings = Array.Empty<CultMeshStateBindingRecord>();
                IReadOnlyList<EveEmbeddedDocumentSlot> embedded = Array.Empty<EveEmbeddedDocumentSlot>();
                IReadOnlyDictionary<string, string> layout = new Dictionary<string, string>();
                IReadOnlyDictionary<string, string> style = new Dictionary<string, string>();
                for (var index = 0; index < fields; index++)
                {
                    switch (reader.ReadString())
                    {
                        case "id": id = ReadString(ref reader); break;
                        case "kind": kind = ReadString(ref reader); break;
                        case "props": props = ReadStringMap(ref reader); break;
                        case "children": children = ReadComponents(ref reader, options); break;
                        case "stateBindings": stateBindings = ReadStateBindings(ref reader); break;
                        case "embeddedDocuments": embedded = ReadEmbeddedDocuments(ref reader); break;
                        case "layout": layout = ReadStringMap(ref reader); break;
                        case "style": style = ReadStringMap(ref reader); break;
                        default: reader.Skip(); break;
                    }
                }
                return new EveSurfaceComponent(id, kind, props, children, stateBindings, embedded, layout, style);
            }
            finally { reader.Depth--; }
        }

        private static void WriteStateBinding(ref MessagePackWriter writer, CultMeshStateBindingRecord binding)
        {
            writer.WriteMapHeader(6);
            Write(ref writer, "targetProp", binding.TargetProp);
            Write(ref writer, "pointerId", binding.PointerId);
            Write(ref writer, "sourceId", binding.SourceId);
            Write(ref writer, "schemaId", binding.SchemaId);
            Write(ref writer, "routeKind", binding.RouteKind);
            Write(ref writer, "routeDescription", binding.RouteDescription);
        }

        private static CultMeshStateBindingRecord[] ReadStateBindings(ref MessagePackReader reader)
        {
            var count = reader.ReadArrayHeader();
            var values = new CultMeshStateBindingRecord[count];
            for (var index = 0; index < count; index++)
            {
                var fields = reader.ReadMapHeader();
                var targetProp = ""; var pointerId = ""; var sourceId = "";
                var schemaId = ""; var routeKind = ""; var routeDescription = "";
                for (var field = 0; field < fields; field++)
                {
                    switch (reader.ReadString())
                    {
                        case "targetProp": targetProp = ReadString(ref reader); break;
                        case "pointerId": pointerId = ReadString(ref reader); break;
                        case "sourceId": sourceId = ReadString(ref reader); break;
                        case "schemaId": schemaId = ReadString(ref reader); break;
                        case "routeKind": routeKind = ReadString(ref reader); break;
                        case "routeDescription": routeDescription = ReadString(ref reader); break;
                        default: reader.Skip(); break;
                    }
                }
                values[index] = new CultMeshStateBindingRecord(
                    targetProp, pointerId, sourceId, schemaId, routeKind, routeDescription);
            }
            return values;
        }

        private static void WriteEmbedded(ref MessagePackWriter writer, EveEmbeddedDocumentSlot embedded)
        {
            writer.WriteMapHeader(5);
            Write(ref writer, "slotId", embedded.SlotId);
            Write(ref writer, "documentId", embedded.DocumentId);
            Write(ref writer, "schemaId", embedded.SchemaId);
            Write(ref writer, "presentationKind", embedded.PresentationKind);
            writer.Write("routeHint");
            writer.WriteMapHeader(2);
            Write(ref writer, "kind", embedded.Route.Kind);
            Write(ref writer, "description", embedded.Route.Description);
        }

        private static IReadOnlyList<EveEmbeddedDocumentSlot> ReadEmbeddedDocuments(ref MessagePackReader reader)
        {
            var count = reader.ReadArrayHeader();
            var values = new EveEmbeddedDocumentSlot[count];
            for (var index = 0; index < count; index++)
            {
                var fields = reader.ReadMapHeader();
                var slotId = ""; var documentId = ""; var schemaId = ""; var presentationKind = "";
                var route = new CultMeshRouteRecord();
                for (var field = 0; field < fields; field++)
                {
                    switch (reader.ReadString())
                    {
                        case "slotId": slotId = ReadString(ref reader); break;
                        case "documentId": documentId = ReadString(ref reader); break;
                        case "schemaId": schemaId = ReadString(ref reader); break;
                        case "presentationKind": presentationKind = ReadString(ref reader); break;
                        case "routeHint": route = ReadRoute(ref reader); break;
                        default: reader.Skip(); break;
                    }
                }
                values[index] = new EveEmbeddedDocumentSlot(slotId, documentId, schemaId, presentationKind, route);
            }
            return values;
        }

        private static CultMeshRouteRecord ReadRoute(ref MessagePackReader reader)
        {
            if (reader.NextMessagePackType == MessagePackType.String)
                return new CultMeshRouteRecord(ReadString(ref reader), "");
            var fields = reader.ReadMapHeader();
            var kind = ""; var description = "";
            for (var index = 0; index < fields; index++)
            {
                switch (reader.ReadString())
                {
                    case "kind": kind = ReadString(ref reader); break;
                    case "description": description = ReadString(ref reader); break;
                    default: reader.Skip(); break;
                }
            }
            return new CultMeshRouteRecord(kind, description);
        }

        private static IReadOnlyList<EveSurfaceComponent> ReadComponents(
            ref MessagePackReader reader,
            MessagePackSerializerOptions options)
        {
            var count = reader.ReadArrayHeader();
            var values = new EveSurfaceComponent[count];
            for (var index = 0; index < count; index++) values[index] = ReadComponent(ref reader, options);
            return values;
        }

        private static IReadOnlyList<EveStyleToken> ReadStyles(ref MessagePackReader reader)
        {
            var count = reader.ReadArrayHeader();
            var values = new EveStyleToken[count];
            for (var index = 0; index < count; index++)
            {
                var fields = reader.ReadMapHeader();
                var name = ""; var value = "";
                for (var field = 0; field < fields; field++)
                {
                    switch (reader.ReadString())
                    {
                        case "name": name = ReadString(ref reader); break;
                        case "value": value = ReadString(ref reader); break;
                        default: reader.Skip(); break;
                    }
                }
                values[index] = new EveStyleToken(name, value);
            }
            return values;
        }

        private static IReadOnlyList<EveCommandTemplate> ReadCommands(
            ref MessagePackReader reader,
            MessagePackSerializerOptions options)
        {
            var count = reader.ReadArrayHeader();
            var values = new EveCommandTemplate[count];
            for (var index = 0; index < count; index++)
                values[index] = Formatter<EveCommandTemplate>(options).Deserialize(ref reader, options)!;
            return values;
        }

        private static void WriteStringMap(
            ref MessagePackWriter writer,
            IReadOnlyDictionary<string, string> values)
        {
            writer.WriteMapHeader(values.Count);
            foreach (var pair in values) Write(ref writer, pair.Key, pair.Value);
        }

        private static IReadOnlyDictionary<string, string> ReadStringMap(ref MessagePackReader reader)
        {
            var count = reader.ReadMapHeader();
            var values = new Dictionary<string, string>(count, StringComparer.Ordinal);
            for (var index = 0; index < count; index++) values[ReadString(ref reader)] = ReadString(ref reader);
            return values;
        }

        private static void Write(ref MessagePackWriter writer, string key, string value)
        {
            writer.Write(key);
            writer.Write(value);
        }

        private static IMessagePackFormatter<T> Formatter<T>(MessagePackSerializerOptions options) =>
            options.Resolver.GetFormatter<T>()
            ?? throw new MessagePackSerializationException($"No formatter is registered for {typeof(T).FullName}.");

        private static string ReadString(ref MessagePackReader reader) => reader.ReadString() ?? "";
        private static string ReadString(ref MessagePackReader reader, int fields, int index) =>
            index < fields ? ReadString(ref reader) : "";
    }

    /// <summary>
    /// Reads both direct legacy command fields and the current wrapped binding record.
    /// </summary>
    public sealed class EveCommandTemplateCompatibilityFormatter : IMessagePackFormatter<EveCommandTemplate?>
    {
        public void Serialize(ref MessagePackWriter writer, EveCommandTemplate? value, MessagePackSerializerOptions options)
        {
            if (value == null) { writer.WriteNil(); return; }
            writer.WriteMapHeader(7);
            Write(ref writer, "schema", "gamecult.eve.command.v1");
            Write(ref writer, "command", value.OperationRecord.OperationId);
            Write(ref writer, "label", value.OperationRecord.Label);
            Write(ref writer, "payloadSchema", value.OperationRecord.SchemaId);
            Write(ref writer, "transport", value.OperationRecord.RouteKind);
            Write(ref writer, "routeKind", value.OperationRecord.RouteKind);
            Write(ref writer, "routeDescription", value.OperationRecord.RouteDescription);
        }

        public EveCommandTemplate? Deserialize(ref MessagePackReader reader, MessagePackSerializerOptions options)
        {
            if (reader.TryReadNil()) return null;
            if (reader.NextMessagePackType == MessagePackType.Map)
                return ReadMap(ref reader);
            if (reader.NextMessagePackType != MessagePackType.Array)
                throw new MessagePackSerializationException("Eve command template must be a map or legacy array.");

            options.Security.DepthStep(ref reader);
            try
            {
                var fields = reader.ReadArrayHeader();
                if (fields == 1 && reader.NextMessagePackType == MessagePackType.Array)
                {
                    return new EveCommandTemplate(
                        BindingFormatter(options).Deserialize(ref reader, options)
                        ?? new CultMeshOperationBindingRecord());
                }

                var operationId = ReadString(ref reader, fields, 0);
                var label = ReadString(ref reader, fields, 1);
                var schemaId = ReadString(ref reader, fields, 2);
                var routeKind = ReadString(ref reader, fields, 3);
                var routeDescription = ReadString(ref reader, fields, 4);
                for (var index = 5; index < fields; index++) reader.Skip();
                return new EveCommandTemplate(new CultMeshOperationBindingRecord(
                    operationId, label, schemaId, routeKind, routeDescription));
            }
            finally { reader.Depth--; }
        }

        private static EveCommandTemplate ReadMap(ref MessagePackReader reader)
        {
            var fields = reader.ReadMapHeader();
            var operationId = ""; var label = ""; var schemaId = "";
            var transport = ""; var routeKind = ""; var routeDescription = "";
            for (var index = 0; index < fields; index++)
            {
                switch (reader.ReadString())
                {
                    case "command":
                    case "operationId": operationId = ReadString(ref reader); break;
                    case "label": label = ReadString(ref reader); break;
                    case "payloadSchema":
                    case "schemaId": schemaId = ReadString(ref reader); break;
                    case "transport": transport = ReadString(ref reader); break;
                    case "routeKind": routeKind = ReadString(ref reader); break;
                    case "routeDescription": routeDescription = ReadString(ref reader); break;
                    default: reader.Skip(); break;
                }
            }
            return new EveCommandTemplate(new CultMeshOperationBindingRecord(
                operationId, label, schemaId,
                string.IsNullOrWhiteSpace(routeKind) ? transport : routeKind,
                routeDescription));
        }

        private static IMessagePackFormatter<CultMeshOperationBindingRecord> BindingFormatter(
            MessagePackSerializerOptions options) =>
            options.Resolver.GetFormatter<CultMeshOperationBindingRecord>()
            ?? throw new MessagePackSerializationException("No CultMesh operation binding formatter is registered.");

        private static string ReadString(ref MessagePackReader reader, int fields, int index) =>
            index < fields ? reader.ReadString() ?? "" : "";

        private static string ReadString(ref MessagePackReader reader) => reader.ReadString() ?? "";

        private static void Write(ref MessagePackWriter writer, string key, string value)
        {
            writer.Write(key);
            writer.Write(value);
        }
    }

}
