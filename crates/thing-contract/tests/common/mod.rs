//! Constructors for the values the goldens and the other tests share. Every value is built
//! through the crate's public types; no bytes are spelled here.

#![allow(dead_code)]

use thing_contract::*;

pub fn nid(id: &str) -> NodeId {
    NodeId::new(id)
}

pub fn lit_text(value: &str) -> TextSource {
    TextSource::Literal(TextLiteral { value: value.into() })
}

pub fn lit_bool(value: bool) -> BoolSource {
    BoolSource::Literal(BoolLiteral { value })
}

pub fn lit_number(value: f64) -> NumberSource {
    NumberSource::Literal(NumberLiteral { value })
}

pub fn param(name: &str) -> ParamName {
    ParamName { name: name.into() }
}

pub fn path(names: &[&str]) -> MemberPath {
    MemberPath { steps: names.iter().map(|name| MemberStep::Name(MemberName { name: (*name).into() })).collect() }
}

pub fn record_bind(member: MemberPath, format: Option<Format>) -> Bind {
    Bind {
        source: StateSource::Record(StateRef {
            provider: Some(ProviderId::new("provider.a")),
            schema: SchemaId::new("gamecult.thing.test.v1"),
            key: RecordKey::new("row-1"),
        }),
        member,
        format,
    }
}

pub fn item_bind(member: MemberPath) -> Bind {
    Bind { source: StateSource::Item, member, format: None }
}

pub fn command(id: &str) -> CommandRef {
    CommandRef::Id(CommandIdRef { id: CommandId::new(id) })
}

pub fn common(id: &str) -> NodeCommon {
    NodeCommon { id: nid(id), visible: lit_bool(true), a11y_label: None }
}

pub fn px(value: f64) -> Dimension {
    Dimension::Px(Scalar { value })
}

pub fn size2(width: Dimension, height: Dimension) -> Size2 {
    Size2 { width, height }
}

pub fn edges(all: Dimension) -> Edges {
    Edges { top: all.clone(), right: all.clone(), bottom: all.clone(), left: all }
}

pub fn style() -> BoxStyle {
    BoxStyle {
        display: Display::Flex,
        direction: Direction::Column,
        wrap: Wrap::NoWrap,
        gap: size2(px(4.0), px(8.0)),
        padding: edges(px(2.0)),
        margin: edges(Dimension::Auto),
        size: size2(Dimension::Percent(Scalar { value: 100.0 }), Dimension::Content),
        min_size: size2(px(0.0), px(0.0)),
        max_size: size2(Dimension::Auto, Dimension::Auto),
        position: Position::Relative,
        inset: edges(Dimension::Auto),
        overflow: Overflow::Visible,
        align_items: ItemAlign::Stretch,
        align_self: ItemAlign::Auto,
        align_content: ContentAlign::Start,
        justify_content: ContentAlign::SpaceBetween,
        grow: 1.0,
        shrink: 0.0,
        basis: Dimension::Auto,
        grid_columns: vec![],
        grid_rows: vec![],
    }
}

pub fn plain_paint() -> Paint {
    Paint { background: None, border: None, radius: 0.0 }
}

pub fn boxed(id: &str, children: Vec<Node>) -> Node {
    Node::Box(BoxNode { common: common(id), style: style(), paint: plain_paint(), role: Role::Group, children })
}

pub fn text(id: &str, content: &str) -> Node {
    Node::Text(TextNode {
        common: common(id),
        content: lit_text(content),
        style_token: "body".into(),
        wrap: true,
        max_lines: None,
        selectable: false,
    })
}

pub fn invocation() -> CommandInvocation {
    CommandInvocation {
        invocation_id: "3f2b8c1e-5d44-4a6b-9a07-1c2d3e4f5a6b".into(),
        surface_key: "thing:surface:provider.a.main".into(),
        surface_version: 7,
        command: CommandId::new("go"),
        payload: RecordPayload { schema: SchemaId::new("gamecult.thing.test.go.v1"), bytes: vec![0x91, 0x01, 0xff, 0x00] },
        captured: vec![
            CapturedInput { node: nid("name-input"), value: InputValue::Text(TextValue { value: "Ada".into() }) },
            CapturedInput { node: nid("level"), value: InputValue::Number(NumberValue { value: 0.75 }) },
            CapturedInput { node: nid("flag"), value: InputValue::Bool(BoolValue { value: true }) },
            CapturedInput { node: nid("pick"), value: InputValue::Choice(ChoiceValue { value: "a".into() }) },
        ],
        client: "renderer.web".into(),
        issued_at: "2026-01-01T00:00:00Z".into(),
        delegation: Some("delegate-1".into()),
    }
}
