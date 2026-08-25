# @gamecult/eve-browser-lowering

Browser DOM/CSS lowering for `gamecult.eve.surface.v1` documents.

This package owns the shared browser renderer contract:

- `renderEveSurface(surface, host, options)` lowers an Eve surface document into a DOM host.
- `renderEveComponent(component, options)` lowers a single component tree.
- `applyEveSurfaceStyles(styles, body)` maps portable Eve style tokens to CSS custom properties.
- `createEveCommandIntent(commandId, props, options)` emits the canonical `gamecult.eve.command_invocation.v1` operation descriptor, including the provider-advertised command boundary and receipt schema, a source-version route hint, and a fresh idempotency key.
- `EveBrowserProviderHost` owns advertisement-backed surface selection and uses one provider-neutral embedded-document resolver; provider schema dispatch stays behind the host transport boundary.
- Editable string, textarea, number, select, and choice controls use named Eve state bindings. The renderer preserves edited drafts by provider/surface/binding identity; untouched controls contribute their authored value when an operation captures those bindings atomically under `payload.bindings`.
- `gamecult.eve.command_result.v1` carries the persisted receipt, an optional one-time Eve projection, a binding-clear directive, and at most one plugin-scoped payload. Only the matching plugin adapter may consume that payload. The renderer-owned receipt region survives the authoritative surface refresh that follows the command.
- `resource.download` lowers a provider-issued resource grant to an accessible download link. The reference browser accepts only same-origin HTTP(S) or root-relative URLs and sanitizes the suggested filename; the provider remains responsible for authorization, expiry, single-use semantics, and resource bytes.

Host applications own transport and command delivery. Providers own command acceptance and receipts through their advertisements. For example, Eir resolves surfaces through Odin/CultMesh and posts commands to `/eir/command`; Aetheria resolves surfaces through Electron IPC. Neither host should duplicate DOM lowering or import provider internals to find a command route.

An HTML `<form>` may be used internally for keyboard behavior, but it is not an Eve primitive or state owner. Eve exposes editable bindings and typed operations; HTML remains a lowering detail.

Asset references are left as-is unless the host provides `assetUrlResolver`. Eir uses that hook only for CultMesh/CultCache asset URIs such as `cultmesh://schema/record` or `cultcache://schema/record`; ordinary HTTPS assets and web fonts remain ordinary browser URLs.
