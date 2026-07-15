# Input capabilities

Providers publish semantic actions and suggested profiles. Clients own physical
device discovery, user bindings, exposed action-bar controls, gesture timing,
and override persistence.

Every binding maps one gesture to one semantic action. Direct controls,
keyboard chords, axes, and ordered gamepad D-pad sequences are gesture kinds,
not separate execution systems. The action bar is a compact editor over the
same binding document; its controls are chosen by the player.

Actions may be derived from live state such as equipped modules, weapon groups,
cargo consumables, role, docking state, or mode. A binding whose action is not
currently available remains dormant so it can recover when that semantic action
returns.

Actions that consume a live device value declare `inputValue`. The
`button-hold.v1` model writes `1` to the named payload key on press and `0` on
release. The `axis.v1` model writes the current normalized axis value. Clients
send changed values through the action's advertised operation; providers own
interpretation, persistence, receipts, and simulation. A client must not infer
decay or repair a missed release by mutating presented state.
