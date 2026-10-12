// One codec per type of crates/thing-contract, built from cultcache-ts's slots, union, list, nullable and lazy at the
// crate's slot and arm keys. Nothing here encodes or decodes by hand, declares a slot default, or checks an arm: the
// library's codecs refuse an unknown arm or a missing slot, and domain.ts holds the five domains.
//
// Every slots and union codec is named GameCult.Thing.Contract.<RustName>, the reference's full type name, because a
// store's schema catalog carries the type name of each document slot and the reference compares them.
//
// Definition order is dependency order. The one cycle is Node (through Box, Button, Overlay, Repeat and Slot), and it
// closes at slot level with `lazy`, never inside a union's arm table.
import { codecs } from "@gamecult/cultcache-ts";
import type { Codec } from "@gamecult/cultcache-ts";

import { channel, count, segment, version } from "./domain.js";
import type * as T from "./types.js";

const { string, boolean, float64, bytes, list, nullable, lazy, unit } = codecs;

const named = (rustName: string): string => `GameCult.Thing.Contract.${rustName}`;

// A union codec reads nil as null. A required union slot is typed without the null; a nil there is CultLib's
// nullable-reference rule (the reference reads nil too), not this package's.
const required = <TValue>(codec: Codec<TValue | null>): Codec<TValue> => codec as Codec<TValue>;

// source.rs
export const paramName = codecs.slots<T.ParamName>({ 0: ["name", string] }, named("ParamName"));
const textLiteral = codecs.slots<T.TextLiteral>({ 0: ["value", string] }, named("TextLiteral"));
const numberLiteral = codecs.slots<T.NumberLiteral>({ 0: ["value", float64] }, named("NumberLiteral"));
const boolLiteral = codecs.slots<T.BoolLiteral>({ 0: ["value", boolean] }, named("BoolLiteral"));

const memberName = codecs.slots<T.MemberName>({ 0: ["name", string] }, named("MemberName"));
const memberIndex = codecs.slots<T.MemberIndex>({ 0: ["index", count] }, named("MemberIndex"));
export const memberStep = required(
  codecs.union<T.MemberStep>("MemberStep", { 0: ["Name", memberName], 1: ["Index", memberIndex] }, named("MemberStep")),
);
export const memberPath = codecs.slots<T.MemberPath>({ 0: ["steps", list(memberStep)] }, named("MemberPath"));

const numberFormat = codecs.slots<T.NumberFormat>(
  { 0: ["precision", count], 1: ["percent", boolean], 2: ["unit", nullable(string)] },
  named("NumberFormat"),
);
const affixFormat = codecs.slots<T.AffixFormat>({ 0: ["prefix", string], 1: ["suffix", string] }, named("AffixFormat"));
export const format = required(
  codecs.union<T.Format>(
    "Format",
    { 0: ["Number", numberFormat], 1: ["Duration", unit], 2: ["Timestamp", unit], 3: ["Affix", affixFormat] },
    named("Format"),
  ),
);

const stateRef = codecs.slots<T.StateRef>(
  { 0: ["provider", nullable(string)], 1: ["schema", string], 2: ["key", string] },
  named("StateRef"),
);
export const stateSource = required(
  codecs.union<T.StateSource>("StateSource", { 0: ["Record", stateRef], 1: ["Item", unit] }, named("StateSource")),
);
export const bind = codecs.slots<T.Bind>(
  { 0: ["source", stateSource], 1: ["member", memberPath], 2: ["format", nullable(format)] },
  named("Bind"),
);

export const textSource = required(
  codecs.union<T.TextSource>(
    "TextSource",
    { 0: ["Literal", textLiteral], 1: ["Bound", bind], 2: ["Param", paramName] },
    named("TextSource"),
  ),
);
export const numberSource = required(
  codecs.union<T.NumberSource>(
    "NumberSource",
    { 0: ["Literal", numberLiteral], 1: ["Bound", bind], 2: ["Param", paramName] },
    named("NumberSource"),
  ),
);
export const boolSource = required(
  codecs.union<T.BoolSource>(
    "BoolSource",
    { 0: ["Literal", boolLiteral], 1: ["Bound", bind], 2: ["Param", paramName] },
    named("BoolSource"),
  ),
);

