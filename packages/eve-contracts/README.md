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
} from "@gamecult/eve-contracts";

const provider = parseEveProviderAdvertisement(untrustedAdvertisement);
const surface = parseEveSurfaceDocument(untrustedSurface);
const command = parseEveCommandInvocation(untrustedCommand);
```

Providers own their state, surfaces, command acceptance, and receipts. This
package owns only the portable contract and validation boundary.
