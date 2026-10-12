//! The goldens: payload bytes written by this crate and nobody else, then compared byte for
//! byte. The TypeScript and C# packages and core are held to these files; none of them writes
//! one. `THING_BLESS=1` rewrites them; any other run compares.

mod common;

use std::collections::BTreeSet;
use std::fmt::Debug;
use std::path::PathBuf;

use common::*;
use cultcache_rs::{CultCache, CultCacheEnvelope, CultCacheRegistry, DatabaseEntry, SingleFileMessagePackBackingStore};
use thing_contract::*;

const PINNED_CLOCK: &str = "2026-01-01T00:00:00Z";
// A value that must never appear in a refusal.
const CANARY: &str = "CANARY-7f3a91c2";

fn goldens_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/goldens")
}

fn blessing() -> bool {
    std::env::var("THING_BLESS").as_deref() == Ok("1")
}

/// Bless the file or compare against it. Returns the committed bytes.
fn golden_bytes(file: &str, produced: &[u8]) -> Vec<u8> {
    let path = goldens_dir().join(file);
    if blessing() {
        std::fs::write(&path, produced).unwrap_or_else(|error| panic!("{file}: {error}"));
    }
    let committed = std::fs::read(&path).unwrap_or_else(|error| panic!("{file}: {error}"));
    assert_eq!(committed, produced, "{file}: the committed golden differs from what the crate writes");
    committed
}

fn golden<T: DatabaseEntry + PartialEq + Debug>(name: &str, value: &T) -> String {
    let produced = rmp_serde::to_vec(value).unwrap();
    let committed = golden_bytes(&format!("{name}.bin"), &produced);
    let decoded: T = rmp_serde::from_slice(&committed).unwrap_or_else(|error| panic!("{name}: {error}"));
    assert_eq!(&decoded, value, "{name}: the golden does not decode to the constructed value");
    assert_eq!(rmp_serde::to_vec(&decoded).unwrap(), committed, "{name}: re-encoding changed the bytes");
    name.to_string()
}

fn bind_all_formats() -> Vec<Bind> {
    let number = Format::Number(NumberFormat { precision: count(2), percent: true, unit: Some("ms".into()) });
    let affix = Format::Affix(AffixFormat { prefix: "$".into(), suffix: "/s".into() });
    let indexed = MemberPath {
        steps: vec![
            MemberStep::Name(MemberName { name: "items".into() }),
            MemberStep::Index(MemberIndex { index: count(3) }),
        ],
    };
    vec![
        record_bind(indexed, Some(number)),
        record_bind(path(&["elapsed"]), Some(Format::Duration)),
        record_bind(path(&["at"]), Some(Format::Timestamp)),
        record_bind(path(&["price"]), Some(affix)),
        record_bind(path(&["plain"]), None),
        item_bind(path(&["name"])),
    ]
}

