// One TypeScript type per type of crates/thing-contract. A record is an interface of readonly camelCase fields; a closed
// set is a union discriminated on `kind`, the Rust arm name, and an arm carries its payload's fields beside the tag (a
// unit arm is just the tag). Option<T> is `T | null`, Vec<T> is `readonly T[]`, bytes are a Uint8Array.
//
// The value domains (Seq, Version, Count, Segment, an Rgba channel) are held by the codecs in domain.ts, not by these
// types: a type cannot say "at least 1". Every document is minted and checked by its codec.

type Arm<Kind extends string, Payload = unknown> = { readonly kind: Kind } & Payload;

export type ProviderId = string;
export type SchemaId = string;
export type RecordKey = string;
export type NodeId = string;
export type CommandId = string;

// source.rs
export interface ParamName { readonly name: string }
export interface TextLiteral { readonly value: string }
export interface NumberLiteral { readonly value: number }
export interface BoolLiteral { readonly value: boolean }
export type TextSource = Arm<"Literal", TextLiteral> | Arm<"Bound", Bind> | Arm<"Param", ParamName>;
export type NumberSource = Arm<"Literal", NumberLiteral> | Arm<"Bound", Bind> | Arm<"Param", ParamName>;
export type BoolSource = Arm<"Literal", BoolLiteral> | Arm<"Bound", Bind> | Arm<"Param", ParamName>;
export interface Bind {
  readonly source: StateSource;
  readonly member: MemberPath;
  readonly format: Format | null;
}
export type StateSource = Arm<"Record", StateRef> | Arm<"Item">;
export interface StateRef {
  readonly provider: ProviderId | null;
  readonly schema: SchemaId;
  readonly key: RecordKey;
}
export interface MemberPath { readonly steps: readonly MemberStep[] }
export type MemberStep = Arm<"Name", MemberName> | Arm<"Index", MemberIndex>;
export interface MemberName { readonly name: string }
/** `index` is a Count: at least 0. */
export interface MemberIndex { readonly index: number }
export type Format = Arm<"Number", NumberFormat> | Arm<"Duration"> | Arm<"Timestamp"> | Arm<"Affix", AffixFormat>;
/** `precision` is a Count: at least 0. */
export interface NumberFormat {
  readonly precision: number;
  readonly percent: boolean;
  readonly unit: string | null;
}
export interface AffixFormat { readonly prefix: string; readonly suffix: string }
export type CollectionSource = Arm<"Records", RecordsSource> | Arm<"Member", Bind> | Arm<"Param", ParamName>;
export interface RecordsSource {
  readonly provider: ProviderId | null;
  readonly schema: SchemaId;
  readonly keyPrefix: string;
}

// style.rs
export interface Scalar { readonly value: number }
export type Dimension =
  | Arm<"Px", Scalar>
  | Arm<"Percent", Scalar>
  | Arm<"Fr", Scalar>
  | Arm<"Auto">
  | Arm<"Content">;
export interface Size2 { readonly width: Dimension; readonly height: Dimension }
export interface Edges {
  readonly top: Dimension;
  readonly right: Dimension;
  readonly bottom: Dimension;
  readonly left: Dimension;
}
export type Display = Arm<"Flex"> | Arm<"Grid"> | Arm<"Block">;
export type Direction = Arm<"Row"> | Arm<"Column"> | Arm<"RowReverse"> | Arm<"ColumnReverse">;
export type Wrap = Arm<"NoWrap"> | Arm<"Wrap"> | Arm<"WrapReverse">;
export type Position = Arm<"Relative"> | Arm<"Absolute">;
export type Overflow = Arm<"Visible"> | Arm<"Clip"> | Arm<"Scroll">;
export type ItemAlign = Arm<"Auto"> | Arm<"Start"> | Arm<"End"> | Arm<"Center"> | Arm<"Stretch"> | Arm<"Baseline">;
export type ContentAlign =
  | Arm<"Auto">
  | Arm<"Start">
  | Arm<"End">
  | Arm<"Center">
  | Arm<"Stretch">
  | Arm<"SpaceBetween">
  | Arm<"SpaceAround">
  | Arm<"SpaceEvenly">;
