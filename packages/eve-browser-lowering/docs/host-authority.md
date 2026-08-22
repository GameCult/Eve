# Browser Lowering Host Authority

Owner:

- one rendered host owns its surface document, lowering options, style tokens,
  component-to-element index, and state-binding subscriptions;
- the provider owns the surface graph and command meaning;
- the browser lowerer owns only DOM projection and interaction forwarding.

Inputs:

- one `EveSurfaceDocument`;
- one host element;
- host-scoped lowering options, plugin adapters, asset resolver, and binding
  resolver;
- canonical state-binding values.

Outputs:

- DOM beneath that host;
- typed command intents carrying that host's provider and surface identity;
- host-local style variables and provider diagnostics.

Derived state:

- DOM nodes, focus restoration data, normalized styles, and component indexes
  are projections of the owning surface;
- local drafts and the latest command-result region are renderer-owned
  transients; refresh may replace the surface projection but may not erase a
  receipt before the player can perceive it;
- loaded font stylesheets are a document resource cache, not active-surface
  state.

Forbidden writers:

- another host may not replace the active surface, options, styles, assets, or
  command identity used by this host;
- binding updates may not rebuild an unrelated host or mutate provider state;
- module globals may not decide which surface a command or asset belongs to.

Shared paths:

- initial render, embedded render, plugin render, binding updates, command
  creation, and asset resolution all receive the same host-scoped context;
- initial binding hydration and live binding watches use the same component
  projection replacement primitive.
- operation capture resolves edited drafts first and otherwise uses the
  authored value currently displayed by the bound control.

Cut line:

- delete module-global current surface/options/styles;
- remove the global current-mesh side channel;
- replace whole-host binding rerenders with indexed component-subtree updates;
- preserve focus, selection, and host scroll across a bound component update.

Verification:

- two hosts in one document retain distinct provider commands, asset routes,
  and control skins after either host renders or updates;
- a bound leaf update does not replace either host root;
- focused input selection and host scroll survive a binding update;
- untouched select and numeric defaults are present in captured operations;
- accepted and denied command results remain visible after authoritative
  refresh;
- disposing or rerendering one host cannot unsubscribe the other.
