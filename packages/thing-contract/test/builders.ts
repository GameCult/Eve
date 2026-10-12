// The values the goldens are built from, ported from crates/thing-contract/tests/common/mod.rs and goldens.rs. Every
// value is an object literal of the package's exported types; no bytes are spelled here. The golden files are read, never
// written: the Rust crate blesses them.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CommandResult } from "@gamecult/thing-contract";
import type {
  Arg,
  AssetCatalog,
  BoxNode,
  Bind,
  BoolSource,
  CollectionSource,
  CommandInvocation,
  CommandRef,
  CompositionDocument,
  Dimension,
  Edges,
  Format,
  MemberPath,
  Node,
  NodeCommon,
  NumberSource,
  Paint,
  Size2,
  SurfaceDocument,
  TextSource,
  BoxStyle,
} from "@gamecult/thing-contract";

export const CANARY = "CANARY-7f3a91c2";
export const PINNED_CLOCK = "2026-01-01T00:00:00Z";

/** The goldens directory, found by walking up from this file (a mutation sandbox sits deeper in the tree). */
export const goldensDir: string = (() => {
  let here = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = join(here, "crates", "thing-contract", "tests", "goldens");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(here);
    if (parent === here) throw new Error("the Rust crate's goldens directory is not above this file");
    here = parent;
  }
})();

export function golden(file: string): Uint8Array {
  return new Uint8Array(readFileSync(join(goldensDir, file)));
}

export const lit = (value: string): TextSource => ({ kind: "Literal", value });
export const litBool = (value: boolean): BoolSource => ({ kind: "Literal", value });
export const litNumber = (value: number): NumberSource => ({ kind: "Literal", value });
export const param = (name: string) => ({ kind: "Param", name }) as const;
export const path = (...names: string[]): MemberPath => ({ steps: names.map((name) => ({ kind: "Name", name }) as const) });
export const command = (id: string): CommandRef => ({ kind: "Id", id });

export function recordBind(member: MemberPath, format: Format | null): Bind {
  return {
    source: { kind: "Record", provider: "provider.a", schema: "gamecult.thing.test.v1", key: "row-1" },
    member,
    format,
  };
}
export const itemBind = (member: MemberPath): Bind => ({ source: { kind: "Item" }, member, format: null });

export const common = (id: string): NodeCommon => ({ id, visible: litBool(true), a11yLabel: null });
export const px = (value: number): Dimension => ({ kind: "Px", value });
export const size2 = (width: Dimension, height: Dimension): Size2 => ({ width, height });
export const edges = (all: Dimension): Edges => ({ top: all, right: all, bottom: all, left: all });

export function style(): BoxStyle {
  return {
    display: { kind: "Flex" },
    direction: { kind: "Column" },
    wrap: { kind: "NoWrap" },
    gap: size2(px(4), px(8)),
    padding: edges(px(2)),
    margin: edges({ kind: "Auto" }),
    size: size2({ kind: "Percent", value: 100 }, { kind: "Content" }),
    minSize: size2(px(0), px(0)),
    maxSize: size2({ kind: "Auto" }, { kind: "Auto" }),
    position: { kind: "Relative" },
    inset: edges({ kind: "Auto" }),
    overflow: { kind: "Visible" },
    alignItems: { kind: "Stretch" },
    alignSelf: { kind: "Auto" },
    alignContent: { kind: "Start" },
    justifyContent: { kind: "SpaceBetween" },
    grow: 1,
    shrink: 0,
    basis: { kind: "Auto" },
    gridColumns: [],
    gridRows: [],
  };
}

export const plainPaint = (): Paint => ({ background: null, border: null, radius: 0 });

export function boxNode(id: string, children: readonly Node[]): BoxNode {
  return { common: common(id), style: style(), paint: plainPaint(), role: { kind: "Group" }, children };
}
export const boxed = (id: string, children: readonly Node[]): Node => ({ kind: "Box", ...boxNode(id, children) });
export const text = (id: string, content: string): Node => ({
  kind: "Text",
  common: common(id),
  content: lit(content),
  styleToken: "body",
  wrap: true,
  maxLines: null,
  selectable: false,
});

