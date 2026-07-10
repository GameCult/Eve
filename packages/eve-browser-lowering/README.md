# @gamecult/eve-browser-lowering

Browser DOM/CSS lowering for `gamecult.eve.surface.v1` documents.

This package owns the shared browser renderer contract:

- `renderEveSurface(surface, host, options)` lowers an Eve surface document into a DOM host.
- `renderEveComponent(component, options)` lowers a single component tree.
- `applyEveSurfaceStyles(styles, body)` maps portable Eve style tokens to CSS custom properties.
- `createEveCommandIntent(commandId, props, options)` creates the browser command envelope for host daemons and carries the provider-advertised `commandBoundary` / `receiptSchema` when the active surface exposes `worldInteraction`.
- `EveBrowserProviderHost` owns advertisement-backed surface selection and uses one provider-neutral embedded-document resolver; provider schema dispatch stays behind the host transport boundary.

Host applications own transport and command delivery. Providers own command acceptance and receipts through their advertisements. For example, Eir resolves surfaces through Odin/CultMesh and posts commands to `/eir/command`; Aetheria resolves surfaces through Electron IPC. Neither host should duplicate DOM lowering or import provider internals to find a command route.

Asset references are left as-is unless the host provides `assetUrlResolver`. Eir uses that hook only for CultMesh/CultCache asset URIs such as `cultmesh://schema/record` or `cultcache://schema/record`; ordinary HTTPS assets and web fonts remain ordinary browser URLs.