const recordsSource = codecs.slots<T.RecordsSource>(
  { 0: ["provider", nullable(string)], 1: ["schema", string], 2: ["keyPrefix", string] },
  named("RecordsSource"),
);
export const collectionSource = required(
  codecs.union<T.CollectionSource>(
    "CollectionSource",
    { 0: ["Records", recordsSource], 1: ["Member", bind], 2: ["Param", paramName] },
    named("CollectionSource"),
  ),
);

// style.rs
const scalar = codecs.slots<T.Scalar>({ 0: ["value", float64] }, named("Scalar"));
export const dimension = required(
  codecs.union<T.Dimension>(
    "Dimension",
    { 0: ["Px", scalar], 1: ["Percent", scalar], 2: ["Fr", scalar], 3: ["Auto", unit], 4: ["Content", unit] },
    named("Dimension"),
  ),
);
export const size2 = codecs.slots<T.Size2>({ 0: ["width", dimension], 1: ["height", dimension] }, named("Size2"));
export const edges = codecs.slots<T.Edges>(
  { 0: ["top", dimension], 1: ["right", dimension], 2: ["bottom", dimension], 3: ["left", dimension] },
  named("Edges"),
);
export const display = required(
  codecs.union<T.Display>("Display", { 0: ["Flex", unit], 1: ["Grid", unit], 2: ["Block", unit] }, named("Display")),
);
export const direction = required(
  codecs.union<T.Direction>(
    "Direction",
    { 0: ["Row", unit], 1: ["Column", unit], 2: ["RowReverse", unit], 3: ["ColumnReverse", unit] },
    named("Direction"),
  ),
);
export const wrap = required(
  codecs.union<T.Wrap>("Wrap", { 0: ["NoWrap", unit], 1: ["Wrap", unit], 2: ["WrapReverse", unit] }, named("Wrap")),
);
export const position = required(
  codecs.union<T.Position>("Position", { 0: ["Relative", unit], 1: ["Absolute", unit] }, named("Position")),
);
export const overflow = required(
  codecs.union<T.Overflow>("Overflow", { 0: ["Visible", unit], 1: ["Clip", unit], 2: ["Scroll", unit] }, named("Overflow")),
);
export const itemAlign = required(
  codecs.union<T.ItemAlign>(
    "ItemAlign",
    {
      0: ["Auto", unit],
      1: ["Start", unit],
      2: ["End", unit],
      3: ["Center", unit],
      4: ["Stretch", unit],
      5: ["Baseline", unit],
    },
    named("ItemAlign"),
  ),
);
export const contentAlign = required(
  codecs.union<T.ContentAlign>(
    "ContentAlign",
    {
      0: ["Auto", unit],
      1: ["Start", unit],
      2: ["End", unit],
      3: ["Center", unit],
      4: ["Stretch", unit],
      5: ["SpaceBetween", unit],
      6: ["SpaceAround", unit],
      7: ["SpaceEvenly", unit],
    },
    named("ContentAlign"),
  ),
);
export const boxStyle = codecs.slots<T.BoxStyle>(
  {
    0: ["display", display],
    1: ["direction", direction],
    2: ["wrap", wrap],
    3: ["gap", size2],
    4: ["padding", edges],
    5: ["margin", edges],
    6: ["size", size2],
    7: ["minSize", size2],
    8: ["maxSize", size2],
    9: ["position", position],
    10: ["inset", edges],
    11: ["overflow", overflow],
    12: ["alignItems", itemAlign],
    13: ["alignSelf", itemAlign],
    14: ["alignContent", contentAlign],
    15: ["justifyContent", contentAlign],
    16: ["grow", float64],
    17: ["shrink", float64],
    18: ["basis", dimension],
    19: ["gridColumns", list(dimension)],
    20: ["gridRows", list(dimension)],
  },
  named("BoxStyle"),
);
const themeToken = codecs.slots<T.ThemeToken>({ 0: ["name", string] }, named("ThemeToken"));
export const rgba = codecs.slots<T.Rgba>(
  { 0: ["r", channel], 1: ["g", channel], 2: ["b", channel], 3: ["a", channel] },
  named("Rgba"),
);
export const colorRef = required(
  codecs.union<T.ColorRef>("ColorRef", { 0: ["Token", themeToken], 1: ["Rgba", rgba] }, named("ColorRef")),
);
const border = codecs.slots<T.Border>({ 0: ["color", colorRef], 1: ["width", float64] }, named("Border"));
export const paint = codecs.slots<T.Paint>(
  { 0: ["background", nullable(colorRef)], 1: ["border", nullable(border)], 2: ["radius", float64] },
  named("Paint"),
);
export const role = required(
  codecs.union<T.Role>(
    "Role",
    {
      0: ["Group", unit],
      1: ["Region", unit],
      2: ["List", unit],
      3: ["ListItem", unit],
      4: ["Heading", unit],
      5: ["Dialog", unit],
      6: ["Toolbar", unit],
    },
    named("Role"),
  ),
);

