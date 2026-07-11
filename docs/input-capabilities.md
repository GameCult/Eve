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
