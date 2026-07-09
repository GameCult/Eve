using System;
using System.Collections.Generic;
using GameCult.Eve.Surface;
using GameCult.Mesh;

#nullable enable

namespace GameCult.Eve.UnityScene
{
    public sealed class EveUnitySceneSurfaceLowerer
    {
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
                advertisedSurface.WorldInteraction.Ownership);
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
    }

    public sealed class EveUnitySceneProjection
    {
        public EveUnitySceneProjection(
            string providerId,
            string surfaceId,
            string projectionKind,
            string commandBoundary,
            string receiptSchema,
            string ownership)
        {
            ProviderId = providerId ?? "";
            SurfaceId = surfaceId ?? "";
            ProjectionKind = projectionKind ?? "";
            CommandBoundary = commandBoundary ?? "";
            ReceiptSchema = receiptSchema ?? "";
            Ownership = ownership ?? "";
        }

        public string ProviderId { get; }

        public string SurfaceId { get; }

        public string ProjectionKind { get; }

        public string CommandBoundary { get; }

        public string ReceiptSchema { get; }

        public string Ownership { get; }
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