// command.rs
export const commandDecl = codecs.slots<T.CommandDecl>(
  { 0: ["id", string], 1: ["payloadSchema", string], 2: ["captures", list(string)], 3: ["confirm", nullable(string)] },
  named("CommandDecl"),
);
const commandIdRef = codecs.slots<T.CommandIdRef>({ 0: ["id", string] }, named("CommandIdRef"));
export const commandRef = required(
  codecs.union<T.CommandRef>("CommandRef", { 0: ["Id", commandIdRef], 1: ["Param", paramName] }, named("CommandRef")),
);
export const recordPayload = codecs.slots<T.RecordPayload>(
  { 0: ["schema", string], 1: ["bytes", bytes] },
  named("RecordPayload"),
);
const textValue = codecs.slots<T.TextValue>({ 0: ["value", string] }, named("TextValue"));
const numberValue = codecs.slots<T.NumberValue>({ 0: ["value", float64] }, named("NumberValue"));
const boolValue = codecs.slots<T.BoolValue>({ 0: ["value", boolean] }, named("BoolValue"));
const choiceValue = codecs.slots<T.ChoiceValue>({ 0: ["value", string] }, named("ChoiceValue"));
export const inputValue = required(
  codecs.union<T.InputValue>(
    "InputValue",
    { 0: ["Text", textValue], 1: ["Number", numberValue], 2: ["Bool", boolValue], 3: ["Choice", choiceValue] },
    named("InputValue"),
  ),
);
export const capturedInput = codecs.slots<T.CapturedInput>(
  { 0: ["node", string], 1: ["value", inputValue] },
  named("CapturedInput"),
);
export const commandInvocation = codecs.slots<T.CommandInvocation>(
  {
    0: ["invocationId", string],
    1: ["surfaceKey", string],
    2: ["surfaceVersion", version],
    3: ["command", string],
    4: ["payload", recordPayload],
    5: ["captured", list(capturedInput)],
    6: ["client", string],
    7: ["issuedAt", string],
    8: ["delegation", nullable(string)],
  },
  named("CommandInvocation"),
);

// result.rs
const pendingOutcome = codecs.slots<T.PendingOutcome>({ 0: ["message", string] }, named("PendingOutcome"));
const openSurfaceEffect = codecs.slots<T.OpenSurfaceEffect>({ 0: ["key", string] }, named("OpenSurfaceEffect"));
const openExternalEffect = codecs.slots<T.OpenExternalEffect>(
  { 0: ["url", string], 1: ["resume", commandRef] },
  named("OpenExternalEffect"),
);
export const effect = required(
  codecs.union<T.Effect>(
    "Effect",
    { 0: ["OpenSurface", openSurfaceEffect], 1: ["OpenExternal", openExternalEffect] },
    named("Effect"),
  ),
);
const completedOutcome = codecs.slots<T.CompletedOutcome>(
  { 0: ["sourceVersion", nullable(version)], 1: ["clearDrafts", boolean], 2: ["effect", nullable(effect)] },
  named("CompletedOutcome"),
);
const deniedOutcome = codecs.slots<T.DeniedOutcome>(
  { 0: ["reason", string], 1: ["node", nullable(string)] },
  named("DeniedOutcome"),
);
const failedOutcome = codecs.slots<T.FailedOutcome>({ 0: ["reason", string] }, named("FailedOutcome"));
export const outcome = required(
  codecs.union<T.Outcome>(
    "Outcome",
    { 0: ["Pending", pendingOutcome], 1: ["Completed", completedOutcome], 2: ["Denied", deniedOutcome], 3: ["Failed", failedOutcome] },
    named("Outcome"),
  ),
);

// node.rs
export const nodeCommon = codecs.slots<T.NodeCommon>(
  { 0: ["id", string], 1: ["visible", boolSource], 2: ["a11yLabel", nullable(textSource)] },
  named("NodeCommon"),
);

// Node closes its own cycle here and nowhere else.
export const node: Codec<T.Node> = lazy(() => nodeUnion);

