//! A surface payload inside CultCache's 256 nesting bound must decode on a small thread without
//! aborting the process. Soul's finding `thing2:finding:cut-contract-rs.s1.decode-stack-overflow-
//! within-bound` found a 2.8 KB Repeat chain aborting a 1 MiB thread in release at 68 levels and a
//! Box chain aborting a 2 MiB debug thread at 24 levels, while the bound admits 125 and 83. A
//! stack overflow kills the whole test binary, so these tests fail loudly on a decoder that
//! does not grow its stack.

mod common;

use common::*;
use cultcache_rs::decode_payload;
use thing_contract::*;

const REPEAT_LEVELS: usize = 125;
const BOX_LEVELS: usize = 83;

fn surface(root: Node) -> SurfaceDocument {
    SurfaceDocument {
        provider_id: ProviderId::new("provider.a"),
        label: seg("deep"),
        version: ver(1),
        title: "deep".into(),
        root,
        commands: vec![],
    }
}

fn repeat_chain(levels: usize) -> SurfaceDocument {
    let mut chain = text("leaf", "bottom");
    for depth in (0..levels).rev() {
        chain = Node::Repeat(RepeatNode {
            common: common(&format!("rep-{depth}")),
            collection: CollectionSource::Param(param("rows")),
            key_member: path(&["id"]),
            template: std::boxed::Box::new(chain),
        });
    }
    surface(chain)
}

fn box_chain(levels: usize) -> SurfaceDocument {
    let mut chain = text("leaf", "bottom");
    for depth in (0..levels).rev() {
        chain = boxed(&format!("box-{depth}"), vec![chain]);
    }
    surface(chain)
}

/// Builds, encodes and drops the value on a roomy thread, so only the decode runs on `stack`.
fn decode_on_small_thread(build: fn() -> SurfaceDocument, stack: usize) {
    let expected = std::thread::Builder::new().stack_size(64 << 20).spawn(build).unwrap().join().unwrap();
    let payload = std::thread::Builder::new()
        .stack_size(64 << 20)
        .spawn(move || (rmp_serde::to_vec(&expected).unwrap(), expected))
        .unwrap()
        .join()
        .unwrap();
    let (bytes, expected) = payload;
    let decoded = std::thread::Builder::new()
        .stack_size(stack)
        .spawn(move || decode_payload::<SurfaceDocument>(&bytes).unwrap())
        .unwrap()
        .join()
        .unwrap();
    std::thread::Builder::new().stack_size(64 << 20).spawn(move || assert!(decoded == expected)).unwrap().join().unwrap();
}

#[test]
fn repeat_chain_at_the_bound_decodes_on_a_1_mib_thread() {
    decode_on_small_thread(|| repeat_chain(REPEAT_LEVELS), 1 << 20);
}

#[test]
fn box_chain_at_the_bound_decodes_on_a_2_mib_thread() {
    decode_on_small_thread(|| box_chain(BOX_LEVELS), 2 << 20);
}
