using System;
using System.Collections.Generic;
using UnityEngine;

#nullable enable

namespace GameCult.Eve.UnityScene
{
    public sealed class EveUnityPlayableWorldAssetManifest
    {
        private readonly Dictionary<string, EveUnityPlayableWorldAssetManifestEntry> _byAssetRef =
            new Dictionary<string, EveUnityPlayableWorldAssetManifestEntry>(StringComparer.Ordinal);
        private readonly Dictionary<string, EveUnityPlayableWorldAssetManifestEntry> _byEntityKind =
            new Dictionary<string, EveUnityPlayableWorldAssetManifestEntry>(StringComparer.Ordinal);

        public EveUnityPlayableWorldAssetManifest(
            string manifestRef,
            IReadOnlyList<EveUnityPlayableWorldAssetManifestEntry> entries)
        {
            ManifestRef = manifestRef ?? "";
            Entries = entries ?? Array.Empty<EveUnityPlayableWorldAssetManifestEntry>();

            foreach (var entry in Entries)
            {
                if (entry == null)
                    continue;
                if (!string.IsNullOrWhiteSpace(entry.AssetRef))
                    _byAssetRef[entry.AssetRef] = entry;
                if (!string.IsNullOrWhiteSpace(entry.EntityKind))
                    _byEntityKind[entry.EntityKind] = entry;
            }
        }

        public string ManifestRef { get; }

        public IReadOnlyList<EveUnityPlayableWorldAssetManifestEntry> Entries { get; }

        public EveUnityPlayableWorldAssetManifestEntry? Find(EveUnityPlayableWorldAssetBinding asset)
        {
            if (asset == null) throw new ArgumentNullException(nameof(asset));

            EveUnityPlayableWorldAssetManifestEntry entry;
            if (!string.IsNullOrWhiteSpace(asset.AssetRef) && _byAssetRef.TryGetValue(asset.AssetRef, out entry))
                return entry;
            if (!string.IsNullOrWhiteSpace(asset.EntityKind) && _byEntityKind.TryGetValue(asset.EntityKind, out entry))
                return entry;
            return null;
        }
    }

    public sealed class EveUnityPlayableWorldAssetManifestEntry
    {
        public EveUnityPlayableWorldAssetManifestEntry(
            string assetRef,
            string entityKind,
            string resourcesPath,
            string prefabKey,
            string presentationKind = "provider-asset-ref")
        {
            AssetRef = assetRef ?? "";
            EntityKind = entityKind ?? "";
            ResourcesPath = NormalizeResourcesPath(resourcesPath);
            PrefabKey = prefabKey ?? "";
            PresentationKind = presentationKind ?? "";
        }

        public string AssetRef { get; }

        public string EntityKind { get; }

        public string ResourcesPath { get; }

        public string PrefabKey { get; }

        public string PresentationKind { get; }

        public static string NormalizeResourcesPath(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                return "";

            var normalized = path.Trim();
            foreach (var prefix in new[] { "resources://", "resource://", "Resources/" })
            {
                if (normalized.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    normalized = normalized.Substring(prefix.Length);
                    break;
                }
            }

            if (normalized.EndsWith(".prefab", StringComparison.OrdinalIgnoreCase))
                normalized = normalized.Substring(0, normalized.Length - ".prefab".Length);

            return normalized;
        }
    }

    public sealed class EveUnityManifestGameObjectAssetProvider : IEveUnityGameObjectAssetProvider
    {
        private readonly EveUnityPlayableWorldAssetManifest _manifest;
        private readonly IEveUnityGameObjectAssetProvider? _fallback;

        public EveUnityManifestGameObjectAssetProvider(
            EveUnityPlayableWorldAssetManifest manifest,
            IEveUnityGameObjectAssetProvider? fallback = null)
        {
            _manifest = manifest ?? throw new ArgumentNullException(nameof(manifest));
            _fallback = fallback;
        }

        public string ManifestRef => _manifest.ManifestRef;

        public GameObject? ResolvePrefab(EveUnityPlayableWorldAssetBinding asset)
        {
            if (asset == null) throw new ArgumentNullException(nameof(asset));

            var entry = _manifest.Find(asset);
            if (entry != null && !string.IsNullOrWhiteSpace(entry.ResourcesPath))
            {
                var prefab = Resources.Load<GameObject>(entry.ResourcesPath);
                if (prefab != null)
                    return prefab;
            }

            return _fallback?.ResolvePrefab(asset);
        }
    }
}
