using System;
using System.Collections.Generic;
using System.Linq;
using GameCult.Eve.Surface;

#nullable enable

namespace GameCult.Eve.UnityUIToolkit
{
    public sealed class EveUiToolkitSurfaceOptions
    {
        public static EveUiToolkitSurfaceOptions Default { get; } = new EveUiToolkitSurfaceOptions();

        public EveUiToolkitSurfaceOptions(
            Func<EveEmbeddedDocumentSlot, EveSurfaceDocument?>? embeddedDocumentResolver = null,
            IReadOnlyList<IEveUiToolkitPluginHost>? pluginHosts = null)
        {
            EmbeddedDocumentResolver = embeddedDocumentResolver;
            PluginHosts = pluginHosts ?? new IEveUiToolkitPluginHost[]
            {
                new SaiVisualNovelUiToolkitPluginHost(),
                new NornGraphUiToolkitPluginHost()
            };
        }

        public Func<EveEmbeddedDocumentSlot, EveSurfaceDocument?>? EmbeddedDocumentResolver { get; }

        public IReadOnlyList<IEveUiToolkitPluginHost> PluginHosts { get; }

        public IEveUiToolkitPluginHost? FindPluginHost(EveSurfaceComponent component)
        {
            return PluginHosts.FirstOrDefault(host => host.CanLower(component));
        }
    }
}