const boxNode = codecs.slots<T.BoxNode>(
  { 0: ["common", nodeCommon], 1: ["style", boxStyle], 2: ["paint", paint], 3: ["role", role], 4: ["children", list(node)] },
  named("BoxNode"),
);
const textNode = codecs.slots<T.TextNode>(
  {
    0: ["common", nodeCommon],
    1: ["content", textSource],
    2: ["styleToken", string],
    3: ["wrap", boolean],
    4: ["maxLines", nullable(count)],
    5: ["selectable", boolean],
  },
  named("TextNode"),
);
export const imageFit = required(
  codecs.union<T.ImageFit>(
    "ImageFit",
    { 0: ["Contain", unit], 1: ["Cover", unit], 2: ["Fill", unit], 3: ["Unscaled", unit] },
    named("ImageFit"),
  ),
);
const imageNode = codecs.slots<T.ImageNode>(
  { 0: ["common", nodeCommon], 1: ["catalog", string], 2: ["asset", string], 3: ["fit", imageFit], 4: ["alt", textSource] },
  named("ImageNode"),
);
const buttonNode = codecs.slots<T.ButtonNode>(
  { 0: ["common", nodeCommon], 1: ["content", list(node)], 2: ["onActivate", commandRef], 3: ["enabled", boolSource] },
  named("ButtonNode"),
);
const toggleNode = codecs.slots<T.ToggleNode>(
  { 0: ["common", nodeCommon], 1: ["checked", boolSource], 2: ["onChange", commandRef] },
  named("ToggleNode"),
);
const sliderNode = codecs.slots<T.SliderNode>(
  {
    0: ["common", nodeCommon],
    1: ["min", float64],
    2: ["max", float64],
    3: ["step", float64],
    4: ["value", numberSource],
    5: ["commit", commandRef],
  },
  named("SliderNode"),
);
export const inputKind = required(
  codecs.union<T.InputKind>("InputKind", { 0: ["Text", unit], 1: ["Number", unit] }, named("InputKind")),
);
const textInputNode = codecs.slots<T.TextInputNode>(
  {
    0: ["common", nodeCommon],
    1: ["multiline", boolean],
    2: ["inputKind", inputKind],
    3: ["placeholder", textSource],
    4: ["initial", textSource],
    5: ["submit", commandRef],
  },
  named("TextInputNode"),
);
const selectOption = codecs.slots<T.SelectOption>({ 0: ["value", string], 1: ["label", string] }, named("SelectOption"));
const literalOptions = codecs.slots<T.LiteralOptions>({ 0: ["options", list(selectOption)] }, named("LiteralOptions"));
const boundOptions = codecs.slots<T.BoundOptions>(
  { 0: ["collection", collectionSource], 1: ["valueMember", memberPath], 2: ["labelMember", memberPath] },
  named("BoundOptions"),
);
export const optionList = required(
  codecs.union<T.OptionList>("OptionList", { 0: ["Literal", literalOptions], 1: ["Bound", boundOptions] }, named("OptionList")),
);
const selectNode = codecs.slots<T.SelectNode>(
  { 0: ["common", nodeCommon], 1: ["options", optionList], 2: ["value", bind], 3: ["onChange", commandRef] },
  named("SelectNode"),
);
const repeatNode = codecs.slots<T.RepeatNode>(
  { 0: ["common", nodeCommon], 1: ["collection", collectionSource], 2: ["keyMember", memberPath], 3: ["template", node] },
  named("RepeatNode"),
);
const anchorNode = codecs.slots<T.AnchorNode>({ 0: ["node", string] }, named("AnchorNode"));
export const anchor = required(
  codecs.union<T.Anchor>("Anchor", { 0: ["Viewport", unit], 1: ["Node", anchorNode] }, named("Anchor")),
);
const overlayNode = codecs.slots<T.OverlayNode>(
  {
    0: ["common", nodeCommon],
    1: ["anchor", anchor],
    2: ["modal", boolean],
    3: ["dismiss", commandRef],
    4: ["children", list(node)],
  },
  named("OverlayNode"),
);
export const plotMark = required(
  codecs.union<T.PlotMark>("PlotMark", { 0: ["Line", unit], 1: ["Bar", unit], 2: ["Area", unit] }, named("PlotMark")),
);
const plotNode = codecs.slots<T.PlotNode>(
  {
    0: ["common", nodeCommon],
    1: ["series", bind],
    2: ["mark", plotMark],
    3: ["xMin", nullable(float64)],
    4: ["xMax", nullable(float64)],
    5: ["yMin", nullable(float64)],
    6: ["yMax", nullable(float64)],
  },
  named("PlotNode"),
);
const embedNode = codecs.slots<T.EmbedNode>(
  {
    0: ["common", nodeCommon],
    1: ["slotKind", string],
    2: ["slotId", string],
    3: ["width", float64],
    4: ["height", float64],
  },
  named("EmbedNode"),
);
export const compositionRef = codecs.slots<T.CompositionRef>(
  { 0: ["publisher", string], 1: ["name", segment], 2: ["version", version] },
  named("CompositionRef"),
);
const textArg = codecs.slots<T.TextArg>({ 0: ["value", string] }, named("TextArg"));
const numberArg = codecs.slots<T.NumberArg>({ 0: ["value", float64] }, named("NumberArg"));
const boolArg = codecs.slots<T.BoolArg>({ 0: ["value", boolean] }, named("BoolArg"));
const collectionArg = codecs.slots<T.CollectionArg>({ 0: ["source", collectionSource] }, named("CollectionArg"));
const commandArg = codecs.slots<T.CommandArg>({ 0: ["command", commandRef] }, named("CommandArg"));
const slotArg = codecs.slots<T.SlotArg>({ 0: ["nodes", list(node)] }, named("SlotArg"));
export const argValue = required(
  codecs.union<T.ArgValue>(
    "ArgValue",
    {
      0: ["Text", textArg],
      1: ["Number", numberArg],
      2: ["Bool", boolArg],
      3: ["Bind", bind],
      4: ["Collection", collectionArg],
      5: ["Command", commandArg],
      6: ["Slot", slotArg],
    },
    named("ArgValue"),
  ),
);
export const arg = codecs.slots<T.Arg>({ 0: ["name", string], 1: ["value", argValue] }, named("Arg"));
const useNode = codecs.slots<T.UseNode>(
  { 0: ["common", nodeCommon], 1: ["composition", compositionRef], 2: ["args", list(arg)] },
  named("UseNode"),
);

