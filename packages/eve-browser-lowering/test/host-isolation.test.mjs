import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { EveBrowserDraftStore, EveBrowserProviderHost, renderEveSurface } from "../dist/index.js";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><head></head><body><div id='a'></div><div id='b'></div></body></html>", {
    url: "https://eve.test/",
    pretendToBeVisual: true,
  });
  const names = [
    "document",
    "window",
    "Element",
    "HTMLElement",
    "HTMLButtonElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "HTMLOptionElement",
    "HTMLTextAreaElement",
    "HTMLImageElement",
  ];
  const previous = new Map(names.map(name => [name, globalThis[name]]));
  for (const name of names) globalThis[name] = dom.window[name];
  return () => {
    for (const [name, value] of previous) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
    dom.window.close();
  };
}

function testInputAdapter(onRender = () => {}) {
  return {
    pluginId: "test.input",
    componentKinds: ["test.input"],
    renderComponent(_node, props) {
      onRender();
      const input = document.createElement("input");
      input.type = "text";
      input.value = String(props.value ?? "");
      return input;
    },
  };
}

function surface(providerId, imagePath, skinPart, inputComponent) {
  return {
    providerId,
    surface: {
      id: `${providerId}.hangar`,
      styles: {
        tokens: { colorAccent: providerId === "alpha" ? "#a00" : "#00a" },
        controlSkins: {
          custom: {
            children: [{ kind: "control.part", props: { name: skinPart } }],
          },
        },
      },
      root: {
        id: `${providerId}.root`,
        kind: "column",
        children: [
          { kind: "image.preview", props: { src: imagePath, label: providerId } },
          { kind: "control.slider", props: { skin: "custom", value: 0.5 } },
          inputComponent,
          { kind: "control.button", props: { label: `Launch ${providerId}`, command: `${providerId}.launch` } },
        ],
      },
    },
  };
}

