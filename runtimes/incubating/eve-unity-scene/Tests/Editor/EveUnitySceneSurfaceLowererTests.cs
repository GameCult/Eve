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
        public void LowerExtractsPlayableArpgWorldFromGenericScene3dSurface()
        {
            var lowerer = new EveUnitySceneSurfaceLowerer();
            var projection = lowerer.Lower(PlayableArpgDocument(), Advertisement("aetheria.daemon.game"));

            Assert.That(projection.Root.Children[0].SceneObjectKind, Is.EqualTo("playable-world-root"));
            Assert.That(projection.Root.Children[0].Children[0].SceneObjectKind, Is.EqualTo("playable-world-entity"));
            Assert.That(projection.Root.Children[0].Children[3].SceneObjectKind, Is.EqualTo("world-field-3d"));
            Assert.That(projection.PlayableWorld, Is.Not.Null);
            Assert.That(projection.PlayableWorld!.WorldRootId, Is.EqualTo("aetheria.daemon.game.playable"));
            Assert.That(projection.PlayableWorld.StatePointerId, Is.EqualTo("cultmesh://aetheria/run/current"));
            Assert.That(projection.PlayableWorld.AssetManifest, Is.EqualTo("cultmesh://aetheria/assets/manifest"));
            Assert.That(projection.PlayableWorld.InputProfile, Is.EqualTo("arpg-third-person"));
            Assert.That(projection.PlayableWorld.CameraRig, Is.EqualTo("third-person-orbit"));
            Assert.That(projection.PlayableWorld.PlayerEntityId, Is.EqualTo("player-vanguard"));
            Assert.That(projection.PlayableWorld.MovementCommand, Is.EqualTo("aetheria.daemon.move_intent"));
            Assert.That(projection.PlayableWorld.FocusCommand, Is.EqualTo("aetheria.daemon.focus"));
            Assert.That(projection.PlayableWorld.TargetCommand, Is.EqualTo("aetheria.daemon.target"));
            Assert.That(projection.PlayableWorld.EntityCount, Is.EqualTo(3));

            var player = FindEntity(projection.PlayableWorld, "player-vanguard");
            Assert.That(player.EntityKind, Is.EqualTo("player"));
            Assert.That(player.AssetRef, Is.EqualTo("cultmesh://aetheria/assets/map/entity/player"));
            Assert.That(player.PositionX, Is.EqualTo(0f));
            Assert.That(player.PositionY, Is.EqualTo(0f));
            Assert.That(player.PositionZ, Is.EqualTo(0f));
            Assert.That(player.Controllable, Is.True);
            Assert.That(player.MoveCommand, Is.EqualTo("aetheria.daemon.move_intent"));

            var raider = FindEntity(projection.PlayableWorld, "raider-scout");
            Assert.That(raider.EntityKind, Is.EqualTo("enemy"));
            Assert.That(raider.PositionX, Is.EqualTo(9f));
            Assert.That(raider.PositionZ, Is.EqualTo(14f));
            Assert.That(raider.TargetCommand, Is.EqualTo("aetheria.daemon.target"));
        }

        [Test]
        public void GenericClientSessionConsumesAetheriaPlayableWorldSnapshotWithoutAetheriaTypes()
        {
            var session = new EveUnitySceneClientSession();
            var projection = session.Connect(new EveUnitySceneProviderSurfaceSnapshot(
                PlayableArpgDocument(),
                Advertisement("aetheria.daemon.game"),
                "cultmesh://aetheria/eve/surfaces/aetheria.daemon.game",
                42));

            Assert.That(session.ActiveSourcePointer, Is.EqualTo("cultmesh://aetheria/eve/surfaces/aetheria.daemon.game"));
            Assert.That(session.ActiveProjection, Is.SameAs(projection));
            Assert.That(projection.ProviderId, Is.EqualTo("aetheria"));
            Assert.That(projection.PlayableWorld, Is.Not.Null);
            Assert.That(projection.PlayableWorld!.InputProfile, Is.EqualTo("arpg-third-person"));
            Assert.That(projection.PlayableWorld.EntityCount, Is.EqualTo(3));

            var moveIntent = session.CreateMoveIntent(
                "player-vanguard",
                12f,
                0f,
                8f,
                DateTimeOffset.Parse("2026-07-09T00:00:00Z"));

            Assert.That(moveIntent.Schema, Is.EqualTo(EveSurfaceCommandRequest.SchemaId));
            Assert.That(moveIntent.ProviderId, Is.EqualTo("aetheria"));
            Assert.That(moveIntent.SurfaceId, Is.EqualTo("aetheria.daemon.game"));
            Assert.That(moveIntent.ClientId, Is.EqualTo("unity-scene"));
            Assert.That(moveIntent.Command, Is.EqualTo("aetheria.daemon.commands"));
            Assert.That(moveIntent.CommandBoundary, Is.EqualTo("aetheria.daemon.commands"));
            Assert.That(moveIntent.ReceiptSchema, Is.EqualTo("aetheria.eve_command_acceptance_status.v1"));

            var focusIntent = session.CreateFocusIntent("anchor-station");
            Assert.That(focusIntent.Command, Is.EqualTo("aetheria.daemon.commands"));
            Assert.That(focusIntent.CommandBoundary, Is.EqualTo("aetheria.daemon.commands"));
        }

        [Test]
        public void GenericProviderConnectionAppliesLiveSnapshotsAndSubmitsCommandsThroughSink()
        {
            var source = new FakeProviderSurfaceSource(
                "aetheria",
                "aetheria.daemon.game",
                "cultmesh://aetheria/eve/surfaces/aetheria.daemon.game",
                new EveUnitySceneProviderSurfaceSnapshot(
                    PlayableArpgDocument(),
                    Advertisement("aetheria.daemon.game"),
                    "cultmesh://aetheria/eve/surfaces/aetheria.daemon.game",
                    1));
            var sink = new FakeCommandSink("cultmesh-command-sink");
            using var connection = new EveUnitySceneProviderConnection(source, sink);

            var projectionUpdates = 0;
            connection.ProjectionUpdated += _ => projectionUpdates++;

            var initialProjection = connection.Connect();

            Assert.That(initialProjection.ProviderId, Is.EqualTo("aetheria"));
            Assert.That(connection.ProviderId, Is.EqualTo("aetheria"));
            Assert.That(connection.SurfaceId, Is.EqualTo("aetheria.daemon.game"));
            Assert.That(connection.SourcePointer, Is.EqualTo("cultmesh://aetheria/eve/surfaces/aetheria.daemon.game"));
            Assert.That(connection.ActiveVersion, Is.EqualTo(1));
            Assert.That(projectionUpdates, Is.EqualTo(1));

            source.Publish(new EveUnitySceneProviderSurfaceSnapshot(
                PlayableArpgDocument(),
                Advertisement("aetheria.daemon.game"),
                "cultmesh://aetheria/eve/surfaces/aetheria.daemon.game",
                2));

            Assert.That(connection.ActiveVersion, Is.EqualTo(2));
            Assert.That(connection.ActiveProjection, Is.Not.Null);
            Assert.That(connection.ActiveProjection!.PlayableWorld, Is.Not.Null);
            Assert.That(connection.ActiveProjection.PlayableWorld!.PlayerEntityId, Is.EqualTo("player-vanguard"));
            Assert.That(projectionUpdates, Is.EqualTo(2));

            var moveIntent = connection.SubmitMoveIntent(
                "player-vanguard",
                20f,
                0f,
                15f,
                DateTimeOffset.Parse("2026-07-09T00:00:00Z"));

            Assert.That(sink.SinkKind, Is.EqualTo("cultmesh-command-sink"));
            Assert.That(sink.Submitted.Count, Is.EqualTo(1));
            Assert.That(sink.Submitted[0], Is.SameAs(moveIntent));
            Assert.That(moveIntent.Schema, Is.EqualTo(EveSurfaceCommandRequest.SchemaId));
            Assert.That(moveIntent.ProviderId, Is.EqualTo("aetheria"));
            Assert.That(moveIntent.SurfaceId, Is.EqualTo("aetheria.daemon.game"));
            Assert.That(moveIntent.Command, Is.EqualTo("aetheria.daemon.commands"));
            Assert.That(moveIntent.CommandBoundary, Is.EqualTo("aetheria.daemon.commands"));
            Assert.That(moveIntent.ReceiptSchema, Is.EqualTo("aetheria.eve_command_acceptance_status.v1"));

            connection.Disconnect();
            source.Publish(new EveUnitySceneProviderSurfaceSnapshot(
                PlayableArpgDocument(),
                Advertisement("aetheria.daemon.game"),
                "cultmesh://aetheria/eve/surfaces/aetheria.daemon.game",
                3));

            Assert.That(connection.ActiveVersion, Is.EqualTo(2));
            Assert.That(projectionUpdates, Is.EqualTo(2));
        }

        [Test]
        public void PlayableWorldPresenterInstantiatesUpdatesAndDespawnsProviderEntities()
        {
            var lowerer = new EveUnitySceneSurfaceLowerer();
            var sink = new FakePlayableWorldSceneSink();
            var presenter = new EveUnityPlayableWorldPresenter(sink, new EveUnityAssetRefResolver());

            var firstProjection = lowerer.Lower(PlayableArpgDocument(), Advertisement("aetheria.daemon.game"));
            var firstPresentation = presenter.Apply(firstProjection);

            Assert.That(firstPresentation.WorldRootId, Is.EqualTo("aetheria.daemon.game.playable"));
            Assert.That(firstPresentation.PlayerEntityId, Is.EqualTo("player-vanguard"));
            Assert.That(firstPresentation.InputProfile, Is.EqualTo("arpg-third-person"));
            Assert.That(firstPresentation.CameraRig, Is.EqualTo("third-person-orbit"));
            Assert.That(firstPresentation.UpsertedEntities, Is.EqualTo(3));
            Assert.That(firstPresentation.RemovedEntities, Is.EqualTo(0));
            Assert.That(firstPresentation.ActiveEntities, Is.EqualTo(3));
            Assert.That(sink.ConfiguredWorlds.Count, Is.EqualTo(1));
            Assert.That(sink.Upserts.Count, Is.EqualTo(3));
            Assert.That(sink.Upserts[0].entity.EntityId, Is.EqualTo("player-vanguard"));
            Assert.That(sink.Upserts[0].entity.PositionX, Is.EqualTo(0f));
            Assert.That(sink.Upserts[0].asset.AssetRef, Is.EqualTo("cultmesh://aetheria/assets/map/entity/player"));
            Assert.That(sink.Upserts[0].asset.PresentationKind, Is.EqualTo("provider-asset-ref"));

            var secondProjection = lowerer.Lower(
                PlayableArpgDocument(includeRaider: false, playerPosition: "5,0,2"),
                Advertisement("aetheria.daemon.game"));
            var secondPresentation = presenter.Apply(secondProjection);

            Assert.That(secondPresentation.UpsertedEntities, Is.EqualTo(2));
            Assert.That(secondPresentation.RemovedEntities, Is.EqualTo(1));
            Assert.That(secondPresentation.ActiveEntities, Is.EqualTo(2));
            Assert.That(sink.ConfiguredWorlds.Count, Is.EqualTo(2));
            Assert.That(sink.RemovedEntityIds.Count, Is.EqualTo(1));
            Assert.That(sink.RemovedEntityIds[0], Is.EqualTo("raider-scout"));
            Assert.That(sink.Upserts[3].entity.EntityId, Is.EqualTo("player-vanguard"));
            Assert.That(sink.Upserts[3].entity.PositionX, Is.EqualTo(5f));
            Assert.That(sink.Upserts[3].entity.PositionZ, Is.EqualTo(2f));
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

            var tex = projection.Root.Children[2];
            Assert.That(tex.SceneObjectKind, Is.EqualTo("tex-math-scene-projection"));
            Assert.That(tex.PluginProjection, Is.Not.Null);
            Assert.That(tex.PluginProjection!.PluginId, Is.EqualTo("tex.math"));
            Assert.That(tex.PluginProjection.ProjectionKind, Is.EqualTo("tex-math-scene-block-fallback-shell"));
            Assert.That(tex.PluginProjection.Capabilities, Does.Contain("embed.tex"));
            Assert.That(tex.PluginProjection.Capabilities, Does.Contain("tex.scene-placement"));
            Assert.That(tex.PluginProjection.DocumentId, Is.EqualTo("\\\\mathrm{votes}(p)=1+\\\\lfloor\\\\log_b(1+p)\\\\rfloor"));
            Assert.That(tex.PluginProjection.SemanticOwner, Is.EqualTo("EvePlugins"));
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

        private static EveSurfaceDocument PlayableArpgDocument(
            bool includeRaider = true,
            string playerPosition = "0,0,0")
        {
            var playableChildren = new List<EveSurfaceComponent>
            {
                PlayableEntity(
                    "aetheria.daemon.game.entity.player",
                    "player-vanguard",
                    "player",
                    "Vanguard",
                    "player",
                    "cultmesh://aetheria/assets/map/entity/player",
                    playerPosition,
                    "35",
                    "1.15",
                    true,
                    true,
                    "aetheria.daemon.focus",
                    "aetheria.daemon.move_intent",
                    "",
                    "")
            };

            if (includeRaider)
            {
                playableChildren.Add(PlayableEntity(
                    "aetheria.daemon.game.entity.raider",
                    "raider-scout",
                    "enemy",
                    "Raider Scout",
                    "raider",
                    "cultmesh://aetheria/assets/map/entity/ship",
                    "9,0,14",
                    "220",
                    "0.9",
                    true,
                    false,
                    "",
                    "",
                    "aetheria.daemon.target",
                    ""));
            }

            playableChildren.Add(PlayableEntity(
                "aetheria.daemon.game.entity.station",
                "anchor-station",
                "station",
                "Anchor Station",
                "neutral",
                "cultmesh://aetheria/assets/map/entity/station",
                "-18,0,6",
                "0",
                "3.4",
                true,
                false,
                "aetheria.daemon.focus",
                "",
                "",
                ""));

            playableChildren.Add(new EveSurfaceComponent(
                "aetheria.daemon.game.flow",
                "field.vector3d",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["fieldId"] = "aetheria.zone.flow",
                    ["bind"] = "aetheria.daemon.soaView.flowField3d",
                    ["visualizer"] = "particles",
                    ["bounds"] = "-32,0,-32,32,24,32"
                },
                Array.Empty<EveSurfaceComponent>()));

            return new EveSurfaceDocument(
                "aetheria",
                "game.runtime",
                "Aetheria daemon game",
                1,
                "2026-07-09T00:00:00Z",
                new EveSurfaceTree(
                    "aetheria.daemon.game",
                    new EveSurfaceComponent(
                        "aetheria.daemon.game.root",
                        "surface",
                        new Dictionary<string, string>(StringComparer.Ordinal),
                        new[]
                        {
                            new EveSurfaceComponent(
                                "aetheria.daemon.game.playable",
                                "world.scene3d",
                                new Dictionary<string, string>(StringComparer.Ordinal)
                                {
                                    ["statePointerId"] = "cultmesh://aetheria/run/current",
                                    ["assetManifest"] = "cultmesh://aetheria/assets/manifest",
                                    ["inputProfile"] = "arpg-third-person",
                                    ["cameraRig"] = "third-person-orbit",
                                    ["playerEntityId"] = "player-vanguard",
                                    ["movementCommand"] = "aetheria.daemon.move_intent",
                                    ["focusCommand"] = "aetheria.daemon.focus",
                                    ["targetCommand"] = "aetheria.daemon.target",
                                    ["actionCommand"] = "aetheria.daemon.use_equipment"
                                },
                                playableChildren,
                                new[]
                                {
                                    new CultMeshStateBindingDescriptor("run", "cultmesh://aetheria/run/current"),
                                    new CultMeshStateBindingDescriptor("assets", "cultmesh://aetheria/assets/manifest")
                                })
                        }),
                    Array.Empty<EveStyleToken>()),
                new[]
                {
                    new EveCommandTemplate(CultMesh.OperationBinding("aetheria.daemon.commands", "Aetheria daemon commands"))
                });
        }

        private static EveSurfaceComponent PlayableEntity(
            string nodeId,
            string entityId,
            string entityKind,
            string label,
            string faction,
            string assetRef,
            string position,
            string rotationY,
            string radius,
            bool selectable,
            bool controllable,
            string focusCommand,
            string moveCommand,
            string targetCommand,
            string actionCommand)
        {
            return new EveSurfaceComponent(
                nodeId,
                "world.entity3d",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["entityId"] = entityId,
                    ["entityKind"] = entityKind,
                    ["label"] = label,
                    ["faction"] = faction,
                    ["assetRef"] = assetRef,
                    ["position"] = position,
                    ["rotationY"] = rotationY,
                    ["radius"] = radius,
                    ["selectable"] = selectable ? "true" : "false",
                    ["controllable"] = controllable ? "true" : "false",
                    ["focusCommand"] = focusCommand,
                    ["moveCommand"] = moveCommand,
                    ["targetCommand"] = targetCommand,
                    ["actionCommand"] = actionCommand
                },
                Array.Empty<EveSurfaceComponent>());
        }

        private static EveUnityPlayableWorldEntity FindEntity(
            EveUnityPlayableWorldProjection playableWorld,
            string entityId)
        {
            foreach (var entity in playableWorld.Entities)
            {
                if (string.Equals(entity.EntityId, entityId, StringComparison.Ordinal))
                    return entity;
            }
            throw new AssertionException($"Playable entity not found: {entityId}");
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
                                }),
                            new EveSurfaceComponent(
                                "sai.tex.log-power",
                                "embed.tex",
                                new Dictionary<string, string>(StringComparer.Ordinal)
                                {
                                    ["label"] = "Bifrost voting weight",
                                    ["source"] = "\\\\mathrm{votes}(p)=1+\\\\lfloor\\\\log_b(1+p)\\\\rfloor",
                                    ["format"] = "latex",
                                    ["display"] = "block"
                                },
                                Array.Empty<EveSurfaceComponent>())
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

        private sealed class FakeProviderSurfaceSource : IEveUnitySceneProviderSurfaceSource
        {
            public FakeProviderSurfaceSource(
                string providerId,
                string surfaceId,
                string sourcePointer,
                EveUnitySceneProviderSurfaceSnapshot currentSnapshot)
            {
                ProviderId = providerId;
                SurfaceId = surfaceId;
                SourcePointer = sourcePointer;
                CurrentSnapshot = currentSnapshot;
            }

            public string ProviderId { get; }

            public string SurfaceId { get; }

            public string SourcePointer { get; }

            public EveUnitySceneProviderSurfaceSnapshot CurrentSnapshot { get; private set; }

            public event Action<EveUnitySceneProviderSurfaceSnapshot>? SnapshotAvailable;

            public void Publish(EveUnitySceneProviderSurfaceSnapshot snapshot)
            {
                CurrentSnapshot = snapshot;
                SnapshotAvailable?.Invoke(snapshot);
            }
        }

        private sealed class FakeCommandSink : IEveUnitySceneCommandSink
        {
            public FakeCommandSink(string sinkKind)
            {
                SinkKind = sinkKind;
            }

            public string SinkKind { get; }

            public List<EveSurfaceCommandRequest> Submitted { get; } = new List<EveSurfaceCommandRequest>();

            public void Submit(EveSurfaceCommandRequest request)
            {
                Submitted.Add(request);
            }
        }

        private sealed class FakePlayableWorldSceneSink : IEveUnityPlayableWorldSceneSink
        {
            public List<EveUnityPlayableWorldProjection> ConfiguredWorlds { get; } = new List<EveUnityPlayableWorldProjection>();

            public List<(EveUnityPlayableWorldEntity entity, EveUnityPlayableWorldAssetBinding asset)> Upserts { get; } =
                new List<(EveUnityPlayableWorldEntity entity, EveUnityPlayableWorldAssetBinding asset)>();

            public List<string> RemovedEntityIds { get; } = new List<string>();

            public void ConfigureWorld(EveUnityPlayableWorldProjection world)
            {
                ConfiguredWorlds.Add(world);
            }

            public void UpsertEntity(EveUnityPlayableWorldEntity entity, EveUnityPlayableWorldAssetBinding asset)
            {
                Upserts.Add((entity, asset));
            }

            public void RemoveEntity(string entityId)
            {
                RemovedEntityIds.Add(entityId);
            }
        }
    }
}