const nodeUnion = required(
  codecs.union<T.Node>(
    "Node",
    {
      0: ["Box", boxNode],
      1: ["Text", textNode],
      2: ["Image", imageNode],
      3: ["Button", buttonNode],
      4: ["Toggle", toggleNode],
      5: ["Slider", sliderNode],
      6: ["TextInput", textInputNode],
      7: ["Select", selectNode],
      8: ["Repeat", repeatNode],
      9: ["Overlay", overlayNode],
      10: ["Plot", plotNode],
      11: ["Embed", embedNode],
      12: ["Use", useNode],
    },
    named("Node"),
  ),
);

export const paramKind = required(
  codecs.union<T.ParamKind>(
    "ParamKind",
    {
      0: ["Text", unit],
      1: ["Number", unit],
      2: ["Bool", unit],
      3: ["Bind", unit],
      4: ["Collection", unit],
      5: ["Command", unit],
      6: ["Slot", unit],
    },
    named("ParamKind"),
  ),
);
export const paramDecl = codecs.slots<T.ParamDecl>({ 0: ["name", string], 1: ["kind", paramKind] }, named("ParamDecl"));

// The documents' slot records. CommandResult's is in result.ts: it is the one that mints an instance.
export const surfaceDocument = codecs.slots<T.SurfaceDocument>(
  {
    0: ["providerId", string],
    1: ["label", segment],
    2: ["version", version],
    3: ["title", string],
    4: ["root", node],
    5: ["commands", list(commandDecl)],
  },
  named("SurfaceDocument"),
);
export const compositionDocument = codecs.slots<T.CompositionDocument>(
  {
    0: ["publisher", string],
    1: ["name", segment],
    2: ["version", version],
    3: ["params", list(paramDecl)],
    4: ["body", node],
  },
  named("CompositionDocument"),
);
const assetEntry = codecs.slots<T.AssetEntry>(
  { 0: ["id", string], 1: ["mediaType", string], 2: ["uri", string], 3: ["width", count], 4: ["height", count] },
  named("AssetEntry"),
);
export const assetCatalog = codecs.slots<T.AssetCatalog>(
  { 0: ["providerId", string], 1: ["catalogId", segment], 2: ["version", version], 3: ["assets", list(assetEntry)] },
  named("AssetCatalog"),
);
