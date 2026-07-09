using System;
using System.Collections.Generic;
using GameCult.Eve.Surface;
using GameCult.Mesh;
using NUnit.Framework;

#nullable enable

namespace GameCult.Eve.UnityScene.Tests
{
    public sealed class EveUnitySceneSurfaceLowererTests
    {
        [Test]
        public void LowerCarriesProviderAdvertisedWorldBoundary()
        {
            var lowerer = new EveUnitySceneSurfaceLowerer();
            var projection = lowerer.Lower(Document("aetheria.daemon.game"), Advertisement("aetheria.daemon.game"));

            Assert.That(projection.ProviderId, Is.EqualTo("aetheria"));
            Assert.That(projection.SurfaceId, Is.EqualTo("aetheria.daemon.game"));
            Assert.That(projection.ProjectionKind, Is.EqualTo("provider-authored-world-surface"));
            Assert.That(projection.CommandBoundary, Is.EqualTo("aetheria.daemon.commands"));
            Assert.That(projection.ReceiptSchema, Is.EqualTo("aetheria.eve_command_acceptance_status.v1"));
            Assert.That(projection.Ownership, Is.EqualTo("provider-owns-world-state-assets-command-acceptance-and-receipts"));
            Assert.That(projection.Root.Id, Is.EqualTo("aetheria.daemon.game.root"));
            Assert.That(projection.Root.SceneObjectKind, Is.EqualTo("scene-node"));
        }

        [Test]
        public void LowerBuildsProviderAgnosticSceneGraphFromSurfaceTree()
        {
            var lowerer = new EveUnitySceneSurfaceLowerer();
            var projection = lowerer.Lower(Document("aetheria.daemon.game"), Advertisement("aetheria.daemon.game"));

            Assert.That(projection.Root.Children.Count, Is.EqualTo(3));
            Assert.That(projection.Root.Children[0].SceneObjectKind, Is.EqualTo("world-projection-node"));
            Assert.That(projection.Root.Children[0].Props["binding"], Is.EqualTo("cultmesh://aetheria/world/entities"));
            Assert.That(projection.Root.Children[0].StateBindingCount, Is.EqualTo(1));
            Assert.That(projection.Root.Children[1].SceneObjectKind, Is.EqualTo("command-control"));
            Assert.That(projection.Root.Children[1].Props["command"], Is.EqualTo("aetheria.daemon.focus"));
            Assert.That(projection.Root.Children[2].SceneObjectKind, Is.EqualTo("plugin-placeholder"));
            Assert.That(projection.Root.Children[2].EmbeddedDocumentCount, Is.EqualTo(1));
            Assert.That(projection.Root.Children[2].EmbeddedDocuments.Count, Is.EqualTo(1));
            Assert.That(projection.Root.Children[2].EmbeddedDocuments[0].SlotId, Is.EqualTo("norn.map"));
            Assert.That(projection.Root.Children[2].EmbeddedDocuments[0].DocumentId, Is.EqualTo("cultmesh://aetheria/norn/map"));
            Assert.That(projection.Root.Children[2].EmbeddedDocuments[0].SchemaId, Is.EqualTo("gamecult.eve.surface.v1"));
            Assert.That(projection.Root.Children[2].EmbeddedDocuments[0].PresentationKind, Is.EqualTo("scene-overlay"));
        }

        [Test]
        public void CommandIntentCarriesAdvertisedBoundaryWithoutOwningReceipts()
        {
            var lowerer = new EveUnitySceneSurfaceLowerer();
            var intent = lowerer.CreateCommandIntent(
                Document("aetheria.daemon.game"),
                Advertisement("aetheria.daemon.game"),
                "aetheria.daemon.commands",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["commandId"] = "aetheria.daemon.focus"
                },
                DateTimeOffset.Parse("2026-07-09T00:00:00Z"));

            Assert.That(intent.Schema, Is.EqualTo(EveSurfaceCommandRequest.SchemaId));
            Assert.That(intent.ProviderId, Is.EqualTo("aetheria"));
            Assert.That(intent.SurfaceId, Is.EqualTo("aetheria.daemon.game"));
            Assert.That(intent.Command, Is.EqualTo("aetheria.daemon.commands"));
            Assert.That(intent.ClientId, Is.EqualTo("unity-scene"));
            Assert.That(intent.CommandBoundary, Is.EqualTo("aetheria.daemon.commands"));
            Assert.That(intent.ReceiptSchema, Is.EqualTo("aetheria.eve_command_acceptance_status.v1"));
        }

        private static EveSurfaceDocument Document(string surfaceId)
        {
            return new EveSurfaceDocument(
                "aetheria",
                "game.provider",
                "Aetheria world",
                1,
                "2026-07-09T00:00:00Z",
                new EveSurfaceTree(
                    surfaceId,
                    new EveSurfaceComponent(
                        $"{surfaceId}.root",
                        "surface",
                        new Dictionary<string, string>(StringComparer.Ordinal),
                        new[]
                        {
                            new EveSurfaceComponent(
                                $"{surfaceId}.entities",
                                "world.entities",
                                new Dictionary<string, string>(StringComparer.Ordinal)
                                {
                                    ["binding"] = "cultmesh://aetheria/world/entities"
                                },
                                Array.Empty<EveSurfaceComponent>(),
                                new[]
                                {
                                    new CultMeshStateBindingDescriptor("entities", "cultmesh://aetheria/world/entities")
                                }),
                            new EveSurfaceComponent(
                                $"{surfaceId}.focus",
                                "control.button",
                                new Dictionary<string, string>(StringComparer.Ordinal)
                                {
                                    ["command"] = "aetheria.daemon.focus"
                                },
                                Array.Empty<EveSurfaceComponent>()),
                            new EveSurfaceComponent(
                                $"{surfaceId}.norn",
                                "embed.norn",
                                new Dictionary<string, string>(StringComparer.Ordinal),
                                Array.Empty<EveSurfaceComponent>(),
                                Array.Empty<CultMeshStateBindingDescriptor>(),
                                new[]
                                {
                                    new EveEmbeddedDocumentSlot(
                                        "norn.map",
                                        "cultmesh://aetheria/norn/map",
                                        "gamecult.eve.surface.v1",
                                        "scene-overlay")
                                })
                        }),
                    Array.Empty<EveStyleToken>()),
                Array.Empty<EveCommandTemplate>());
        }

        private static EveUnitySceneProviderSurfaceAdvertisement Advertisement(string surfaceId)
        {
            return new EveUnitySceneProviderSurfaceAdvertisement(
                surfaceId,
                "interactive-world",
                new EveUnitySceneWorldInteraction(
                    "provider-authored-world-surface",
                    "aetheria.daemon.commands",
                    "aetheria.eve_command_acceptance_status.v1",
                    "provider-owns-world-state-assets-command-acceptance-and-receipts"));
        }
    }
}
