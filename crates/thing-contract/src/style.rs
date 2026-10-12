//! Box layout and paint as plain data. The crate holds no layout engine: core maps `BoxStyle`
//! onto its solver.

use cultcache_rs::{CultSlots, CultUnion};

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct Scalar {
    #[cultcache(key = 0)]
    pub value: f64,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Dimension {
    #[cultcache(key = 0)]
    Px(Scalar),
    #[cultcache(key = 1)]
    Percent(Scalar),
    #[cultcache(key = 2)]
    Fr(Scalar),
    #[cultcache(key = 3)]
    Auto,
    #[cultcache(key = 4)]
    Content,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct Size2 {
    #[cultcache(key = 0)]
    pub width: Dimension,
    #[cultcache(key = 1)]
    pub height: Dimension,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct Edges {
    #[cultcache(key = 0)]
    pub top: Dimension,
    #[cultcache(key = 1)]
    pub right: Dimension,
    #[cultcache(key = 2)]
    pub bottom: Dimension,
    #[cultcache(key = 3)]
    pub left: Dimension,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Display {
    #[cultcache(key = 0)]
    Flex,
    #[cultcache(key = 1)]
    Grid,
    #[cultcache(key = 2)]
    Block,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Direction {
    #[cultcache(key = 0)]
    Row,
    #[cultcache(key = 1)]
    Column,
    #[cultcache(key = 2)]
    RowReverse,
    #[cultcache(key = 3)]
    ColumnReverse,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Wrap {
    #[cultcache(key = 0)]
    NoWrap,
    #[cultcache(key = 1)]
    Wrap,
    #[cultcache(key = 2)]
    WrapReverse,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Position {
    #[cultcache(key = 0)]
    Relative,
    #[cultcache(key = 1)]
    Absolute,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Overflow {
    #[cultcache(key = 0)]
    Visible,
    #[cultcache(key = 1)]
    Clip,
    #[cultcache(key = 2)]
    Scroll,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum ItemAlign {
    #[cultcache(key = 0)]
    Auto,
    #[cultcache(key = 1)]
    Start,
    #[cultcache(key = 2)]
    End,
    #[cultcache(key = 3)]
    Center,
    #[cultcache(key = 4)]
    Stretch,
    #[cultcache(key = 5)]
    Baseline,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum ContentAlign {
    #[cultcache(key = 0)]
    Auto,
    #[cultcache(key = 1)]
    Start,
    #[cultcache(key = 2)]
    End,
    #[cultcache(key = 3)]
    Center,
    #[cultcache(key = 4)]
    Stretch,
    #[cultcache(key = 5)]
    SpaceBetween,
    #[cultcache(key = 6)]
    SpaceAround,
    #[cultcache(key = 7)]
    SpaceEvenly,
}

/// The layout of a box. `gap` is the column gap in `width` and the row gap in `height`.
/// `grid_columns` and `grid_rows` are the grid tracks and are read only when `display` is Grid.
#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct BoxStyle {
    #[cultcache(key = 0)]
    pub display: Display,
    #[cultcache(key = 1)]
    pub direction: Direction,
    #[cultcache(key = 2)]
    pub wrap: Wrap,
    #[cultcache(key = 3)]
    pub gap: Size2,
    #[cultcache(key = 4)]
    pub padding: Edges,
    #[cultcache(key = 5)]
    pub margin: Edges,
    #[cultcache(key = 6)]
    pub size: Size2,
    #[cultcache(key = 7)]
    pub min_size: Size2,
    #[cultcache(key = 8)]
    pub max_size: Size2,
    #[cultcache(key = 9)]
    pub position: Position,
    #[cultcache(key = 10)]
    pub inset: Edges,
    #[cultcache(key = 11)]
    pub overflow: Overflow,
    #[cultcache(key = 12)]
    pub align_items: ItemAlign,
    #[cultcache(key = 13)]
    pub align_self: ItemAlign,
    #[cultcache(key = 14)]
    pub align_content: ContentAlign,
    #[cultcache(key = 15)]
    pub justify_content: ContentAlign,
    #[cultcache(key = 16)]
    pub grow: f64,
    #[cultcache(key = 17)]
    pub shrink: f64,
    #[cultcache(key = 18)]
    pub basis: Dimension,
    #[cultcache(key = 19)]
    pub grid_columns: Vec<Dimension>,
    #[cultcache(key = 20)]
    pub grid_rows: Vec<Dimension>,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct ThemeToken {
    #[cultcache(key = 0)]
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct Rgba {
    #[cultcache(key = 0)]
    pub r: u8,
    #[cultcache(key = 1)]
    pub g: u8,
    #[cultcache(key = 2)]
    pub b: u8,
    #[cultcache(key = 3)]
    pub a: u8,
}

#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum ColorRef {
    #[cultcache(key = 0)]
    Token(ThemeToken),
    #[cultcache(key = 1)]
    Rgba(Rgba),
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct Border {
    #[cultcache(key = 0)]
    pub color: ColorRef,
    #[cultcache(key = 1)]
    pub width: f64,
}

#[derive(Clone, Debug, PartialEq, CultSlots)]
pub struct Paint {
    #[cultcache(key = 0)]
    pub background: Option<ColorRef>,
    #[cultcache(key = 1)]
    pub border: Option<Border>,
    #[cultcache(key = 2)]
    pub radius: f64,
}

/// The accessibility role of a box. The accessibility tree itself is core's.
#[derive(Clone, Debug, PartialEq, CultUnion)]
pub enum Role {
    #[cultcache(key = 0)]
    Group,
    #[cultcache(key = 1)]
    Region,
    #[cultcache(key = 2)]
    List,
    #[cultcache(key = 3)]
    ListItem,
    #[cultcache(key = 4)]
    Heading,
    #[cultcache(key = 5)]
    Dialog,
    #[cultcache(key = 6)]
    Toolbar,
}
