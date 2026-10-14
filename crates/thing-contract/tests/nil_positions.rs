//! The nil vector: for every element of every array of every value golden, the golden with that
//! element replaced by nil, and whether the Rust decode door accepts it. A slot is required
//! exactly when its Rust type is not optional, so the rows are the required-slot set; the C# and
//! TypeScript packages hold no list of their own and are held to every row.
//! `THING_BLESS=1` rewrites `goldens/nil-positions.tsv`; any other run compares.

mod common;

use std::fmt::Debug;

use common::*;
use serde::Serialize;
use serde::de::DeserializeOwned;
use thing_contract::*;

/// One MessagePack value's byte span; `kids` is set for arrays only (maps are never walked).
struct Span {
    start: usize,
    end: usize,
    kids: Option<Vec<Span>>,
}

fn be(bytes: &[u8], at: usize, width: usize) -> usize {
    bytes[at..at + width].iter().fold(0, |acc, byte| acc << 8 | *byte as usize)
}

fn collection(bytes: &[u8], start: usize, mut at: usize, count: usize, is_array: bool) -> Span {
    let mut kids = Vec::new();
    for _ in 0..count {
        let kid = item(bytes, at);
        at = kid.end;
        kids.push(kid);
    }
    Span { start, end: at, kids: is_array.then_some(kids) }
}

fn item(bytes: &[u8], at: usize) -> Span {
    let tag = bytes[at];
    let flat = |len: usize| Span { start: at, end: at + len, kids: None };
    match tag {
        0x00..=0x7f | 0xe0..=0xff | 0xc0 | 0xc2 | 0xc3 => flat(1),
        0x80..=0x8f => collection(bytes, at, at + 1, (tag & 0x0f) as usize * 2, false),
        0x90..=0x9f => collection(bytes, at, at + 1, (tag & 0x0f) as usize, true),
        0xa0..=0xbf => flat(1 + (tag & 0x1f) as usize),
        0xc4 | 0xd9 => flat(2 + be(bytes, at + 1, 1)),
        0xc5 | 0xda => flat(3 + be(bytes, at + 1, 2)),
        0xc6 | 0xdb => flat(5 + be(bytes, at + 1, 4)),
        0xca => flat(5),
        0xcb => flat(9),
        0xcc | 0xd0 => flat(2),
        0xcd | 0xd1 => flat(3),
        0xce | 0xd2 => flat(5),
        0xcf | 0xd3 => flat(9),
        0xdc => collection(bytes, at, at + 3, be(bytes, at + 1, 2), true),
        0xdd => collection(bytes, at, at + 5, be(bytes, at + 1, 4), true),
        0xde => collection(bytes, at, at + 3, be(bytes, at + 1, 2) * 2, false),
        0xdf => collection(bytes, at, at + 5, be(bytes, at + 1, 4) * 2, false),
        0xd4 => flat(3),
        0xd5 => flat(4),
        0xd6 => flat(6),
        0xd7 => flat(10),
        0xd8 => flat(18),
        0xc7 => flat(3 + be(bytes, at + 1, 1)),
        0xc8 => flat(4 + be(bytes, at + 1, 2)),
        0xc9 => flat(6 + be(bytes, at + 1, 4)),
        _ => panic!("unsupported tag {tag:#x} at {at}"),
    }
}

/// Every element inside an array, at every depth, in walk order, with its dotted index path.
fn elements(span: &Span, prefix: &str, out: &mut Vec<(String, usize, usize)>) {
    for (index, kid) in span.kids.iter().flatten().enumerate() {
        let path = if prefix.is_empty() { index.to_string() } else { format!("{prefix}.{index}") };
        out.push((path.clone(), kid.start, kid.end));
        elements(kid, &path, out);
    }
}

/// The rows of one golden: nil spliced over each element, decoded as `T`. An accepted variant
/// must re-encode to the spliced bytes.
fn rows<T: DeserializeOwned + Serialize + Debug>(file: &str, out: &mut String) -> (usize, usize) {
    let bytes = std::fs::read(goldens_dir().join(format!("{file}.bin"))).unwrap();
    let mut found = Vec::new();
    elements(&item(&bytes, 0), "", &mut found);
    let (mut accepted, mut refused) = (0, 0);
    for (path, start, end) in found {
        let mut spliced = bytes[..start].to_vec();
        spliced.push(0xc0);
        spliced.extend_from_slice(&bytes[end..]);
        let verdict = match rmp_serde::from_slice::<T>(&spliced) {
            Ok(value) => {
                assert_eq!(rmp_serde::to_vec(&value).unwrap(), spliced, "{file} {path}: an accepted nil must re-encode to the spliced bytes");
                accepted += 1;
                "ACCEPT"
            }
            Err(_) => {
                refused += 1;
                "REFUSE"
            }
        };
        out.push_str(&format!("{file}\t{path}\t{start}\t{end}\t{verdict}\n"));
    }
    (accepted, refused)
}

#[test]
fn nil_positions_match() {
    let mut table = String::new();
    let mut totals = Vec::new();
    totals.push(("surface-all-arms", rows::<SurfaceDocument>("surface-all-arms", &mut table)));
    totals.push(("composition-all-params", rows::<CompositionDocument>("composition-all-params", &mut table)));
    totals.push(("invocation-all-inputs", rows::<CommandInvocation>("invocation-all-inputs", &mut table)));
    for file in [
        "result-pending",
        "result-completed",
        "result-completed-open-surface",
        "result-completed-open-external",
        "result-denied",
        "result-denied-no-node",
        "result-failed",
    ] {
        totals.push((file, rows::<CommandResult>(file, &mut table)));
    }
    totals.push(("asset-catalog", rows::<AssetCatalog>("asset-catalog", &mut table)));
    for (file, (accepted, refused)) in &totals {
        println!("NILTOTAL {file} accept={accepted} refuse={refused}");
    }
    golden_bytes("nil-positions.tsv", table.as_bytes());
}
