using System;
using System.Collections.Generic;
using GameCult.Eve.Surface;
using GameCult.Mesh;

#nullable enable

namespace GameCult.Eve.UnityScene
{
    public sealed class EveUnitySceneSurfaceLowerer
    {
        private static readonly SaiVisualNovelUnitySceneProjectionAdapter SaiVisualNovelAdapter = new SaiVisualNovelUnitySceneProjectionAdapter();
        private static readonly NornGraphUnitySceneProjectionAdapter NornGraphAdapter = new NornGraphUnitySceneProjectionAdapter();

        public EveUnitySceneProjection Lower(
            EveSurfaceDocument document,
            EveUnitySceneProviderSurfaceAdvertisement advertisedSurface)
        {
            if (document == null) throw new ArgumentNullException(nameof(document));
            if (advertisedSurface == null) throw new ArgumentNullException(nameof(advertisedSurface));
            if (!string.Equals(document.Surface.Id, advertisedSurface.SurfaceId, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"Active surface '{document.Surface.Id}' does not match advertised Unity scene surface '{advertisedSurface.SurfaceId}'.");
            }

            return new EveUnitySceneProjection(
                document.ProviderId,
                document.Surface.Id,
                advertisedSurface.WorldInteraction.ProjectionKind,
                advertisedSurface.WorldInteraction.CommandBoundary,
                advertisedSurface.WorldInteraction.ReceiptSchema,
                advertisedSurface.WorldInteraction.Ownership,
                BuildSceneGraph(document.Surface.Root));
        }

        public EveSurfaceCommandRequest CreateCommandIntent(
            EveSurfaceDocument document,
            EveUnitySceneProviderSurfaceAdvertisement advertisedSurface,
            string command,
            IReadOnlyDictionary<string, string>? payload = null,
            DateTimeOffset? issuedAt = null)
        {
            if (document == null) throw new ArgumentNullException(nameof(document));
            if (advertisedSurface == null) throw new ArgumentNullException(nameof(advertisedSurface));
            if (string.IsNullOrWhiteSpace(command)) throw new ArgumentException("Command is required.", nameof(command));

            var projection = Lower(document, advertisedSurface);
            return new EveSurfaceCommandRequest(
                projection.ProviderId,
                projection.SurfaceId,
                ResolveOperation(document, command),
                CultMesh.OperationPayload(payload ?? new Dictionary<string, string>(StringComparer.Ordinal)),
                issuedAt ?? DateTimeOffset.UtcNow,
                "unity-scene",
                projection.CommandBoundary,
                projection.ReceiptSchema);
        }

        private static CultMeshOperationInvocationDescriptor ResolveOperation(
            EveSurfaceDocument document,
            string command)
        {
            foreach (var template in document.Commands)
            {
                if (string.Equals(template.Command, command, StringComparison.Ordinal))
                    return CultMesh.OperationInvocation(template.Operation);
            }

            return CultMesh.OperationInvocation(command);
        }

        private static EveUnitySceneNode BuildSceneGraph(EveSurfaceComponent component)
        {
            var children = new List<EveUnitySceneNode>(component.Children.Count);
            foreach (var child in component.Children)
            {
                children.Add(BuildSceneGraph(child));
            }

            return new EveUnitySceneNode(
                component.Id,
                component.Kind,
                SceneObjectKind(component.Kind),
                component.Props,
                component.Layout,
                component.Style,
                component.StateBindings.Count,
                component.EmbeddedDocuments.Count,
                BuildEmbeddedDocumentSlots(component.EmbeddedDocuments),
                BuildPluginProjection(component),
                children);
        }

        private static EveUnityScenePluginProjection? BuildPluginProjection(EveSurfaceComponent component)
        {
            if (SaiVisualNovelAdapter.CanProject(component))
                return SaiVisualNovelAdapter.Project(component);
            if (NornGraphAdapter.CanProject(component))
                return NornGraphAdapter.Project(component);
            return null;
        }

        private static IReadOnlyList<EveUnitySceneEmbeddedDocumentSlot> BuildEmbeddedDocumentSlots(
            IReadOnlyList<EveEmbeddedDocumentSlot> embeddedDocuments)
        {
            var slots = new List<EveUnitySceneEmbeddedDocumentSlot>(embeddedDocuments.Count);
            foreach (var slot in embeddedDocuments)
            {
                slots.Add(new EveUnitySceneEmbeddedDocumentSlot(
                    slot.SlotId,
                    slot.DocumentId,
                    slot.SchemaId,
                    slot.PresentationKind));
            }
            return slots;
        }

        private static string SceneObjectKind(string componentKind)
        {
            if (string.IsNullOrWhiteSpace(componentKind))
                return "empty";
            if (string.Equals(componentKind, "vn.stage", StringComparison.Ordinal))
                return "sai-vn-scene-stage";
            if (string.Equals(componentKind, "panel.dialogue", StringComparison.Ordinal) ||
                string.Equals(componentKind, "text.dialogue", StringComparison.Ordinal))
                return "sai-vn-scene-dialogue";
            if (string.Equals(componentKind, "rail.actions", StringComparison.Ordinal))
                return "sai-vn-scene-action-rail";
            if (componentKind.StartsWith("control.", StringComparison.Ordinal))
                return "command-control";
            if (string.Equals(componentKind, "embed.norn", StringComparison.Ordinal))
                return "norn-graph-scene-projection";
            if (componentKind.StartsWith("embed.", StringComparison.Ordinal))
                return "plugin-placeholder";
            if (string.Equals(componentKind, "surface.slot", StringComparison.Ordinal))
                return "embedded-surface-slot";
            if (componentKind.StartsWith("world.", StringComparison.Ordinal))
                return "world-projection-node";
            if (componentKind.StartsWith("text.", StringComparison.Ordinal) || string.Equals(componentKind, "label", StringComparison.Ordinal))
                return "scene-label";
            return "scene-node";
        }
    }

