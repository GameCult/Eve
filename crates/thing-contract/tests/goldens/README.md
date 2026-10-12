# thing-contract goldens

Written only by `crates/thing-contract/tests/goldens.rs`, with `THING_BLESS=1` set on that test.
Every other run compares byte for byte. The TypeScript and C# packages and core decode these files
and are held to the answers below; none of them writes one.

Each `.bin` is the payload of one record: the positional slot array of its kind, as MessagePack.
A union value is `[armKey, [armSlots...]]`; a unit arm is `[key, []]`. An optional member is nil
when absent. Arm keys are fixed for v1.

## Values (decode to the constructed value, re-encode to the same bytes)

| File | Kind | Decodes to |
|---|---|---|
| `surface-all-arms.bin` | `gamecult.thing.surface.v1` | One surface with all 13 node arms (Box 0, Text 1, Image 2, Button 3, Toggle 4, Slider 5, TextInput 6 as both input kinds, Text 0 and Number 1, Select 7, Repeat 8, Overlay 9, Plot 10, Embed 11, Use 12), a Box chain four levels deep, every text, number and bool source arm, every Format arm, both state sources, both member steps, every dimension and colour arm, and two declared commands |
| `composition-all-params.bin` | `gamecult.thing.composition.v1` | A composition with one parameter of each of the 7 kinds, whose body uses a composition with one argument of each of the 7 argument arms |
| `invocation-all-inputs.bin` | `gamecult.thing.command_invocation.v1` | An invocation with a payload record of bin bytes and one captured input of each of the 4 input arms |
| `result-pending.bin` | `gamecult.thing.command_result.v1` | Outcome Pending, seq 1 |
| `result-completed.bin` | same | Outcome Completed with source version 8, drafts cleared, no effect |
| `result-completed-open-surface.bin` | same | Completed with no source version and the OpenSurface effect |
| `result-completed-open-external.bin` | same | Completed with the OpenExternal effect and a resume command |
| `result-denied.bin` | same | Denied naming a node |
| `result-denied-no-node.bin` | same | Denied with a nil node |
| `result-failed.bin` | same | Failed |
| `asset-catalog.bin` | `gamecult.thing.asset_catalog.v1` | Two assets |
| `surface.cc` | single-file store | One record of each of the five kinds, written under the pinned clock `2026-01-01T00:00:00Z`; reading it and writing it again gives the same bytes |

## Refusals and tolerance

| File | Payload | Expected |
|---|---|---|
| `result-thing1-flat.bin` | a MessagePack map with named members, the shape a Thing 1 provider wrote for a command result | refused when stored as a command result; the error names the kind and the record key and never a value |
| `node-unknown-arm.bin` | a surface whose root node has arm key 13, which Node does not declare | refused; the error names the kind and the record key, and decoded directly it names the union Node and the key 13, and never a value |
| `outcome-unknown-arm.bin` | a result whose outcome has arm key 4, which Outcome does not declare | refused in the same way, naming the union Outcome and the key 4 |
| `result-extra-slot.bin` | a Pending result with a fourth slot past the last one declared | read: it decodes to the Pending result with seq 1 (CultLib's extra-trailing-slots ruling: read, never written back) |
| `result-seq-zero.bin` | a result whose seq slot is 0 | refused; the error names the kind and the record key, decoded directly it names Seq, and never a value |
| `surface-version-negative.bin` | a surface whose version slot is -1 | refused in the same way, naming Version |
| `surface-label-dotted.bin` | a surface whose label is `b.c` | refused in the same way, naming Segment: a label holds no dot, so a record key splits at its last dot |
| `asset-extent-negative.bin` | an asset catalog whose first asset has width -5 | refused in the same way, naming Count |
| `rgba-channel-out-of-range.bin` | the Rgba slot array `[256, 0, 0, 255]` | refused when decoded as an Rgba: a channel is a byte, 0 to 255 |

Domain refusals are the contract's rule, which the TypeScript and C# packages mirror: each is held to refuse these files, without the leaf set a Rust `u8` or a checked newtype has.
