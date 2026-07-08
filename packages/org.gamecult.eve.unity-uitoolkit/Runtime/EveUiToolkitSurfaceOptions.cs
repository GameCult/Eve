using System;
using GameCult.Eve.Surface;

#nullable enable

namespace GameCult.Eve.UnityUIToolkit
{
    public sealed class EveUiToolkitSurfaceOptions
    {
        public static EveUiToolkitSurfaceOptions Default { get; } = new EveUiToolkitSurfaceOptions();

        public EveUiToolkitSurfaceOptions(
            Func<EveEmbeddedDocumentSlot, EveSurfaceDocument?>? embeddedDocumentResolver = null)
        {
            EmbeddedDocumentResolver = embeddedDocumentResolver;
        }

        public Func<EveEmbeddedDocumentSlot, EveSurfaceDocument?>? EmbeddedDocumentResolver { get; }
    }
}
