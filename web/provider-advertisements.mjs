export function mergeProviderAdvertisement(catalogProvider, advertisement = undefined) {
  if (!advertisement || typeof advertisement !== "object") {
    return catalogProvider;
  }

  const catalogSurfaces = Array.isArray(catalogProvider?.surfaces) ? catalogProvider.surfaces : [];
  const advertisedSurfaces = Array.isArray(advertisement.surfaces) ? advertisement.surfaces : [];
  const surfaces = catalogSurfaces.length
    ? catalogSurfaces.map(surface => mergeProviderSurface(surface, advertisedSurfaces.find(candidate => candidate.surfaceId === surface.surfaceId)))
    : advertisedSurfaces;

  return {
    ...advertisement,
    ...catalogProvider,
    surfaces,
    localAdvertisement: advertisement,
  };
}

export function mergeProviderSurface(catalogSurface, advertisedSurface = undefined) {
  if (!advertisedSurface || typeof advertisedSurface !== "object") {
    return catalogSurface;
  }
  return {
    ...advertisedSurface,
    ...catalogSurface,
  };
}

export function findProviderCatalogEntry(catalog, requestedProviderId) {
  const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
  return providers.find(candidate =>
    candidate.providerId === requestedProviderId || candidate.aliases?.includes(requestedProviderId));
}
