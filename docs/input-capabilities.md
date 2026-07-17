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

The `scalar.v1` model exposes an explicit finite numeric control rather than a
sampled device axis. `currentValue` is provider-owned state. `minimumValue`,
`maximumValue`, and `stepValue` are optional input constraints, and `unit` is an
optional semantic label. A client submits the chosen value to `payloadKey`; it
does not update `currentValue` optimistically or clamp values beyond the
advertised constraints. Providers may leave the range open when the original
control accepted arbitrary numeric input.

The `view-direction.v1` model is a one-shot value sampled when its gesture is
performed. The client reads the active semantic view's normalized world-space
forward direction and writes X, Y, and Z to the three advertised `payloadKeys`
in that order. The provider decides what the ray means; clients do not select,
filter, or rank gameplay targets.