export function invocation(): CommandInvocation {
  return {
    invocationId: "3f2b8c1e-5d44-4a6b-9a07-1c2d3e4f5a6b",
    surfaceKey: "thing:surface:provider.a.main",
    surfaceVersion: 7,
    command: "go",
    payload: { schema: "gamecult.thing.test.go.v1", bytes: new Uint8Array([0x91, 0x01, 0xff, 0x00]) },
    captured: [
      { node: "name-input", value: { kind: "Text", value: "Ada" } },
      { node: "level", value: { kind: "Number", value: 0.75 } },
      { node: "flag", value: { kind: "Bool", value: true } },
      { node: "pick", value: { kind: "Choice", value: "a" } },
    ],
    client: "renderer.web",
    issuedAt: PINNED_CLOCK,
    delegation: "delegate-1",
  };
}

export function bindAllFormats(): Bind[] {
  const number: Format = { kind: "Number", precision: 2, percent: true, unit: "ms" };
  const affix: Format = { kind: "Affix", prefix: "$", suffix: "/s" };
  const indexed: MemberPath = { steps: [{ kind: "Name", name: "items" }, { kind: "Index", index: 3 }] };
  return [
    recordBind(indexed, number),
    recordBind(path("elapsed"), { kind: "Duration" }),
    recordBind(path("at"), { kind: "Timestamp" }),
    recordBind(path("price"), affix),
    recordBind(path("plain"), null),
    itemBind(path("name")),
  ];
}

