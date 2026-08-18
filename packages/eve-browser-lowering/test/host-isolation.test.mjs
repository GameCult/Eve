import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { renderEveSurface } from "../dist/index.js";

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
    assert.equal(commands[0].command, "hangar.select_verse");
    assert.equal(commands[0].payload.value, "gamecult");
  } finally {
    restoreDom();
  }
});