/// A surface using all 13 node arms, nested more than four deep, with every source arm.
fn full_surface() -> SurfaceDocument {
    let binds = bind_all_formats();
    let bound_text = TextSource::Bound(binds[3].clone());
    let bound_bool = BoolSource::Bound(binds[4].clone());
    let bound_number = NumberSource::Bound(binds[0].clone());

    let mut painted = BoxNode {
        common: NodeCommon {
            id: nid("painted"),
            visible: BoolSource::Param(param("show")),
            a11y_label: Some(TextSource::Param(param("label"))),
        },
        style: style(),
        paint: Paint {
            background: Some(ColorRef::Token(ThemeToken { name: "surface.raised".into() })),
            border: Some(Border { color: ColorRef::Rgba(Rgba { r: 1, g: 2, b: 3, a: 255 }), width: 1.5 }),
            radius: 4.0,
        },
        role: Role::Region,
        children: vec![],
    };
    painted.style.display = Display::Grid;
    painted.style.grid_columns = vec![Dimension::Fr(Scalar { value: 1.0 }), px(120.0)];
    painted.style.grid_rows = vec![Dimension::Content];
    painted.style.position = Position::Absolute;
    painted.style.overflow = Overflow::Scroll;
    painted.style.direction = Direction::RowReverse;
    painted.style.wrap = Wrap::WrapReverse;
    painted.style.align_items = ItemAlign::Baseline;
    painted.style.align_self = ItemAlign::Center;
    painted.style.align_content = ContentAlign::SpaceAround;
    painted.style.justify_content = ContentAlign::SpaceEvenly;
    painted.children = vec![text("deep-text", "deep")];

    let repeat = Node::Repeat(RepeatNode {
        common: common("rows"),
        collection: CollectionSource::Records(RecordsSource {
            provider: None,
            schema: SchemaId::new("gamecult.thing.test.v1"),
            key_prefix: "row-".into(),
        }),
        key_member: path(&["id"]),
        template: std::boxed::Box::new(Node::Text(TextNode {
            common: common("row-name"),
            content: TextSource::Bound(item_bind(path(&["name"]))),
            style_token: "body".into(),
            wrap: false,
            max_lines: Some(count(2)),
            selectable: true,
        })),
    });

    let leaves = vec![
        Node::Text(TextNode {
            common: common("t-bound"),
            content: bound_text,
            style_token: "label".into(),
            wrap: true,
            max_lines: None,
            selectable: false,
        }),
        Node::Image(ImageNode {
            common: common("img"),
            catalog: "icons".into(),
            asset: "gear".into(),
            fit: ImageFit::Cover,
            alt: lit_text("a gear"),
        }),
        Node::Button(ButtonNode {
            common: common("go"),
            content: vec![text("go-label", "Go")],
            on_activate: command("go"),
            enabled: bound_bool.clone(),
        }),
        Node::Toggle(ToggleNode { common: common("flag"), checked: bound_bool, on_change: CommandRef::Param(param("toggle")) }),
        Node::Slider(SliderNode {
            common: common("level"),
            min: 0.0,
            max: 1.0,
            step: 0.25,
            value: bound_number,
            commit: command("set-level"),
        }),
        Node::TextInput(TextInputNode {
            common: common("name-input"),
            multiline: true,
            kind: InputKind::Number,
            placeholder: lit_text("name"),
            initial: TextSource::Param(param("initial")),
            submit: command("rename"),
        }),
        Node::TextInput(TextInputNode {
            common: common("title-input"),
            multiline: false,
            kind: InputKind::Text,
            placeholder: lit_text("title"),
            initial: TextSource::Param(param("initial")),
            submit: command("retitle"),
        }),
        Node::Select(SelectNode {
            common: common("pick"),
            options: OptionList::Literal(LiteralOptions {
                options: vec![SelectOption { value: "a".into(), label: "Alpha".into() }],
            }),
            value: binds[4].clone(),
            on_change: command("pick"),
        }),
        Node::Select(SelectNode {
            common: common("pick-bound"),
            options: OptionList::Bound(BoundOptions {
                collection: CollectionSource::Member(binds[0].clone()),
                value_member: path(&["id"]),
                label_member: path(&["name"]),
            }),
            value: binds[5].clone(),
            on_change: command("pick"),
        }),
        repeat,
        Node::Overlay(OverlayNode {
            common: common("menu"),
            anchor: Anchor::Node(AnchorNode { node: nid("go") }),
            modal: false,
            dismiss: command("close"),
            children: vec![text("menu-item", "one")],
        }),
        Node::Overlay(OverlayNode {
            common: common("dialog"),
            anchor: Anchor::Viewport,
            modal: true,
            dismiss: command("close"),
            children: vec![],
        }),
        Node::Plot(PlotNode {
            common: common("trend"),
            series: binds[1].clone(),
            mark: PlotMark::Area,
            x_min: Some(0.0),
            x_max: None,
            y_min: None,
            y_max: Some(100.0),
        }),
        Node::Embed(EmbedNode {
            common: common("viewport"),
            slot_kind: "world.scene".into(),
            slot_id: "main".into(),
            width: 640.0,
            height: 480.0,
        }),
        Node::Use(UseNode {
            common: common("kv"),
            composition: CompositionRef { publisher: "thing.std".into(), name: seg("key-value"), version: ver(1) },
            args: vec![Arg { name: "key".into(), value: ArgValue::Text(TextArg { value: "k".into() }) }],
        }),
    ];

    let mut deep = boxed("d4", vec![Node::Box(painted)]);
    for id in ["d3", "d2", "d1"] {
        deep = boxed(id, vec![deep]);
    }
    let mut children = vec![deep];
    children.extend(leaves);
    for plot_choice in [
        Node::Plot(PlotNode {
            common: common("trend-line"),
            series: binds[2].clone(),
            mark: PlotMark::Line,
            x_min: None,
            x_max: None,
            y_min: None,
            y_max: None,
        }),
        Node::Plot(PlotNode {
            common: common("trend-bar"),
            series: binds[2].clone(),
            mark: PlotMark::Bar,
            x_min: None,
            x_max: None,
            y_min: None,
            y_max: None,
        }),
    ] {
        children.push(plot_choice);
    }
    for (index, fit) in [ImageFit::Contain, ImageFit::Fill, ImageFit::Unscaled].into_iter().enumerate() {
        children.push(Node::Image(ImageNode {
            common: common(&format!("img-fit-{index}")),
            catalog: "icons".into(),
            asset: "gear".into(),
            fit,
            alt: lit_text(""),
        }));
    }
    for (index, role) in [Role::List, Role::ListItem, Role::Heading, Role::Dialog, Role::Toolbar].into_iter().enumerate() {
        let mut role_style = style();
        if index == 0 {
            role_style.direction = Direction::Row;
            role_style.align_content = ContentAlign::Auto;
            role_style.justify_content = ContentAlign::Stretch;
        }
        children.push(Node::Box(BoxNode {
            common: common(&format!("role-{index}")),
            style: role_style,
            paint: plain_paint(),
            role,
            children: vec![],
        }));
    }
    let mut block = BoxNode {
        common: common("block"),
        style: style(),
        paint: plain_paint(),
        role: Role::Group,
        children: vec![],
    };
    block.style.display = Display::Block;
    block.style.direction = Direction::ColumnReverse;
    block.style.wrap = Wrap::Wrap;
    block.style.overflow = Overflow::Clip;
    block.style.align_content = ContentAlign::Center;
    block.style.justify_content = ContentAlign::End;
    block.style.align_items = ItemAlign::End;
    block.style.align_self = ItemAlign::Start;
    block.style.basis = Dimension::Content;
    children.push(Node::Box(block));
    children.push(Node::Text(TextNode {
        common: common("t-param"),
        content: TextSource::Param(param("title")),
        style_token: "title".into(),
        wrap: true,
        max_lines: None,
        selectable: false,
    }));
    children.push(Node::Toggle(ToggleNode {
        common: NodeCommon { id: nid("literal-number"), visible: BoolSource::Param(param("v")), a11y_label: None },
        checked: lit_bool(false),
        on_change: command("toggle"),
    }));
    children.push(Node::Slider(SliderNode {
        common: common("slider-literal"),
        min: -1.0,
        max: 1.0,
        step: 0.5,
        value: lit_number(0.5),
        commit: command("set-level"),
    }));
    children.push(Node::Slider(SliderNode {
        common: common("slider-param"),
        min: 0.0,
        max: 10.0,
        step: 1.0,
        value: NumberSource::Param(param("n")),
        commit: command("set-level"),
    }));
    children.push(Node::Repeat(RepeatNode {
        common: common("rows-param"),
        collection: CollectionSource::Param(param("rows")),
        key_member: path(&["id"]),
        template: std::boxed::Box::new(text("row-param", "r")),
    }));

    SurfaceDocument {
        provider_id: ProviderId::new("provider.a"),
        label: seg("main"),
        version: ver(7),
        title: "All arms".into(),
        root: boxed("root", children),
        commands: vec![
            CommandDecl {
                id: CommandId::new("go"),
                payload_schema: SchemaId::new("gamecult.thing.test.go.v1"),
                captures: vec![nid("name-input"), nid("level")],
                confirm: Some("Go now?".into()),
            },
            CommandDecl {
                id: CommandId::new("close"),
                payload_schema: SchemaId::new("gamecult.thing.test.close.v1"),
                captures: vec![],
                confirm: None,
            },
        ],
    }
}

