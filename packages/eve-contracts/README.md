# @gamecult/eve-contracts

Canonical TypeScript types and runtime validators for Eve provider boundaries.
The generated sources come from the JSON Schemas in `../../schemas`; run
`npm run generate` after changing an authoritative schema. `npm test` rejects
schema drift.

```ts
import {
  parseEveProviderAdvertisement,
  parseEveSurfaceDocument,
  parseEveCommandInvocation,
  parseEveInputCapability,
} from "@gamecult/eve-contracts";

const provider = parseEveProviderAdvertisement(untrustedAdvertisement);
const surface = parseEveSurfaceDocument(untrustedSurface);
const command = parseEveCommandInvocation(untrustedCommand);
const input = parseEveInputCapability(untrustedInputCapability);
```

Providers own their state, surfaces, command acceptance, and receipts. This
package owns only the portable contract and validation boundary.

## MessagePack wire shape

The JSON Schemas also name the public MessagePack shape: contracts are encoded
as maps with the schema's camel-case member names. They are not positional
arrays. `GameCult.Eve.Surface` emits that map shape and may read the former
indexed-array encoding only as migration input.

The checked `test/fixtures/eve-surface-csharp-v1.base64` payload is emitted by
the real C# formatter. The C# suite rejects formatter drift from that fixture;
the TypeScript suite decodes the same bytes and validates the resulting surface.
Do not replace this proof with a handwritten TypeScript facsimile of the C# DTO.