test("browser lowering isolates two hosts and patches only the bound component", async () => {
  const restoreDom = installDom();
  try {
    let applyAlphaBinding;
    let alphaInputRenders = 0;
    const alphaCommands = [];
    const betaCommands = [];
    const alphaInput = {
      id: "alpha.input",
      kind: "test.input",
      props: { value: "initial" },
      stateBindings: [{
        targetProp: "value",
        pointerId: "alpha.input.value",
        sourceId: "alpha.state",
        schemaId: "alpha.state.v1",
        routeKind: "cultmesh",
      }],
    };
    const alphaSurface = surface("alpha", "/ship.png", "track-alpha", alphaInput);
    const betaSurface = surface("beta", "/ship.png", "track-beta", {
      id: "beta.input",
      kind: "test.input",
      props: { value: "beta" },
    });
    const alphaHost = document.querySelector("#a");
    const betaHost = document.querySelector("#b");

    renderEveSurface(alphaSurface, alphaHost, {
      assetUrlResolver: uri => `https://alpha.assets${uri}`,
      commandSink: intent => alphaCommands.push(intent),
      pluginAdapters: [testInputAdapter(() => { alphaInputRenders++; })],
      provider: { providerId: "alpha", surfaces: [{ surfaceId: "alpha.hangar", worldInteraction: { commandBoundary: "alpha.commands", receiptSchema: "gamecult.eve.command_receipt.v1" } }] },
      stateBindingResolver: async () => ({
        latest: async () => "hydrated",
        watch: callback => {
          applyAlphaBinding = callback;
          return () => { applyAlphaBinding = undefined; };
        },
      }),
    });
    renderEveSurface(betaSurface, betaHost, {
      assetUrlResolver: uri => `https://beta.assets${uri}`,
      commandSink: intent => betaCommands.push(intent),
      pluginAdapters: [testInputAdapter()],
      provider: { providerId: "beta", surfaces: [{ surfaceId: "beta.hangar", worldInteraction: { commandBoundary: "beta.commands", receiptSchema: "gamecult.eve.command_receipt.v1" } }] },
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(alphaHost.querySelector("img").src, "https://alpha.assets/ship.png");
    assert.equal(betaHost.querySelector("img").src, "https://beta.assets/ship.png");
    assert.ok(alphaHost.querySelector(".track-alpha"));
    assert.ok(betaHost.querySelector(".track-beta"));

    alphaHost.querySelector("button").click();
    betaHost.querySelector("button").click();
    assert.equal(alphaCommands[0].providerId, "alpha");
    assert.equal(alphaCommands[0].surfaceId, "alpha.hangar");
    assert.equal(betaCommands[0].providerId, "beta");
    assert.equal(betaCommands[0].surfaceId, "beta.hangar");

    const alphaRoot = alphaHost.firstElementChild;
    const betaRoot = betaHost.firstElementChild;
    const focusedInput = alphaHost.querySelector("input[type='text']");
    focusedInput.focus();
    focusedInput.setSelectionRange(1, 4);
    alphaHost.scrollTop = 37;
    const rendersBeforeUpdates = alphaInputRenders;
    for (let index = 0; index < 1000; index++) applyAlphaBinding(`updated-${index}`);
    await new Promise(resolve => setTimeout(resolve, 0));

    const updatedInput = alphaHost.querySelector("input[type='text']");
    assert.equal(alphaHost.firstElementChild, alphaRoot);
    assert.equal(betaHost.firstElementChild, betaRoot);
    assert.equal(updatedInput.value, "updated-999");
    assert.equal(alphaInputRenders, rendersBeforeUpdates + 1);
    assert.equal(document.activeElement, updatedInput);
    assert.equal(updatedInput.selectionStart, 1);
    assert.equal(updatedInput.selectionEnd, 4);
    assert.equal(alphaHost.scrollTop, 37);
  } finally {
    restoreDom();
  }
});

test("browser lowering renders command-backed select options", () => {
  const restoreDom = installDom();
  try {
    const commands = [];
    const host = document.querySelector("#a");
    renderEveSurface({
      providerId: "hangar-provider",
      surface: {
        id: "hangar",
        root: {
          id: "hangar.verse",
          kind: "control.select",
          props: { label: "VERSE", value: "local", command: "hangar.select_verse" },
          children: [
            { kind: "control.option", props: { label: "Local", value: "local" } },
            { kind: "control.option", props: { label: "GameCult", value: "gamecult" } },
          ],
        },
      },
    }, host, {
      clientId: "browser-test",
      commandSink: intent => commands.push(intent),
      provider: { providerId: "hangar-provider", surfaces: [{ surfaceId: "hangar", worldInteraction: { commandBoundary: "hangar.commands", receiptSchema: "gamecult.eve.command_receipt.v1" } }] },
    });

    const select = host.querySelector("select");
    assert.deepEqual([...select.options].map(option => [option.text, option.value]), [
      ["Local", "local"],
      ["GameCult", "gamecult"],
    ]);
    assert.equal(select.value, "local");
    select.value = "gamecult";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.equal(commands.length, 1);
    assert.equal(commands[0].operation.operationId, "hangar.select_verse");
    assert.equal(commands[0].payload.value, "gamecult");
  } finally {
    restoreDom();
  }
});

test("editable bindings preserve local drafts across authoritative refresh and operations capture them", () => {
  const restoreDom = installDom();
  try {
    const commands = [];
    const drafts = new EveBrowserDraftStore();
    const host = document.querySelector("#a");
    const provider = {
      providerId: "ghostlight",
      surfaces: [{ surfaceId: "ghostlight.play", worldInteraction: {
        commandBoundary: "ghostlight.eve.commands",
        receiptSchema: "gamecult.eve.command_result.v1",
      } }],
    };
    const surface = value => ({
      providerId: "ghostlight",
      version: 7,
      commands: [{
        command: "session_zero.message.send",
        payloadSchema: "session_zero.message.send.v1",
        captureBindings: ["composer.message"],
      }],
      surface: {
        id: "ghostlight.play",
        root: { id: "root", kind: "column", children: [
          {
            id: "composer",
            kind: "control.input.textarea",
            props: { label: "Message", value, maxLength: 2000 },
            stateBindings: [{
              targetProp: "value",
              pointerId: "ghostlight.local.composer.message",
              sourceId: "eve.browser.local",
              schemaId: "gamecult.eve.local_draft.v1",
              routeKind: "in-process",
              bindingName: "composer.message",
              valueKind: "string",
              accessMode: "local-draft",
              authority: "eve.browser",
            }],
          },
          { id: "send", kind: "control.button", props: { label: "Send", command: "session_zero.message.send" } },
        ] },
      },
    });
    const options = { provider, draftStore: drafts, commandSink: intent => commands.push(intent) };
    renderEveSurface(surface(""), host, options);
    const composer = host.querySelector("textarea");
    assert.equal(composer.maxLength, 2000);
    composer.value = "The world should remember this.";
    composer.dispatchEvent(new window.Event("input", { bubbles: true }));

    renderEveSurface(surface("stale provider value"), host, options);
    assert.equal(host.querySelector("textarea").value, "The world should remember this.");
    host.querySelector("button").click();
    assert.deepEqual(commands[0].payload.bindings, {
      "composer.message": "The world should remember this.",
    });
    assert.equal(commands[0].operation.schemaId, "session_zero.message.send.v1");
    assert.equal(commands[0].operation.routeHint.sourceVersion, 7);

    drafts.clear("ghostlight", "ghostlight.play", ["composer.message"]);
    renderEveSurface(surface("accepted provider value"), host, options);
    assert.equal(host.querySelector("textarea").value, "accepted provider value");
  } finally {
    restoreDom();
  }
});

test("an explicit empty draft directive clears no unrelated bindings", () => {
  const drafts = new EveBrowserDraftStore();
  drafts.set("ghostlight", "ghostlight.play", "channel_id", "private:host");
  drafts.set("ghostlight", "ghostlight.play", "message", "still drafting");

  drafts.clear("ghostlight", "ghostlight.play", []);
  assert.equal(drafts.get("ghostlight", "ghostlight.play", "channel_id"), "private:host");
  assert.equal(drafts.get("ghostlight", "ghostlight.play", "message"), "still drafting");

  drafts.clear("ghostlight", "ghostlight.play");
  assert.equal(drafts.has("ghostlight", "ghostlight.play", "channel_id"), false);
  assert.equal(drafts.has("ghostlight", "ghostlight.play", "message"), false);
});

test("operations capture untouched authored choice defaults", () => {
  const restoreDom = installDom();
  try {
    const commands = [];
    const host = document.querySelector("#a");
    const provider = {
      providerId: "ghostlight",
      surfaces: [{ surfaceId: "ghostlight.play", worldInteraction: {
        commandBoundary: "ghostlight.eve.commands",
        receiptSchema: "gamecult.eve.command_result.v1",
      } }],
    };
    renderEveSurface({
      providerId: "ghostlight",
      version: 7,
      commands: [{
        command: "session_zero.message.send",
        payloadSchema: "session_zero.message.send.v1",
        captureBindings: ["channel_id"],
      }],
      surface: {
        id: "ghostlight.play",
        root: { id: "root", kind: "column", children: [
          {
            id: "channel",
            kind: "control.select",
            props: { label: "Speak at", value: "shared" },
            stateBindings: [{
              targetProp: "value",
              pointerId: "ghostlight.local.channel_id",
              sourceId: "eve.browser.local",
              schemaId: "gamecult.eve.local_draft.v1",
              routeKind: "in-process",
              bindingName: "channel_id",
              valueKind: "choice",
              accessMode: "local-draft",
              authority: "eve.browser",
            }],
            children: [
              { kind: "control.option", props: { label: "Shared", value: "shared" } },
              { kind: "control.option", props: { label: "Private", value: "private" } },
            ],
          },
          { id: "send", kind: "control.button", props: { label: "Send", command: "session_zero.message.send" } },
        ] },
      },
    }, host, {
      provider,
      draftStore: new EveBrowserDraftStore(),
      commandSink: intent => commands.push(intent),
    });

    assert.equal(host.querySelector("select").value, "shared");
    host.querySelector("button").click();
    assert.deepEqual(commands[0].payload.bindings, { channel_id: "shared" });
  } finally {
    restoreDom();
  }
});

test("component captures extend rather than disappear behind operation descriptors", () => {
  const restoreDom = installDom();
  try {
    const commands = [];
    const host = document.querySelector("#a");
    const provider = {
      providerId: "ghostlight",
      surfaces: [{ surfaceId: "ghostlight.play", worldInteraction: {
        commandBoundary: "ghostlight.eve.commands",
        receiptSchema: "gamecult.eve.command_result.v1",
      } }],
    };
    renderEveSurface({
      providerId: "ghostlight",
      version: 17,
      commands: [{
        command: "session_zero.decision.resolve",
        payloadSchema: "session_zero.decision.resolve.v1",
        captureBindings: [],
      }],
      surface: {
        id: "ghostlight.play",
        root: { id: "root", kind: "column", children: [
          {
            id: "counter",
            kind: "control.input.textarea",
            props: { label: "Counterproposal" },
            stateBindings: [{
              targetProp: "value",
              pointerId: "draft:counter",
              sourceId: "renderer",
              schemaId: "gamecult.eve.local_draft.v1",
              routeKind: "local",
              bindingName: "counter",
              valueKind: "string",
              accessMode: "local-draft",
              authority: "renderer-ephemeral",
            }],
          },
          {
            id: "counter-decision",
            kind: "control.button",
            props: {
              label: "Counter",
              command: "session_zero.decision.resolve",
              action: { decision_id: "decision:one", accept: false },
              captureBindings: ["counter"],
            },
          },
        ] },
      },
    }, host, {
      provider,
      draftStore: new EveBrowserDraftStore(),
      commandSink: intent => commands.push(intent),
    });

    const counter = host.querySelector("textarea");
    counter.value = "Contamination fades, but scars remain.";
    counter.dispatchEvent(new window.Event("input", { bubbles: true }));
    host.querySelector("button").click();
    assert.deepEqual(commands[0].payload.bindings, {
      counter: "Contamination fades, but scars remain.",
    });
  } finally {
    restoreDom();
  }
});

test("authoritative refresh preserves the renderer-owned accessible command result", () => {
  const restoreDom = installDom();
  try {
    const host = document.querySelector("#a");
    const surface = version => ({
      providerId: "ghostlight",
      version,
      surface: { id: "ghostlight.play", root: { id: `root-${version}`, kind: "text", props: { value: `revision ${version}` } } },
    });
    renderEveSurface(surface(7), host);
    const result = document.createElement("section");
    result.className = "eve-command-result-region";
    result.setAttribute("role", "alert");
    result.textContent = "The command was denied.";
    host.append(result);

    renderEveSurface(surface(8), host);
    assert.equal(host.querySelector(".eve-command-result-region"), result);
    assert.equal(result.textContent, "The command was denied.");
    assert.match(host.textContent, /revision 8/);
  } finally {
    restoreDom();
  }
});

test("transient projection controls use the selected provider command boundary", async () => {
  const restoreDom = installDom();
  try {
    const host = document.querySelector("#a");
    const commands = [];
    const descriptor = (command, payloadSchema) => ({
      schema: "gamecult.eve.command.v1",
      command,
      payloadSchema,
    });
    const surfaceDocument = {
      type: "surface-state",
      schema: "gamecult.eve.surface.v1",
      providerId: "ghostlight",
      providerKind: "narrative.simulation",
      title: "Ghostlight",
      version: 7,
      updatedAtUtc: "2026-08-22T00:00:00Z",
      surface: {
        id: "ghostlight.play",
        styles: {},
        root: {
          id: "root",
          kind: "control.button",
          props: { label: "Assess", command: "world.assess" },
          children: [],
        },
      },
      commands: [descriptor("world.assess", "ghostlight.player_action_assess.v1")],
    };
    const transientProjection = {
      type: "surface-state",
      schema: "gamecult.eve.surface.v1",
      providerId: "ghostlight",
      providerKind: "narrative.simulation.command-result",
      title: "Assessment",
      version: 7,
      updatedAtUtc: "2026-08-22T00:00:01Z",
      surface: {
        id: "ghostlight.command-result",
        styles: {},
        root: {
          id: "roll",
          kind: "control.button",
          props: {
            label: "Roll the d20",
            command: "world.attempt",
            action: { assessment_digest: "sha256:assessment" },
          },
          children: [],
        },
      },
      commands: [descriptor("world.attempt", "ghostlight.player_action_attempt.v1")],
    };
    const receipt = command => ({
      schema: "gamecult.eve.command_receipt.v1",
      receiptId: `receipt:${command}`,
      commandId: `command:${command}`,
      command,
      state: "accepted",
      ownerRepo: "GameCult/Ghostlight",
      authority: "WorldKernel",
      providerId: "ghostlight",
      surfaceId: "ghostlight.play",
      message: "accepted",
      diagnostics: [],
      issuedAtUtc: "2026-08-22T00:00:02Z",
      sourceVersion: 7,
    });
    const transport = {
      providerAdvertisement: async () => ({
        providerId: "ghostlight",
        surfaces: [{
          surfaceId: "ghostlight.play",
          worldInteraction: {
            commandBoundary: "ghostlight.eve.commands",
            receiptSchema: "gamecult.eve.command_result.v1",
          },
        }],
      }),
      surface: async () => surfaceDocument,
      submitCommand: async intent => {
        commands.push(intent);
        return {
          schema: "gamecult.eve.command_result.v1",
          receipt: receipt(intent.operation.operationId),
          ...(intent.operation.operationId === "world.assess" ? { transientProjection } : {}),
        };
      },
    };
    const providerHost = new EveBrowserProviderHost(host, transport, { pollMs: 0 });
    await providerHost.start();

    host.querySelector("button").click();
    await new Promise(resolve => setTimeout(resolve, 0));
    const roll = host.querySelector(".eve-command-result-region button");
    assert.equal(roll.textContent, "Roll the d20");
    roll.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.deepEqual(commands.map(command => command.operation.operationId), ["world.assess", "world.attempt"]);
    assert.equal(commands[1].surfaceId, "ghostlight.play");
    assert.equal(commands[1].operation.schemaId, "ghostlight.player_action_attempt.v1");
    assert.equal(commands[1].commandBoundary, "ghostlight.eve.commands");
    assert.equal(commands[1].payload.assessment_digest, "sha256:assessment");
    providerHost.stop();
  } finally {
    restoreDom();
  }
});