fn full_composition() -> CompositionDocument {
    let args = vec![
        Arg { name: "text".into(), value: ArgValue::Text(TextArg { value: "t".into() }) },
        Arg { name: "number".into(), value: ArgValue::Number(NumberArg { value: 2.5 }) },
        Arg { name: "bool".into(), value: ArgValue::Bool(BoolArg { value: true }) },
        Arg { name: "bind".into(), value: ArgValue::Bind(record_bind(path(&["x"]), None)) },
        Arg {
            name: "collection".into(),
            value: ArgValue::Collection(CollectionArg { source: CollectionSource::Param(param("rows")) }),
        },
        Arg { name: "command".into(), value: ArgValue::Command(CommandArg { command: command("go") }) },
        Arg {
            name: "slot".into(),
            value: ArgValue::Slot(SlotArg { nodes: vec![text("slot-text", "inside"), boxed("slot-box", vec![])] }),
        },
    ];
    let inner_use = Node::Use(UseNode {
        common: common("inner"),
        composition: CompositionRef { publisher: "thing.std".into(), name: seg("card"), version: ver(2) },
        args,
    });
    CompositionDocument {
        publisher: "provider.a".into(),
        name: seg("panel"),
        version: ver(3),
        params: [
            ("title", ParamKind::Text),
            ("count", ParamKind::Number),
            ("on", ParamKind::Bool),
            ("source", ParamKind::Bind),
            ("rows", ParamKind::Collection),
            ("act", ParamKind::Command),
            ("body", ParamKind::Slot),
        ]
        .into_iter()
        .map(|(name, kind)| ParamDecl { name: name.into(), kind })
        .collect(),
        body: boxed("panel-root", vec![text("panel-title", "t"), inner_use]),
    }
}