export interface BoxStyle {
  readonly display: Display;
  readonly direction: Direction;
  readonly wrap: Wrap;
  readonly gap: Size2;
  readonly padding: Edges;
  readonly margin: Edges;
  readonly size: Size2;
  readonly minSize: Size2;
  readonly maxSize: Size2;
  readonly position: Position;
  readonly inset: Edges;
  readonly overflow: Overflow;
  readonly alignItems: ItemAlign;
  readonly alignSelf: ItemAlign;
  readonly alignContent: ContentAlign;
  readonly justifyContent: ContentAlign;
  readonly grow: number;
  readonly shrink: number;
  readonly basis: Dimension;
  readonly gridColumns: readonly Dimension[];
  readonly gridRows: readonly Dimension[];
}
export interface ThemeToken { readonly name: string }
/** Each channel is a byte: 0 to 255. */
export interface Rgba { readonly r: number; readonly g: number; readonly b: number; readonly a: number }
export type ColorRef = Arm<"Token", ThemeToken> | Arm<"Rgba", Rgba>;
export interface Border { readonly color: ColorRef; readonly width: number }
export interface Paint {
  readonly background: ColorRef | null;
  readonly border: Border | null;
  readonly radius: number;
}
export type Role =
  | Arm<"Group">
  | Arm<"Region">
  | Arm<"List">
  | Arm<"ListItem">
  | Arm<"Heading">
  | Arm<"Dialog">
  | Arm<"Toolbar">;

// command.rs
export interface CommandDecl {
  readonly id: CommandId;
  readonly payloadSchema: SchemaId;
  readonly captures: readonly NodeId[];
  readonly confirm: string | null;
}
export interface CommandIdRef { readonly id: CommandId }
export type CommandRef = Arm<"Id", CommandIdRef> | Arm<"Param", ParamName>;
export interface RecordPayload { readonly schema: SchemaId; readonly bytes: Uint8Array }
export interface TextValue { readonly value: string }
export interface NumberValue { readonly value: number }
export interface BoolValue { readonly value: boolean }
export interface ChoiceValue { readonly value: string }
export type InputValue = Arm<"Text", TextValue> | Arm<"Number", NumberValue> | Arm<"Bool", BoolValue> | Arm<"Choice", ChoiceValue>;
export interface CapturedInput { readonly node: NodeId; readonly value: InputValue }
/**
 * A consumer's request that a provider run a declared command. Its fields are plain, so a result's copy of
 * `invocationId` is a convenience and not provenance: core binds results to the invocations it issued.
 * `surfaceVersion` is a Version: at least 0.
 */
export interface CommandInvocation {
  readonly invocationId: string;
  readonly surfaceKey: string;
  readonly surfaceVersion: number | bigint;
  readonly command: CommandId;
  readonly payload: RecordPayload;
  readonly captured: readonly CapturedInput[];
  readonly client: string;
  readonly issuedAt: string;
  readonly delegation: string | null;
}

// result.rs
export interface PendingOutcome { readonly message: string }
/** `sourceVersion` is a Version: at least 0. */
export interface CompletedOutcome {
  readonly sourceVersion: number | bigint | null;
  readonly clearDrafts: boolean;
  readonly effect: Effect | null;
}
export interface DeniedOutcome { readonly reason: string; readonly node: NodeId | null }
export interface FailedOutcome { readonly reason: string }
export type Outcome =
  | Arm<"Pending", PendingOutcome>
  | Arm<"Completed", CompletedOutcome>
  | Arm<"Denied", DeniedOutcome>
  | Arm<"Failed", FailedOutcome>;
export interface OpenSurfaceEffect { readonly key: string }
export interface OpenExternalEffect { readonly url: string; readonly resume: CommandRef }
export type Effect = Arm<"OpenSurface", OpenSurfaceEffect> | Arm<"OpenExternal", OpenExternalEffect>;

/** A provider's handler for one invocation: the outcome it answers with. */
export type Handler = (invocation: CommandInvocation) => Outcome | Promise<Outcome>;

// node.rs
export interface NodeCommon {
  readonly id: NodeId;
  readonly visible: BoolSource;
  readonly a11yLabel: TextSource | null;
}
export type Node =
  | Arm<"Box", BoxNode>
  | Arm<"Text", TextNode>
  | Arm<"Image", ImageNode>
  | Arm<"Button", ButtonNode>
  | Arm<"Toggle", ToggleNode>
  | Arm<"Slider", SliderNode>
  | Arm<"TextInput", TextInputNode>
  | Arm<"Select", SelectNode>
  | Arm<"Repeat", RepeatNode>
  | Arm<"Overlay", OverlayNode>
  | Arm<"Plot", PlotNode>
  | Arm<"Embed", EmbedNode>
  | Arm<"Use", UseNode>;
export interface BoxNode {
  readonly common: NodeCommon;
  readonly style: BoxStyle;
  readonly paint: Paint;
  readonly role: Role;
  readonly children: readonly Node[];
}
/** `maxLines` is a Count: at least 0. */
export interface TextNode {
  readonly common: NodeCommon;
  readonly content: TextSource;
  readonly styleToken: string;
  readonly wrap: boolean;
  readonly maxLines: number | null;
  readonly selectable: boolean;
}
export type ImageFit = Arm<"Contain"> | Arm<"Cover"> | Arm<"Fill"> | Arm<"Unscaled">;
export interface ImageNode {
  readonly common: NodeCommon;
  readonly catalog: string;
  readonly asset: string;
  readonly fit: ImageFit;
  readonly alt: TextSource;
}
export interface ButtonNode {
  readonly common: NodeCommon;
  readonly content: readonly Node[];
  readonly onActivate: CommandRef;
  readonly enabled: BoolSource;
}
export interface ToggleNode {
  readonly common: NodeCommon;
  readonly checked: BoolSource;
  readonly onChange: CommandRef;
}
export interface SliderNode {
  readonly common: NodeCommon;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: NumberSource;
  readonly commit: CommandRef;
}
export type InputKind = Arm<"Text"> | Arm<"Number">;
/**
 * The Rust field is `kind`; here it is `inputKind`, because a TextInput arm carries its payload beside the union's own
 * `kind` tag and the two cannot share a name.
 */
