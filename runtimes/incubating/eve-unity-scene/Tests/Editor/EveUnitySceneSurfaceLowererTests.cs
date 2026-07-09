using System;
using System.Collections.Generic;
using GameCult.Eve.Surface;
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
                        Array.Empty<EveSurfaceComponent>()),
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