fn results(invocation: &CommandInvocation) -> Vec<(&'static str, CommandResult)> {
    vec![
        ("result-pending", CommandResult::pending(invocation, seq(1), "working")),
        ("result-completed", CommandResult::completed(invocation, seq(2), Some(ver(8)), true, None)),
        (
            "result-completed-open-surface",
            CommandResult::completed(
                invocation,
                seq(3),
                None,
                false,
                Some(Effect::OpenSurface(OpenSurfaceEffect { key: "thing:surface:provider.a.next".into() })),
            ),
        ),
        (
            "result-completed-open-external",
            CommandResult::completed(
                invocation,
                seq(4),
                Some(ver(9)),
                true,
                Some(Effect::OpenExternal(OpenExternalEffect {
                    url: "https://example.test/auth".into(),
                    resume: command("resume"),
                })),
            ),
        ),
        ("result-denied", CommandResult::denied(invocation, seq(5), "not yours", Some(nid("go")))),
        ("result-denied-no-node", CommandResult::denied(invocation, seq(6), "not allowed", None)),
        ("result-failed", CommandResult::failed(invocation, seq(7), "broke")),
    ]
}

fn asset_catalog() -> AssetCatalog {
    AssetCatalog {
        provider_id: ProviderId::new("provider.a"),
        catalog_id: seg("icons"),
        version: ver(2),
        assets: vec![
            AssetEntry { id: "gear".into(), media_type: "image/png".into(), uri: "assets/gear.png".into(), width: count(32), height: count(32) },
            AssetEntry { id: "bolt".into(), media_type: "image/svg+xml".into(), uri: "assets/bolt.svg".into(), width: count(0), height: count(0) },
        ],
    }
}

/// A store with one record of each kind, written by cultcache-rs under a pinned clock.
fn write_store(path: &std::path::Path) {
    let _ = std::fs::remove_file(path);
    let mut cache = CultCache::new();
    ThingContract.register_entries(&mut cache).unwrap();
    cache.add_generic_backing_store(SingleFileMessagePackBackingStore::new(path)).unwrap();
    let surface = full_surface();
    let composition = full_composition();
    let invocation = invocation();
    let result = CommandResult::pending(&invocation, seq(1), "working");
    let catalog = asset_catalog();
    put(&mut cache, &surface.record_key(), &surface);
    put(&mut cache, &composition.record_key(), &composition);
    put(&mut cache, &invocation.record_key(), &invocation);
    put(&mut cache, &result.record_key(), &result);
    put(&mut cache, &catalog.record_key(), &catalog);
}

