export function createHermodrProviderTargets(catalog) {
  const providers = new Map((catalog?.providers || [])
    .map(provider => [provider.id || provider.providerId, provider])
    .filter(([providerId]) => providerId));

  return (catalog?.surfaces || [])
    .filter(surface => surface?.providerId && surface?.surfaceId)
    .map(surface => {
      const provider = providers.get(surface.providerId) || {};
      const advertisedSurface = (provider.surfaces || [])
        .find(candidate => candidate.surfaceId === surface.surfaceId) || {};
      const surfaceId = surface.surfaceId;
      const surfaceKind = surface.surfaceKind || advertisedSurface.surfaceKind || "";
      return {
        ...provider,
        providerId: surface.providerId,
        targetId: `${surface.providerId}::${surfaceId}`,
        title: surface.title || advertisedSurface.title || provider.title || surfaceId,
        kind: provider.kind || "eve.provider",
        freshness: { state: "odin-visible-cultmesh" },
        surfaces: [{
          ...advertisedSurface,
          transport: "hermodr-surface",
          surfaceId,
          surfaceKind,
          url: `/hermodr/surface/${encodeURIComponent(surface.providerId)}?surfaceId=${encodeURIComponent(surfaceId)}`,
        }],
      };
    });
}

export function selectInitialProviderTarget(targets, requestedId = "", preferredSurfaceKind = "interactive-world") {
  const available = Array.isArray(targets) ? targets : [];
  return available.find(target =>
    target.targetId === requestedId ||
    target.providerId === requestedId ||
    target.surfaces?.some(surface => surface.surfaceId === requestedId) ||
    target.aliases?.includes(requestedId))
    || available.find(target => target.surfaces?.some(surface => surface.surfaceKind === preferredSurfaceKind))
    || available[0];
}
