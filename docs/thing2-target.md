# Thing 2.0 target

Campaign `thing2` in the eureka mind. This page holds the rationale and the
design truths the rebuild produces. The typed `thing2:target` holds the
invariants, the not-in-scope list and the canonical implementations; the
rulings are in the mind and are cited here by id, never restated.

## Why

Thing 1 handed layout to each host's own engine (CSS flexbox in the browser,
Flutter widgets, Unity UI Toolkit's Yoga), so there were as many layout specs
as renderers and the browser was the oracle in practice. Its contract grew
domain kinds (`inventory.grid`, `vn.stage`, 41 kinds in the fixtures) that every
lowerer in five languages had to implement. Parity was screenshots and gap
ledgers, not geometry. Live state binding, pointer resolution and command
results lived in each renderer, which is where the July failures came from
(views that had to reload, failing commands, schema-rejected results). Evidence:
`docs/research/thing2-foundation-prior-art.md`.

Operator, 2026-10-10: "More Things, fewer things."

- **More Things:** every surface is a composition of Things, published as Thing
  Script. An inventory grid, a VN stage or an Odin wall is a composition, not a
  contract kind.
- **Fewer things:** a small closed primitive set, one layout solver, one closed
  render-command list, thin backends, far fewer repos.

## Shape

```
typed retained document (Thing Script, bound to typed CultMesh state)
  -> Thing core: Taffy layout, Parley text, focus, editing/IME state, AccessKit tree
  -> closed render-command list (+ accessibility tree)
  -> thin backends: draw, and bridge input/IME/accessibility to the platform
```

Rulings in force: `thing:ruling:thing2-one-solver-taffy`,
`thing:ruling:thing2-thing-owns-text`, `thing:ruling:wire-rename-freeze-fold`,
`thing:ruling:operator-compat-rebuild`, `thing:ruling:hold-renames-for-thing2`.
Text, IME and accessibility evidence:
`docs/research/thing2-text-input-a11y-prior-art.md`.

## The consumer contract

Consumers (provider daemons, Verse daemons, CultLib runtimes, game hosts) never
see Taffy, Parley or render commands. They depend on four things only:

1. **Thing Script** — the typed documents they publish: primitives plus shared
   compositions.
2. **Binding** — how a surface points at typed CultMesh state and receives
   live updates.
3. **Commands** — how input returns as a typed command with a schema-checked
   result.
4. **Advertisement** — how a provider announces itself to Odin.

Each waiting consumer migrates by one port cut onto this contract, which also
carries its rename to `gamecult.thing.*` (rename table T and edge table E1-E7 in
`docs/thing-campaign.md`). The consumer census sizes the floor of Thing Script;
Thing is a general library, so capability a reasonable consumer would expect is
not cut for lack of a current caller.

## Open before any cut is mapped

- The identity, lifecycle and authority table for every persistent kind
  (model page in the prose map).
- The consumer census: what each waiting consumer publishes, binds and commands
  today.
- Where Thing 2.0's code lives (a fork, to be put with prior art).
- Which backend lands first for cutover: at minimum web, plus TUI for agents.