fn put<T: DatabaseEntry>(cache: &mut CultCache, key: &str, value: &T) {
    let (mut envelope, _) = cache.prepare_entry(key, value).unwrap();
    envelope.stored_at = PINNED_CLOCK.into();
    cache.put_envelope::<T>(envelope).unwrap();
}

fn envelope<T: DatabaseEntry>(key: &str, payload: Vec<u8>) -> CultCacheEnvelope {
    CultCacheEnvelope {
        key: key.into(),
        r#type: T::TYPE.into(),
        payload,
        stored_at: PINNED_CLOCK.into(),
        schema_id: Some(T::TYPE.into()),
    }
}

fn open_store(path: &std::path::Path) -> CultCache {
    let mut cache = CultCache::new();
    ThingContract.register_entries(&mut cache).unwrap();
    cache.add_generic_backing_store(SingleFileMessagePackBackingStore::new(path)).unwrap();
    cache.pull_all_backing_stores().unwrap();
    cache
}

#[test]
fn goldens_match() {
    let mut names = BTreeSet::new();
    names.insert(golden("surface-all-arms", &full_surface()));
    names.insert(golden("composition-all-params", &full_composition()));
    let invocation = invocation();
    names.insert(golden("invocation-all-inputs", &invocation));
    for (name, result) in results(&invocation) {
        names.insert(golden(name, &result));
    }
    names.insert(golden("asset-catalog", &asset_catalog()));

    // The refusal and tolerance goldens are written by `refusal_payloads` below; a stale file
    // that no case names is an orphan.
    let refusals = refusal_payloads();
    for (name, bytes) in &refusals {
        golden_bytes(&format!("{name}.bin"), bytes);
        names.insert((*name).to_string());
    }
    let on_disk: BTreeSet<String> = std::fs::read_dir(goldens_dir())
        .unwrap()
        .filter_map(|entry| entry.unwrap().file_name().into_string().ok())
        .filter_map(|file| file.strip_suffix(".bin").map(str::to_string))
        .collect();
    assert_eq!(on_disk, names, "every .bin golden is a named case and every case has its file");

    // The store: one record of each kind, written under a pinned clock, byte for byte.
    let scratch = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join("goldens-surface.cc");
    write_store(&scratch);
    let committed = golden_bytes("surface.cc", &std::fs::read(&scratch).unwrap());
    let reopened = goldens_dir().join("surface.cc");
    assert_eq!(std::fs::read(&reopened).unwrap(), committed);
    let cache = open_store(&scratch);
    let surface = full_surface();
    assert_eq!(cache.get::<SurfaceDocument>(&surface.record_key()).unwrap(), Some(surface));
    let composition = full_composition();
    assert_eq!(cache.get::<CompositionDocument>(&composition.record_key()).unwrap(), Some(composition));
    assert_eq!(cache.get::<CommandInvocation>(&invocation.record_key()).unwrap(), Some(invocation.clone()));
    let result = CommandResult::pending(&invocation, seq(1), "working");
    assert_eq!(cache.get::<CommandResult>(&result.record_key()).unwrap(), Some(result));
    let catalog = asset_catalog();
    assert_eq!(cache.get::<AssetCatalog>(&catalog.record_key()).unwrap(), Some(catalog));
}