export function fullSurface(): SurfaceDocument {
  const binds = bindAllFormats();
  const boundText: TextSource = { kind: "Bound", ...binds[3] };
  const boundBool: BoolSource = { kind: "Bound", ...binds[4] };
  const boundNumber: NumberSource = { kind: "Bound", ...binds[0] };

  const painted: Node = {
    kind: "Box",
    common: { id: "painted", visible: param("show"), a11yLabel: param("label") },
    style: {
      ...style(),
      display: { kind: "Grid" },
      gridColumns: [{ kind: "Fr", value: 1 }, px(120)],
      gridRows: [{ kind: "Content" }],
      position: { kind: "Absolute" },
      overflow: { kind: "Scroll" },
      direction: { kind: "RowReverse" },
      wrap: { kind: "WrapReverse" },
      alignItems: { kind: "Baseline" },
      alignSelf: { kind: "Center" },
      alignContent: { kind: "SpaceAround" },
      justifyContent: { kind: "SpaceEvenly" },
    },
    paint: {
      background: { kind: "Token", name: "surface.raised" },
      border: { color: { kind: "Rgba", r: 1, g: 2, b: 3, a: 255 }, width: 1.5 },
      radius: 4,
    },
    role: { kind: "Region" },
    children: [text("deep-text", "deep")],
  };

  const repeat: Node = {
    kind: "Repeat",
    common: common("rows"),
    collection: { kind: "Records", provider: null, schema: "gamecult.thing.test.v1", keyPrefix: "row-" },
    keyMember: path("id"),
    template: {
      kind: "Text",
      common: common("row-name"),
      content: { kind: "Bound", ...itemBind(path("name")) },
      styleToken: "body",
      wrap: false,
      maxLines: 2,
      selectable: true,
    },
  };

  const leaves: Node[] = [
    {
      kind: "Text",
      common: common("t-bound"),
      content: boundText,
      styleToken: "label",
      wrap: true,
      maxLines: null,
      selectable: false,
    },
    { kind: "Image", common: common("img"), catalog: "icons", asset: "gear", fit: { kind: "Cover" }, alt: lit("a gear") },
    {
      kind: "Button",
      common: common("go"),
      content: [text("go-label", "Go")],
      onActivate: command("go"),
      enabled: boundBool,
    },
    { kind: "Toggle", common: common("flag"), checked: boundBool, onChange: param("toggle") },
    {
      kind: "Slider",
      common: common("level"),
      min: 0,
      max: 1,
      step: 0.25,
      value: boundNumber,
      commit: command("set-level"),
    },
    {
      kind: "TextInput",
      common: common("name-input"),
      multiline: true,
      inputKind: { kind: "Number" },
      placeholder: lit("name"),
      initial: param("initial"),
      submit: command("rename"),
    },
    {
      kind: "TextInput",
      common: common("title-input"),
      multiline: false,
      inputKind: { kind: "Text" },
      placeholder: lit("title"),
      initial: param("initial"),
      submit: command("retitle"),
    },
    {
      kind: "Select",
      common: common("pick"),
      options: { kind: "Literal", options: [{ value: "a", label: "Alpha" }] },
      value: binds[4],
      onChange: command("pick"),
    },
    {
      kind: "Select",
      common: common("pick-bound"),
      options: {
        kind: "Bound",
        collection: { kind: "Member", ...binds[0] },
        valueMember: path("id"),
        labelMember: path("name"),
      },
      value: binds[5],
      onChange: command("pick"),
    },
    repeat,
    {
      kind: "Overlay",
      common: common("menu"),
      anchor: { kind: "Node", node: "go" },
      modal: false,
      dismiss: command("close"),
      children: [text("menu-item", "one")],
    },
    {
      kind: "Overlay",
      common: common("dialog"),
      anchor: { kind: "Viewport" },
      modal: true,
      dismiss: command("close"),
      children: [],
    },
    {
      kind: "Plot",
      common: common("trend"),
      series: binds[1],
      mark: { kind: "Area" },
      xMin: 0,
      xMax: null,
      yMin: null,
      yMax: 100,
    },
    { kind: "Embed", common: common("viewport"), slotKind: "world.scene", slotId: "main", width: 640, height: 480 },
    {
      kind: "Use",
      common: common("kv"),
      composition: { publisher: "thing.std", name: "key-value", version: 1 },
      args: [{ name: "key", value: { kind: "Text", value: "k" } }],
    },
  ];

  let deep: Node = boxed("d4", [painted]);
  for (const id of ["d3", "d2", "d1"]) deep = boxed(id, [deep]);
  const children: Node[] = [deep, ...leaves];
  for (const [id, mark] of [
    ["trend-line", { kind: "Line" }],
    ["trend-bar", { kind: "Bar" }],
  ] as const) {
    children.push({
      kind: "Plot",
      common: common(id),
      series: binds[2],
      mark,
      xMin: null,
      xMax: null,
      yMin: null,
      yMax: null,
    });
  }
  (["Contain", "Fill", "Unscaled"] as const).forEach((fit, index) => {
    children.push({
      kind: "Image",
      common: common(`img-fit-${index}`),
      catalog: "icons",
      asset: "gear",
      fit: { kind: fit },
      alt: lit(""),
    });
  });
  (["List", "ListItem", "Heading", "Dialog", "Toolbar"] as const).forEach((role, index) => {
    const roleStyle: BoxStyle =
      index === 0
        ? { ...style(), direction: { kind: "Row" }, alignContent: { kind: "Auto" }, justifyContent: { kind: "Stretch" } }
        : style();
    children.push({
      kind: "Box",
      common: common(`role-${index}`),
      style: roleStyle,
      paint: plainPaint(),
      role: { kind: role },
      children: [],
    });
  });
  children.push({
    kind: "Box",
    common: common("block"),
    style: {
      ...style(),
      display: { kind: "Block" },
      direction: { kind: "ColumnReverse" },
      wrap: { kind: "Wrap" },
      overflow: { kind: "Clip" },
      alignContent: { kind: "Center" },
      justifyContent: { kind: "End" },
      alignItems: { kind: "End" },
      alignSelf: { kind: "Start" },
      basis: { kind: "Content" },
    },
    paint: plainPaint(),
    role: { kind: "Group" },
    children: [],
  });
  children.push({
    kind: "Text",
    common: common("t-param"),
    content: param("title"),
    styleToken: "title",
    wrap: true,
    maxLines: null,
    selectable: false,
  });
  children.push({
    kind: "Toggle",
    common: { id: "literal-number", visible: param("v"), a11yLabel: null },
    checked: litBool(false),
    onChange: command("toggle"),
  });
  children.push({
    kind: "Slider",
    common: common("slider-literal"),
    min: -1,
    max: 1,
    step: 0.5,
    value: litNumber(0.5),
    commit: command("set-level"),
  });
  children.push({
    kind: "Slider",
    common: common("slider-param"),
    min: 0,
    max: 10,
    step: 1,
    value: param("n"),
    commit: command("set-level"),
  });
  const rows: CollectionSource = param("rows");
  children.push({
    kind: "Repeat",
    common: common("rows-param"),
    collection: rows,
    keyMember: path("id"),
    template: text("row-param", "r"),
  });

  return {
    providerId: "provider.a",
    label: "main",
    version: 7,
    title: "All arms",
    root: boxed("root", children),
    commands: [
      { id: "go", payloadSchema: "gamecult.thing.test.go.v1", captures: ["name-input", "level"], confirm: "Go now?" },
      { id: "close", payloadSchema: "gamecult.thing.test.close.v1", captures: [], confirm: null },
    ],
  };
}