export interface TextInputNode {
  readonly common: NodeCommon;
  readonly multiline: boolean;
  readonly inputKind: InputKind;
  readonly placeholder: TextSource;
  readonly initial: TextSource;
  readonly submit: CommandRef;
}
export interface SelectOption { readonly value: string; readonly label: string }
export interface LiteralOptions { readonly options: readonly SelectOption[] }
export interface BoundOptions {
  readonly collection: CollectionSource;
  readonly valueMember: MemberPath;
  readonly labelMember: MemberPath;
}
export type OptionList = Arm<"Literal", LiteralOptions> | Arm<"Bound", BoundOptions>;
export interface SelectNode {
  readonly common: NodeCommon;
  readonly options: OptionList;
  readonly value: Bind;
  readonly onChange: CommandRef;
}
export interface RepeatNode {
  readonly common: NodeCommon;
  readonly collection: CollectionSource;
  readonly keyMember: MemberPath;
  readonly template: Node;
}
export interface AnchorNode { readonly node: NodeId }
export type Anchor = Arm<"Viewport"> | Arm<"Node", AnchorNode>;
export interface OverlayNode {
  readonly common: NodeCommon;
  readonly anchor: Anchor;
  readonly modal: boolean;
  readonly dismiss: CommandRef;
  readonly children: readonly Node[];
}
export type PlotMark = Arm<"Line"> | Arm<"Bar"> | Arm<"Area">;
export interface PlotNode {
  readonly common: NodeCommon;
  readonly series: Bind;
  readonly mark: PlotMark;
  readonly xMin: number | null;
  readonly xMax: number | null;
  readonly yMin: number | null;
  readonly yMax: number | null;
}
export interface EmbedNode {
  readonly common: NodeCommon;
  readonly slotKind: string;
  readonly slotId: string;
  readonly width: number;
  readonly height: number;
}
/** `name` is a Segment (non-empty, no '.'); `version` is a Version (at least 0). */
export interface CompositionRef {
  readonly publisher: string;
  readonly name: string;
  readonly version: number | bigint;
}
export interface UseNode {
  readonly common: NodeCommon;
  readonly composition: CompositionRef;
  readonly args: readonly Arg[];
}
export interface Arg { readonly name: string; readonly value: ArgValue }
export interface TextArg { readonly value: string }
export interface NumberArg { readonly value: number }
export interface BoolArg { readonly value: boolean }
export interface CollectionArg { readonly source: CollectionSource }
export interface CommandArg { readonly command: CommandRef }
export interface SlotArg { readonly nodes: readonly Node[] }
export type ArgValue =
  | Arm<"Text", TextArg>
  | Arm<"Number", NumberArg>
  | Arm<"Bool", BoolArg>
  | Arm<"Bind", Bind>
  | Arm<"Collection", CollectionArg>
  | Arm<"Command", CommandArg>
  | Arm<"Slot", SlotArg>;
export type ParamKind =
  | Arm<"Text">
  | Arm<"Number">
  | Arm<"Bool">
  | Arm<"Bind">
  | Arm<"Collection">
  | Arm<"Command">
  | Arm<"Slot">;
export interface ParamDecl { readonly name: string; readonly kind: ParamKind }

// The documents. `label`, `name` and `catalogId` are Segments, `version` a Version, an extent a Count. The fifth
// document, CommandResult, is a class (result.ts).
export interface SurfaceDocument {
  readonly providerId: ProviderId;
  readonly label: string;
  readonly version: number | bigint;
  readonly title: string;
  readonly root: Node;
  readonly commands: readonly CommandDecl[];
}
export interface CompositionDocument {
  readonly publisher: string;
  readonly name: string;
  readonly version: number | bigint;
  readonly params: readonly ParamDecl[];
  readonly body: Node;
}
export interface AssetEntry {
  readonly id: string;
  readonly mediaType: string;
  readonly uri: string;
  readonly width: number;
  readonly height: number;
}
export interface AssetCatalog {
  readonly providerId: ProviderId;
  readonly catalogId: string;
  readonly version: number | bigint;
  readonly assets: readonly AssetEntry[];
}