/// The foreign and malformed payloads. Each is the bytes a consumer might send; none is a
/// value of this crate, so each is spelled from MessagePack tuples and maps.
fn refusal_payloads() -> Vec<(&'static str, Vec<u8>)> {
    // The map a Thing 1 provider writes for a command result: named members, a receipt
    // inside, no positional slots.
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Receipt {
        command_id: &'static str,
        command: &'static str,
        state: &'static str,
        message: &'static str,
        source_version: u64,
        issued_at_utc: &'static str,
    }
    #[derive(serde::Serialize)]
    struct Flat {
        receipt: Receipt,
    }
    let flat = Flat {
        receipt: Receipt {
            command_id: "inv-1",
            command: "go",
            state: "completed",
            message: CANARY,
            source_version: 4,
            issued_at_utc: "2026-01-01T00:00:00Z",
        },
    };
    let unit: [u8; 0] = [];
    let pending = Outcome::Pending(PendingOutcome { message: CANARY.into() });
    let root = text("root", "x");
    vec![
        ("result-thing1-flat", rmp_serde::to_vec_named(&flat).unwrap()),
        // A surface whose root is an arm key the Node union does not declare.
        (
            "node-unknown-arm",
            rmp_serde::to_vec(&("provider.a", "main", 1i64, CANARY, (13i32, (CANARY,)), unit)).unwrap(),
        ),
        // A result whose outcome is an arm key the Outcome union does not declare.
        ("outcome-unknown-arm", rmp_serde::to_vec(&("inv-1", 1i32, (4i32, (CANARY,)))).unwrap()),
        // A result with a fourth slot past the last declared one.
        (
            "result-extra-slot",
            rmp_serde::to_vec(&("inv-1", 1i32, (0i32, ("working",)), CANARY)).unwrap(),
        ),
        // Each domain refusal is a tuple of real values with one slot out of domain.
        // A result at seq 0.
        ("result-seq-zero", rmp_serde::to_vec(&("inv-1", 0i32, &pending)).unwrap()),
        // A surface at version -1.
        (
            "surface-version-negative",
            rmp_serde::to_vec(&("provider.a", "main", -1i64, CANARY, &root, unit)).unwrap(),
        ),
        // A surface whose label holds a dot, so its key would be ambiguous.
        (
            "surface-label-dotted",
            rmp_serde::to_vec(&("provider.a", "b.c", 1i64, CANARY, &root, unit)).unwrap(),
        ),
        // An asset whose width is negative.
        (
            "asset-extent-negative",
            rmp_serde::to_vec(&("provider.a", "icons", 1i64, [("gear", "image/png", CANARY, -5i32, 32i32)])).unwrap(),
        ),
        // A colour channel past the u8 leaf.
        ("rgba-channel-out-of-range", rmp_serde::to_vec(&(256i32, 0i32, 0i32, 255i32)).unwrap()),
    ]
}

#[test]
fn refusal_cases() {
    let payloads: std::collections::BTreeMap<_, _> = refusal_payloads().into_iter().collect();
    let committed = |name: &str| golden_bytes(&format!("{name}.bin"), &payloads[name]);

    // Stored under their key, each is refused naming the kind and the key, never a value.
    let cases: [(&str, &str, &str); 7] = [
        ("result-thing1-flat", "gamecult.thing.command_result", "thing:result:inv-1.1"),
        ("node-unknown-arm", "gamecult.thing.surface", "thing:surface:provider.a.main"),
        ("outcome-unknown-arm", "gamecult.thing.command_result", "thing:result:inv-1.1"),
        ("result-seq-zero", "gamecult.thing.command_result", "thing:result:inv-1.0"),
        ("surface-version-negative", "gamecult.thing.surface", "thing:surface:provider.a.main"),
        ("surface-label-dotted", "gamecult.thing.surface", "thing:surface:provider.a.b.c"),
        ("asset-extent-negative", "gamecult.thing.asset_catalog", "thing:asset_catalog:provider.a.icons"),
    ];
    for (name, kind, key) in cases {
        let mut cache = CultCache::new();
        ThingContract.register_entries(&mut cache).unwrap();
        let bytes = committed(name);
        let error = match kind {
            "gamecult.thing.surface" => {
                cache.put_envelope::<SurfaceDocument>(envelope::<SurfaceDocument>(key, bytes)).unwrap_err()
            }
            "gamecult.thing.asset_catalog" => {
                cache.put_envelope::<AssetCatalog>(envelope::<AssetCatalog>(key, bytes)).unwrap_err()
            }
            _ => cache.put_envelope::<CommandResult>(envelope::<CommandResult>(key, bytes)).unwrap_err(),
        };
        let message = format!("{error:#}");
        assert!(message.contains(kind), "{name}: the error names the kind: {message}");
        assert!(message.contains(key), "{name}: the error names the record key: {message}");
        assert!(!message.contains(CANARY), "{name}: the error echoed a value: {message}");
    }

    // Decoded directly, the refusal names the union and the arm key, and never the payload.
    for (name, union, key) in [("node-unknown-arm", "Node", "13"), ("outcome-unknown-arm", "Outcome", "4")] {
        let bytes = committed(name);
        let message = if union == "Node" {
            rmp_serde::from_slice::<SurfaceDocument>(&bytes).unwrap_err().to_string()
        } else {
            rmp_serde::from_slice::<CommandResult>(&bytes).unwrap_err().to_string()
        };
        assert!(message.contains(union) && message.contains(key), "{name}: {message}");
        assert!(!message.contains(CANARY), "{name}: {message}");
    }

    // Decoded directly, a domain refusal names the domain and never the payload.
    for (name, domain) in [
        ("result-seq-zero", "Seq"),
        ("surface-version-negative", "Version"),
        ("surface-label-dotted", "Segment"),
        ("asset-extent-negative", "Count"),
    ] {
        let bytes = committed(name);
        let message = match name {
            "result-seq-zero" => rmp_serde::from_slice::<CommandResult>(&bytes).unwrap_err().to_string(),
            "asset-extent-negative" => rmp_serde::from_slice::<AssetCatalog>(&bytes).unwrap_err().to_string(),
            _ => rmp_serde::from_slice::<SurfaceDocument>(&bytes).unwrap_err().to_string(),
        };
        assert!(message.contains(domain), "{name}: {message}");
        assert!(!message.contains(CANARY), "{name}: {message}");
    }

    // The u8 leaf refuses a channel past 255 when decoded as an Rgba.
    let rgba = rmp_serde::from_slice::<Rgba>(&committed("rgba-channel-out-of-range")).unwrap_err();
    assert!(!rgba.to_string().contains(CANARY));

    // An extra trailing slot is read (CultLib's extra-trailing-slots ruling: read, never written
    // back). Whether a missing slot is refused is CultLib's rule, so no golden asserts it.
    let mut answered = invocation();
    answered.invocation_id = "inv-1".into();
    let extra: CommandResult = rmp_serde::from_slice(&committed("result-extra-slot")).unwrap();
    assert_eq!(extra, CommandResult::pending(&answered, seq(1), "working"));
}

