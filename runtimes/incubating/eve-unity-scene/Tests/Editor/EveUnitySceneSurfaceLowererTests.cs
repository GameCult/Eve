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
            var nornNode = projection.Root.Children[2];
            Assert.That(nornNode.SceneObjectKind, Is.EqualTo("norn-graph-scene-projection"));
            Assert.That(nornNode.EmbeddedDocumentCount, Is.EqualTo(1));
            Assert.That(nornNode.EmbeddedDocuments.Count, Is.EqualTo(1));
            Assert.That(nornNode.EmbeddedDocuments[0].SlotId, Is.EqualTo("norn.map"));
            Assert.That(nornNode.EmbeddedDocuments[0].DocumentId, Is.EqualTo("cultmesh://aetheria/norn/map"));
            Assert.That(nornNode.EmbeddedDocuments[0].SchemaId, Is.EqualTo("gamecult.eve.surface.v1"));
            Assert.That(nornNode.EmbeddedDocuments[0].PresentationKind, Is.EqualTo("scene-overlay"));
            Assert.That(nornNode.PluginProjection, Is.Not.Null);
            Assert.That(nornNode.PluginProjection!.PluginId, Is.EqualTo("norn.graph"));
            Assert.That(nornNode.PluginProjection.ProjectionKind, Is.EqualTo("norn-scene-embedded-graph-shell"));
            Assert.That(nornNode.PluginProjection.AbiSchema, Is.EqualTo("gamecult.eve.plugin_abi.v1"));
            Assert.That(nornNode.PluginProjection.CommandBoundary, Is.EqualTo("sidecar-advertised-plugin-abi"));
            Assert.That(nornNode.PluginProjection.Capabilities, Does.Contain("embed.norn"));
            Assert.That(nornNode.PluginProjection.Command, Is.EqualTo("graph.focus"));
            Assert.That(nornNode.PluginProjection.DocumentId, Is.EqualTo("cultmesh://aetheria/norn/map"));
            Assert.That(nornNode.PluginProjection.SemanticOwner, Is.EqualTo("Norn"));
        }

        [Test]
        public void SaiVisualNovelLowersThroughRuntimeProjectionAdapterWithoutOwningStoryState()
        {
            var lowerer = new EveUnitySceneSurfaceLowerer();
            var projection = lowerer.Lower(SaiDocument(), Advertisement("sai.visual_novel.surface"));

            Assert.That(projection.ProviderId, Is.EqualTo("gamecult.home.vn"));
            Assert.That(projection.SurfaceId, Is.EqualTo("sai.visual_novel.surface"));
            Assert.That(projection.Root.SceneObjectKind, Is.EqualTo("sai-vn-scene-stage"));
            Assert.That(projection.Root.PluginProjection, Is.Not.Null);
            Assert.That(projection.Root.PluginProjection!.PluginId, Is.EqualTo("sai.vn"));
            Assert.That(projection.Root.PluginProjection.ProjectionKind, Is.EqualTo("sai-vn-scene-stage-shell"));
            Assert.That(projection.Root.PluginProjection.AbiSchema, Is.EqualTo("gamecult.eve.plugin_abi.v1"));
            Assert.That(projection.Root.PluginProjection.CommandBoundary, Is.EqualTo("sidecar-advertised-plugin-abi"));
            Assert.That(projection.Root.PluginProjection.Capabilities, Does.Contain("vn.stage"));
            Assert.That(projection.Root.PluginProjection.Capabilities, Does.Contain("story.choose"));
            Assert.That(projection.Root.PluginProjection.DocumentId, Is.EqualTo("gamecult-compound"));
            Assert.That(projection.Root.PluginProjection.SemanticOwner, Is.EqualTo("Sai"));

            var dialogue = projection.Root.Children[0];
            Assert.That(dialogue.SceneObjectKind, Is.EqualTo("sai-vn-scene-dialogue"));
            Assert.That(dialogue.PluginProjection!.ProjectionKind, Is.EqualTo("sai-vn-scene-dialogue-shell"));
            Assert.That(dialogue.PluginProjection.SemanticOwner, Is.EqualTo("Sai"));

            var choice = projection.Root.Children[1].Children[0];
            Assert.That(choice.SceneObjectKind, Is.EqualTo("command-control"));
            Assert.That(choice.PluginProjection, Is.Not.Null);
            Assert.That(choice.PluginProjection!.PluginId, Is.EqualTo("sai.vn"));
            Assert.That(choice.PluginProjection.ProjectionKind, Is.EqualTo("sai-vn-scene-story-command-shell"));
            Assert.That(choice.PluginProjection.Command, Is.EqualTo("story.choose"));
            Assert.That(choice.PluginProjection.SemanticOwner, Is.EqualTo("Sai"));
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
                                new Dictionary<string, string>(StringComparer.Ordinal)
                                {
                                    ["graph.document"] = "cultmesh://aetheria/norn/map",
                                    ["interaction.nodeAction"] = "graph.focus"
                                },
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

        private static EveSurfaceDocument SaiDocument()
        {
            return new EveSurfaceDocument(
                "gamecult.home.vn",
                "sai.visual_novel",
                "GameCult Compound VN",
                1,
                "2026-07-09T00:00:00Z",
                new EveSurfaceTree(
                    "sai.visual_novel.surface",
                    new EveSurfaceComponent(
                        "sai.root",
                        "vn.stage",
                        new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["storyId"] = "gamecult-compound",
                            ["currentPath"] = "hub"
                        },
                        new[]
                        {
                            new EveSurfaceComponent(
                                "sai.dialogue",
                                "panel.dialogue",
                                new Dictionary<string, string>(StringComparer.Ordinal)
                                {
                                    ["speaker"] = "Void",
                                    ["text"] = "Pick a door."
                                },
                                Array.Empty<EveSurfaceComponent>()),
                            new EveSurfaceComponent(
                                "sai.choices",
                                "rail.actions",
                                new Dictionary<string, string>(StringComparer.Ordinal),
                                new[]
                                {
                                    new EveSurfaceComponent(
                                        "sai.choice.eve",
                                        "control.button",
                                        new Dictionary<string, string>(StringComparer.Ordinal)
                                        {
                                            ["label"] = "What is Eve?",
                                            ["action.command"] = "story.choose",
                                            ["targetPath"] = "eve"
                                        },
                                        Array.Empty<EveSurfaceComponent>())
                                })
                        }),
                    Array.Empty<EveStyleToken>()),
                new[]
                {
                    new EveCommandTemplate(CultMesh.OperationBinding("story.choose", "Choose"))
                });
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