export function fullComposition(): CompositionDocument {
  const args: Arg[] = [
    { name: "text", value: { kind: "Text", value: "t" } },
    { name: "number", value: { kind: "Number", value: 2.5 } },
    { name: "bool", value: { kind: "Bool", value: true } },
    { name: "bind", value: { kind: "Bind", ...recordBind(path("x"), null) } },
    { name: "collection", value: { kind: "Collection", source: param("rows") } },
    { name: "command", value: { kind: "Command", command: command("go") } },
    { name: "slot", value: { kind: "Slot", nodes: [text("slot-text", "inside"), boxed("slot-box", [])] } },
  ];
  const innerUse: Node = {
    kind: "Use",
    common: common("inner"),
    composition: { publisher: "thing.std", name: "card", version: 2 },
    args,
  };
  return {
    publisher: "provider.a",
    name: "panel",
    version: 3,
    params: [
      { name: "title", kind: { kind: "Text" } },
      { name: "count", kind: { kind: "Number" } },
      { name: "on", kind: { kind: "Bool" } },
      { name: "source", kind: { kind: "Bind" } },
      { name: "rows", kind: { kind: "Collection" } },
      { name: "act", kind: { kind: "Command" } },
      { name: "body", kind: { kind: "Slot" } },
    ],
    body: boxed("panel-root", [text("panel-title", "t"), innerUse]),
  };
}

export function results(answered: CommandInvocation): [string, CommandResult][] {
  return [
    ["result-pending", CommandResult.pending(answered, 1, "working")],
    ["result-completed", CommandResult.completed(answered, 2, 8, true, null)],
    [
      "result-completed-open-surface",
      CommandResult.completed(answered, 3, null, false, { kind: "OpenSurface", key: "thing:surface:provider.a.next" }),
    ],
    [
      "result-completed-open-external",
      CommandResult.completed(answered, 4, 9, true, {
        kind: "OpenExternal",
        url: "https://example.test/auth",
        resume: command("resume"),
      }),
    ],
    ["result-denied", CommandResult.denied(answered, 5, "not yours", "go")],
    ["result-denied-no-node", CommandResult.denied(answered, 6, "not allowed", null)],
    ["result-failed", CommandResult.failed(answered, 7, "broke")],
  ];
}

export function assetCatalogValue(): AssetCatalog {
  return {
    providerId: "provider.a",
    catalogId: "icons",
    version: 2,
    assets: [
      { id: "gear", mediaType: "image/png", uri: "assets/gear.png", width: 32, height: 32 },
      { id: "bolt", mediaType: "image/svg+xml", uri: "assets/bolt.svg", width: 0, height: 0 },
    ],
  };
}
