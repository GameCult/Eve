//! Thing Script: the closed node union, the surface document that holds a tree of nodes, and the
//! composition document that names a reusable subtree. Arm keys are fixed for v1.

use cultcache_rs::{CultSlots, CultUnion, DatabaseEntry};

use crate::domain::{Count, Segment, Version};
use crate::command::{CommandDecl, CommandRef};
use crate::keys::{NodeId, ProviderId, composition_key, surface_key};
use crate::source::{Bind, BoolSource, CollectionSource, MemberPath, NumberSource, TextSource};
use crate::style::{BoxStyle, Paint, Role};

/// What every node carries.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct NodeCommon {
    #[cultcache(key = 0)]
    pub id: NodeId,
    #[cultcache(key = 1)]
    pub visible: BoolSource,
    #[cultcache(key = 2)]
    pub a11y_label: Option<TextSource>,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Node {
    #[cultcache(key = 0)]
    Box(BoxNode),
    #[cultcache(key = 1)]
    Text(TextNode),
    #[cultcache(key = 2)]
    Image(ImageNode),
    #[cultcache(key = 3)]
    Button(ButtonNode),
    #[cultcache(key = 4)]
    Toggle(ToggleNode),
    #[cultcache(key = 5)]
    Slider(SliderNode),
    #[cultcache(key = 6)]
    TextInput(TextInputNode),
    #[cultcache(key = 7)]
    Select(SelectNode),
    #[cultcache(key = 8)]
    Repeat(RepeatNode),
    #[cultcache(key = 9)]
    Overlay(OverlayNode),
    #[cultcache(key = 10)]
    Plot(PlotNode),
    #[cultcache(key = 11)]
    Embed(EmbedNode),
    #[cultcache(key = 12)]
    Use(UseNode),
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct BoxNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub style: BoxStyle,
    #[cultcache(key = 2)]
    pub paint: Paint,
    #[cultcache(key = 3)]
    pub role: Role,
    #[cultcache(key = 4)]
    pub children: Vec<Node>,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct TextNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub content: TextSource,
    #[cultcache(key = 2)]
    pub style_token: String,
    #[cultcache(key = 3)]
    pub wrap: bool,
    #[cultcache(key = 4)]
    pub max_lines: Option<Count>,
    #[cultcache(key = 5)]
    pub selectable: bool,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum ImageFit {
    #[cultcache(key = 0)]
    Contain,
    #[cultcache(key = 1)]
    Cover,
    #[cultcache(key = 2)]
    Fill,
    #[cultcache(key = 3)]
    Unscaled,
}

/// An asset of a catalog, with the alternative text a reader without the picture needs.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct ImageNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub catalog: String,
    #[cultcache(key = 2)]
    pub asset: String,
    #[cultcache(key = 3)]
    pub fit: ImageFit,
    #[cultcache(key = 4)]
    pub alt: TextSource,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct ButtonNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub content: Vec<Node>,
    #[cultcache(key = 2)]
    pub on_activate: CommandRef,
    #[cultcache(key = 3)]
    pub enabled: BoolSource,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct ToggleNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub checked: BoolSource,
    #[cultcache(key = 2)]
    pub on_change: CommandRef,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct SliderNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub min: f64,
    #[cultcache(key = 2)]
    pub max: f64,
    #[cultcache(key = 3)]
    pub step: f64,
    #[cultcache(key = 4)]
    pub value: NumberSource,
    #[cultcache(key = 5)]
    pub commit: CommandRef,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum InputKind {
    #[cultcache(key = 0)]
    Text,
    #[cultcache(key = 1)]
    Number,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct TextInputNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub multiline: bool,
    #[cultcache(key = 2)]
    pub kind: InputKind,
    #[cultcache(key = 3)]
    pub placeholder: TextSource,
    #[cultcache(key = 4)]
    pub initial: TextSource,
    #[cultcache(key = 5)]
    pub submit: CommandRef,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct SelectOption {
    #[cultcache(key = 0)]
    pub value: String,
    #[cultcache(key = 1)]
    pub label: String,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct LiteralOptions {
    #[cultcache(key = 0)]
    pub options: Vec<SelectOption>,
}

/// Options read from a collection: each item's value and label are members of the item.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct BoundOptions {
    #[cultcache(key = 0)]
    pub collection: CollectionSource,
    #[cultcache(key = 1)]
    pub value_member: MemberPath,
    #[cultcache(key = 2)]
    pub label_member: MemberPath,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum OptionList {
    #[cultcache(key = 0)]
    Literal(LiteralOptions),
    #[cultcache(key = 1)]
    Bound(BoundOptions),
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct SelectNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub options: OptionList,
    #[cultcache(key = 2)]
    pub value: Bind,
    #[cultcache(key = 3)]
    pub on_change: CommandRef,
}

/// The template is instantiated once per item of the collection, keyed by `key_member` of the item.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct RepeatNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub collection: CollectionSource,
    #[cultcache(key = 2)]
    pub key_member: MemberPath,
    #[cultcache(key = 3)]
    pub template: std::boxed::Box<Node>,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct AnchorNode {
    #[cultcache(key = 0)]
    pub node: NodeId,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Anchor {
    #[cultcache(key = 0)]
    Viewport,
    #[cultcache(key = 1)]
    Node(AnchorNode),
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct OverlayNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub anchor: Anchor,
    #[cultcache(key = 2)]
    pub modal: bool,
    #[cultcache(key = 3)]
    pub dismiss: CommandRef,
    #[cultcache(key = 4)]
    pub children: Vec<Node>,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum PlotMark {
    #[cultcache(key = 0)]
    Line,
    #[cultcache(key = 1)]
    Bar,
    #[cultcache(key = 2)]
    Area,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct PlotNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    /// A numeric list member of a record.
    #[cultcache(key = 1)]
    pub series: Bind,
    #[cultcache(key = 2)]
    pub mark: PlotMark,
    #[cultcache(key = 3)]
    pub x_min: Option<f64>,
    #[cultcache(key = 4)]
    pub x_max: Option<f64>,
    #[cultcache(key = 5)]
    pub y_min: Option<f64>,
    #[cultcache(key = 6)]
    pub y_max: Option<f64>,
}

/// A leaf the host draws: `slot_kind` is a name the host declares it supports.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct EmbedNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub slot_kind: String,
    #[cultcache(key = 2)]
    pub slot_id: String,
    #[cultcache(key = 3)]
    pub width: f64,
    #[cultcache(key = 4)]
    pub height: f64,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct CompositionRef {
    #[cultcache(key = 0)]
    pub publisher: String,
    #[cultcache(key = 1)]
    pub name: Segment,
    #[cultcache(key = 2)]
    pub version: Version,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct UseNode {
    #[cultcache(key = 0)]
    pub common: NodeCommon,
    #[cultcache(key = 1)]
    pub composition: CompositionRef,
    #[cultcache(key = 2)]
    pub args: Vec<Arg>,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct Arg {
    #[cultcache(key = 0)]
    pub name: String,
    #[cultcache(key = 1)]
    pub value: ArgValue,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct TextArg {
    #[cultcache(key = 0)]
    pub value: String,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct NumberArg {
    #[cultcache(key = 0)]
    pub value: f64,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct BoolArg {
    #[cultcache(key = 0)]
    pub value: bool,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct CollectionArg {
    #[cultcache(key = 0)]
    pub source: CollectionSource,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct CommandArg {
    #[cultcache(key = 0)]
    pub command: CommandRef,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct SlotArg {
    #[cultcache(key = 0)]
    pub nodes: Vec<Node>,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum ArgValue {
    #[cultcache(key = 0)]
    Text(TextArg),
    #[cultcache(key = 1)]
    Number(NumberArg),
    #[cultcache(key = 2)]
    Bool(BoolArg),
    #[cultcache(key = 3)]
    Bind(Bind),
    #[cultcache(key = 4)]
    Collection(CollectionArg),
    #[cultcache(key = 5)]
    Command(CommandArg),
    #[cultcache(key = 6)]
    Slot(SlotArg),
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum ParamKind {
    #[cultcache(key = 0)]
    Text,
    #[cultcache(key = 1)]
    Number,
    #[cultcache(key = 2)]
    Bool,
    #[cultcache(key = 3)]
    Bind,
    #[cultcache(key = 4)]
    Collection,
    #[cultcache(key = 5)]
    Command,
    #[cultcache(key = 6)]
    Slot,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct ParamDecl {
    #[cultcache(key = 0)]
    pub name: String,
    #[cultcache(key = 1)]
    pub kind: ParamKind,
}

/// A provider's surface: a tree of nodes and the commands it declares. A change of structure
/// republishes the record with a higher `version`.
#[derive(Clone, Debug, PartialEq, DatabaseEntry)]
#[cultcache(type = "gamecult.thing.surface", schema = "gamecult.thing.surface.v1")]
pub struct SurfaceDocument {
    #[cultcache(key = 0)]
    pub provider_id: ProviderId,
    #[cultcache(key = 1)]
    pub label: Segment,
    #[cultcache(key = 2)]
    pub version: Version,
    #[cultcache(key = 3)]
    pub title: String,
    #[cultcache(key = 4)]
    pub root: Node,
    #[cultcache(key = 5)]
    pub commands: Vec<CommandDecl>,
}

impl SurfaceDocument {
    pub fn record_key(&self) -> String {
        surface_key(&self.provider_id, &self.label)
    }
}

/// A reusable subtree with typed parameters. Compositions never own commands.
#[derive(Clone, Debug, PartialEq, DatabaseEntry)]
#[cultcache(type = "gamecult.thing.composition", schema = "gamecult.thing.composition.v1")]
pub struct CompositionDocument {
    #[cultcache(key = 0)]
    pub publisher: String,
    #[cultcache(key = 1)]
    pub name: Segment,
    #[cultcache(key = 2)]
    pub version: Version,
    #[cultcache(key = 3)]
    pub params: Vec<ParamDecl>,
    #[cultcache(key = 4)]
    pub body: Node,
}

impl CompositionDocument {
    pub fn record_key(&self) -> String {
        composition_key(&self.publisher, &self.name, self.version)
    }
}
