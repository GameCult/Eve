using System;
using System.Collections.Generic;
using GameCult.Caching;
using GameCult.Mesh;
using MessagePack;

#nullable enable

namespace GameCult.Eve.Surface
{
    [CultDocument("gamecult.eve.surface", "gamecult.eve.surface.v1")]
    [MessagePackObject]
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

        [SerializationConstructor]
        public EveSurfaceComponent(
            string id,
            string kind,
            IReadOnlyDictionary<string, string> props,
            IReadOnlyList<EveSurfaceComponent> children,
            IReadOnlyList<CultMeshStateBindingDescriptor> stateBindings,
            IReadOnlyList<EveEmbeddedDocumentSlot> embeddedDocuments,
            IReadOnlyDictionary<string, string>? layout = null,
            IReadOnlyDictionary<string, string>? style = null)
        {
            Id = id ?? "";
            Kind = kind ?? "";
            Props = props ?? new Dictionary<string, string>(StringComparer.Ordinal);
            Children = children ?? Array.Empty<EveSurfaceComponent>();
            StateBindings = stateBindings ?? Array.Empty<CultMeshStateBindingDescriptor>();
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
        public IReadOnlyList<CultMeshStateBindingDescriptor> StateBindings { get; }

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
        [SerializationConstructor]
        public EveEmbeddedDocumentSlot(
            string slotId,
            string documentId,
            string schemaId,
            string presentationKind,
            CultMeshRouteHint? routeHint = null)
        {
            SlotId = slotId ?? "";
            DocumentId = documentId ?? "";
            SchemaId = schemaId ?? "";
            PresentationKind = presentationKind ?? "";
            RouteHint = routeHint ?? CultMeshRouteHint.Automatic;
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
        public CultMeshRouteHint RouteHint { get; }
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
    public sealed class EveCommandTemplate
    {
        [SerializationConstructor]
        public EveCommandTemplate(CultMeshOperationBindingDescriptor operation)
        {
            Operation = operation ?? throw new ArgumentNullException(nameof(operation));
        }

        [Key(0)]
        public CultMeshOperationBindingDescriptor Operation { get; }

        [IgnoreMember]
        public string Command => Operation.OperationId;

        [IgnoreMember]
        public string Label => Operation.Label;

        [IgnoreMember]
        public string Transport => Operation.RouteHint.Description ?? "";
    }

    public sealed class EveSurfaceCommandRequest
    {
        public EveSurfaceCommandRequest(
            string providerId,
            string surfaceId,
            CultMeshOperationInvocationDescriptor operation,
            CultMeshOperationPayload payload,
            DateTimeOffset issuedAt,
            string clientId)
        {
            ProviderId = providerId;
            SurfaceId = surfaceId;
            Operation = operation ?? throw new ArgumentNullException(nameof(operation));
            Payload = payload ?? CultMeshOperationPayload.Empty;
            IssuedAt = issuedAt;
            ClientId = clientId;
        }

        public string ProviderId { get; }

        public string SurfaceId { get; }

        public CultMeshOperationInvocationDescriptor Operation { get; }

        public string Command => Operation.OperationId;

        public CultMeshOperationPayload Payload { get; }

        public DateTimeOffset IssuedAt { get; }

        public string ClientId { get; }
    }
}