    public sealed class EveUnitySceneProjection
    {
        public EveUnitySceneProjection(
            string providerId,
            string surfaceId,
            string projectionKind,
            string commandBoundary,
            string receiptSchema,
            string ownership,
            EveUnitySceneNode root)
        {
            ProviderId = providerId ?? "";
            SurfaceId = surfaceId ?? "";
            ProjectionKind = projectionKind ?? "";
            CommandBoundary = commandBoundary ?? "";
            ReceiptSchema = receiptSchema ?? "";
            Ownership = ownership ?? "";
            Root = root ?? throw new ArgumentNullException(nameof(root));
        }

        public string ProviderId { get; }

        public string SurfaceId { get; }

        public string ProjectionKind { get; }

        public string CommandBoundary { get; }

        public string ReceiptSchema { get; }

        public string Ownership { get; }

        public EveUnitySceneNode Root { get; }
    }

    public sealed class EveUnitySceneNode
    {
        public EveUnitySceneNode(
            string id,
            string componentKind,
            string sceneObjectKind,
            IReadOnlyDictionary<string, string> props,
            IReadOnlyDictionary<string, string> layout,
            IReadOnlyDictionary<string, string> style,
            int stateBindingCount,
            int embeddedDocumentCount,
            IReadOnlyList<EveUnitySceneEmbeddedDocumentSlot> embeddedDocuments,
            EveUnityScenePluginProjection? pluginProjection,
            IReadOnlyList<EveUnitySceneNode> children)
        {
            Id = id ?? "";
            ComponentKind = componentKind ?? "";
            SceneObjectKind = sceneObjectKind ?? "";
            Props = props ?? new Dictionary<string, string>(StringComparer.Ordinal);
            Layout = layout ?? new Dictionary<string, string>(StringComparer.Ordinal);
            Style = style ?? new Dictionary<string, string>(StringComparer.Ordinal);
            StateBindingCount = stateBindingCount;
            EmbeddedDocumentCount = embeddedDocumentCount;
            EmbeddedDocuments = embeddedDocuments ?? Array.Empty<EveUnitySceneEmbeddedDocumentSlot>();
            PluginProjection = pluginProjection;
            Children = children ?? Array.Empty<EveUnitySceneNode>();
        }

        public string Id { get; }

        public string ComponentKind { get; }

        public string SceneObjectKind { get; }

        public IReadOnlyDictionary<string, string> Props { get; }

        public IReadOnlyDictionary<string, string> Layout { get; }

        public IReadOnlyDictionary<string, string> Style { get; }

        public int StateBindingCount { get; }

        public int EmbeddedDocumentCount { get; }

        public IReadOnlyList<EveUnitySceneEmbeddedDocumentSlot> EmbeddedDocuments { get; }

        public EveUnityScenePluginProjection? PluginProjection { get; }

        public IReadOnlyList<EveUnitySceneNode> Children { get; }
    }

    public sealed class EveUnityScenePluginProjection
    {
        public EveUnityScenePluginProjection(
            string pluginId,
            string projectionKind,
            string abiSchema,
            string commandBoundary,
            IReadOnlyList<string> capabilities,
            string command,
            string documentId,
            string semanticOwner)
        {
            PluginId = pluginId ?? "";
            ProjectionKind = projectionKind ?? "";
            AbiSchema = abiSchema ?? "";
            CommandBoundary = commandBoundary ?? "";
            Capabilities = capabilities ?? Array.Empty<string>();
            Command = command ?? "";
            DocumentId = documentId ?? "";
            SemanticOwner = semanticOwner ?? "";
        }

        public string PluginId { get; }

        public string ProjectionKind { get; }

        public string AbiSchema { get; }

        public string CommandBoundary { get; }

        public IReadOnlyList<string> Capabilities { get; }

        public string Command { get; }

        public string DocumentId { get; }

        public string SemanticOwner { get; }
    }

    public sealed class EveUnitySceneEmbeddedDocumentSlot
    {
        public EveUnitySceneEmbeddedDocumentSlot(
            string slotId,
            string documentId,
            string schemaId,
            string presentationKind)
        {
            SlotId = slotId ?? "";
            DocumentId = documentId ?? "";
            SchemaId = schemaId ?? "";
            PresentationKind = presentationKind ?? "";
        }

        public string SlotId { get; }

        public string DocumentId { get; }

        public string SchemaId { get; }

        public string PresentationKind { get; }
    }

    public sealed class EveUnitySceneProviderSurfaceAdvertisement
    {
        public EveUnitySceneProviderSurfaceAdvertisement(
            string surfaceId,
            string surfaceKind,
            EveUnitySceneWorldInteraction worldInteraction)
        {
            SurfaceId = surfaceId ?? "";
            SurfaceKind = surfaceKind ?? "";
            WorldInteraction = worldInteraction ?? throw new ArgumentNullException(nameof(worldInteraction));
        }

        public string SurfaceId { get; }

        public string SurfaceKind { get; }

        public EveUnitySceneWorldInteraction WorldInteraction { get; }
    }

    public sealed class EveUnitySceneWorldInteraction
    {
        public EveUnitySceneWorldInteraction(
            string projectionKind,
            string commandBoundary,
            string receiptSchema,
            string ownership)
        {
            ProjectionKind = projectionKind ?? "";
            CommandBoundary = commandBoundary ?? "";
            ReceiptSchema = receiptSchema ?? "";
            Ownership = ownership ?? "";
        }

        public string ProjectionKind { get; }

        public string CommandBoundary { get; }

        public string ReceiptSchema { get; }

        public string Ownership { get; }
    }
}