#[test]
fn deep_tree() {
    // Decoding a Node costs tens of KiB of debug stack per nesting level, so the chain runs on a
    // thread that has the room; the 2 MiB default does not. The hazard is CultCache's, owned by
    // cultlib-gaps:follow_up:decode-stack-safety; the test stays on the big thread until it lands.
    std::thread::Builder::new().stack_size(16 * 1024 * 1024).spawn(deep_tree_body).unwrap().join().unwrap();
}

fn deep_tree_body() {
    // A 64-deep Box chain.
    let mut chain = text("leaf", "bottom");
    for depth in (0..64).rev() {
        chain = boxed(&format!("deep-{depth}"), vec![chain]);
    }
    let deep = SurfaceDocument {
        provider_id: ProviderId::new("provider.a"),
        label: seg("deep"),
        version: ver(1),
        title: "deep".into(),
        root: chain,
        commands: vec![],
    };
    // A surface of 1,000 nodes: the root, 998 texts and one box.
    let mut wide_children: Vec<Node> = (0..998).map(|index| text(&format!("t{index}"), "x")).collect();
    wide_children.push(boxed("tail", vec![]));
    let wide = SurfaceDocument {
        provider_id: ProviderId::new("provider.a"),
        label: seg("wide"),
        version: ver(1),
        title: "wide".into(),
        root: boxed("root", wide_children),
        commands: vec![],
    };

    let path = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join("deep-tree.cc");
    let _ = std::fs::remove_file(&path);
    {
        let mut cache = CultCache::new();
        ThingContract.register_entries(&mut cache).unwrap();
        cache.add_generic_backing_store(SingleFileMessagePackBackingStore::new(&path)).unwrap();
        put(&mut cache, &deep.record_key(), &deep);
        put(&mut cache, &wide.record_key(), &wide);
    }
    let cache = open_store(&path);
    assert_eq!(cache.get::<SurfaceDocument>(&deep.record_key()).unwrap(), Some(deep));
    assert_eq!(cache.get::<SurfaceDocument>(&wide.record_key()).unwrap(), Some(wide));
}
