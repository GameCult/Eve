mod common;

use common::*;
use cultcache_rs::{CultCache, CultCacheEnvelope, CultCacheRegistry, DatabaseEntry, decode_payload};
use serde::Deserialize;
use serde::de::IntoDeserializer;
use serde::de::value::{Error as ValueError, I32Deserializer, I64Deserializer, StringDeserializer};
use thing_contract::*;

const CANARY: &str = "CANARY-9d41c7e0";

fn other_invocation() -> CommandInvocation {
    let mut other = invocation();
    other.invocation_id = "an-invocation-no-constructor-can-guess".into();
    other
}

#[test]
fn result_copies_invocation_id() {
    let invocation = other_invocation();
    let built = [
        CommandResult::pending(&invocation, seq(1), "m"),
        CommandResult::completed(&invocation, seq(2), None, false, None),
        CommandResult::denied(&invocation, seq(3), "r", None),
        CommandResult::failed(&invocation, seq(4), "r"),
    ];
    for (index, result) in built.iter().enumerate() {
        assert_eq!(result.invocation_id(), "an-invocation-no-constructor-can-guess");
        assert_eq!(result.seq().get(), index as i32 + 1);
    }
}

#[test]
fn each_constructor_builds_its_outcome_arm() {
    let invocation = other_invocation();
    let node = Some(nid("go"));
    assert!(matches!(
        CommandResult::pending(&invocation, seq(1), "wait").outcome(),
        Outcome::Pending(PendingOutcome { message }) if message == "wait"
    ));
    let effect = Effect::OpenSurface(OpenSurfaceEffect { key: "k".into() });
    assert!(matches!(
        CommandResult::completed(&invocation, seq(1), Some(ver(5)), true, Some(effect.clone())).outcome(),
        Outcome::Completed(CompletedOutcome { source_version: Some(v), clear_drafts: true, effect: Some(e) })
            if v.get() == 5 && *e == effect
    ));
    assert!(matches!(
        CommandResult::completed(&invocation, seq(1), None, false, None).outcome(),
        Outcome::Completed(CompletedOutcome { source_version: None, clear_drafts: false, effect: None })
    ));
    assert!(matches!(
        CommandResult::denied(&invocation, seq(1), "no", node.clone()).outcome(),
        Outcome::Denied(DeniedOutcome { reason, node: n }) if reason == "no" && *n == node
    ));
    assert!(matches!(
        CommandResult::failed(&invocation, seq(1), "broke").outcome(),
        Outcome::Failed(FailedOutcome { reason }) if reason == "broke"
    ));
}

fn surface(provider: &str, label: &str) -> SurfaceDocument {
    SurfaceDocument {
        provider_id: ProviderId::new(provider),
        label: seg(label),
        version: ver(1),
        title: String::new(),
        root: boxed("r", vec![]),
        commands: vec![],
    }
}

fn composition(publisher: &str, name: &str, version: i64) -> CompositionDocument {
    CompositionDocument {
        publisher: publisher.into(),
        name: seg(name),
        version: ver(version),
        params: vec![],
        body: boxed("r", vec![]),
    }
}

fn catalog(provider: &str, id: &str) -> AssetCatalog {
    AssetCatalog { provider_id: ProviderId::new(provider), catalog_id: seg(id), version: ver(1), assets: vec![] }
}

#[test]
fn record_keys_are_built_from_the_fields() {
    let invocation = other_invocation();
    assert_eq!(invocation.record_key(), "thing:invocation:an-invocation-no-constructor-can-guess");
    assert_eq!(
        CommandResult::failed(&invocation, seq(3), "r").record_key(),
        "thing:result:an-invocation-no-constructor-can-guess.3"
    );
    assert_eq!(surface("p", "main").record_key(), "thing:surface:p.main");
    assert_eq!(composition("pub", "card", 2).record_key(), "thing:composition:pub.card.v2");
    assert_eq!(catalog("p", "icons").record_key(), "thing:asset_catalog:p.icons");
}

#[test]
fn record_keys_injective() {
    // The pair the old keys collided on: a dotted provider with a plain label, and a plain
    // provider with a dotted label. The second no longer exists.
    assert_eq!(surface("a.b", "c").record_key(), "thing:surface:a.b.c");
    assert!(Segment::new("b.c").is_err());
    assert_ne!(surface("a", "c").record_key(), surface("a.b", "c").record_key());
    assert_ne!(surface("a.b", "c").record_key(), surface("a", "bc").record_key());

    // A composition splits at its last two dots: publisher, name, then the version.
    assert_eq!(composition("a.b", "c", 1).record_key(), "thing:composition:a.b.c.v1");
    assert_ne!(composition("a.b", "c", 1).record_key(), composition("a", "bc", 1).record_key());
    assert_ne!(composition("a", "c", 1).record_key(), composition("a", "c", 11).record_key());
    assert_ne!(composition("a", "c", 1).record_key(), composition("a", "c", 0).record_key());

    // A catalog likewise, and under the asset_catalog prefix.
    assert_eq!(catalog("a.b", "c").record_key(), "thing:asset_catalog:a.b.c");
    assert_ne!(catalog("a.b", "c").record_key(), catalog("a", "bc").record_key());

    // A result splits at its last dot, and the seq is digits.
    let mut inv = invocation();
    inv.invocation_id = "x.1".into();
    let first = CommandResult::failed(&inv, seq(2), "r").record_key();
    inv.invocation_id = "x".into();
    let second = CommandResult::failed(&inv, seq(12), "r").record_key();
    assert_eq!(first, "thing:result:x.1.2");
    assert_eq!(second, "thing:result:x.12");
    assert_ne!(first, second);

    // Nothing in src spells the old prefix.
    assert!(!catalog("p", "c").record_key().starts_with("thing:assets:"));
}

#[test]
fn domain_newtypes_refuse_out_of_domain() {
    // new, the one door.
    for bad in [0, -1, i32::MIN] {
        assert!(Seq::new(bad).is_err(), "Seq {bad}");
    }
    assert_eq!(Seq::new(1).unwrap(), Seq::FIRST);
    assert_eq!(Seq::new(i32::MAX).unwrap().next(), Seq::new(i32::MAX).unwrap());
    assert_eq!(Seq::FIRST.next().get(), 2);
    assert!(Version::new(-1).is_err());
    assert!(Version::new(i64::MIN).is_err());
    assert_eq!(Version::new(0).unwrap().get(), 0);
    assert!(Count::new(-1).is_err());
    assert!(Count::new(i32::MIN).is_err());
    assert_eq!(Count::new(0).unwrap().get(), 0);
    assert!(Segment::new("").is_err());
    assert!(Segment::new("a.b").is_err());
    assert!(Segment::new(".").is_err());
    assert_eq!(Segment::new("ab").unwrap().as_str(), "ab");

    // serde, the other door: rmp_serde and serde's own IntoDeserializer.
    for bad in [0, -1, i32::MIN] {
        assert!(rmp_serde::from_slice::<Seq>(&rmp_serde::to_vec(&bad).unwrap()).is_err(), "Seq {bad}");
        assert!(Seq::deserialize(I32Deserializer::<ValueError>::new(bad)).is_err());
        assert!(Count::deserialize(I32Deserializer::<ValueError>::new(bad)).is_ok() == (bad >= 0));
    }
    assert_eq!(Seq::deserialize(I32Deserializer::<ValueError>::new(1)).unwrap(), Seq::FIRST);
    assert!(rmp_serde::from_slice::<Version>(&rmp_serde::to_vec(&-1i64).unwrap()).is_err());
    assert!(Version::deserialize(I64Deserializer::<ValueError>::new(-1)).is_err());
    assert_eq!(Version::deserialize(I64Deserializer::<ValueError>::new(0)).unwrap().get(), 0);
    assert!(rmp_serde::from_slice::<Count>(&rmp_serde::to_vec(&-1i32).unwrap()).is_err());
    assert_eq!(Count::deserialize(I32Deserializer::<ValueError>::new(0)).unwrap().get(), 0);
    for bad in ["", "a.b"] {
        assert!(rmp_serde::from_slice::<Segment>(&rmp_serde::to_vec(bad).unwrap()).is_err(), "Segment {bad:?}");
        let deserializer: StringDeserializer<ValueError> = bad.to_string().into_deserializer();
        assert!(Segment::deserialize(deserializer).is_err());
    }
    let deserializer: StringDeserializer<ValueError> = "ab".to_string().into_deserializer();
    assert_eq!(Segment::deserialize(deserializer).unwrap().as_str(), "ab");

    // Each writes exactly the plain leaf, so the bytes are the leaf's.
    assert_eq!(rmp_serde::to_vec(&seq(5)).unwrap(), rmp_serde::to_vec(&5i32).unwrap());
    assert_eq!(rmp_serde::to_vec(&ver(5)).unwrap(), rmp_serde::to_vec(&5i64).unwrap());
    assert_eq!(rmp_serde::to_vec(&count(5)).unwrap(), rmp_serde::to_vec(&5i32).unwrap());
    assert_eq!(rmp_serde::to_vec(&seg("ab")).unwrap(), rmp_serde::to_vec("ab").unwrap());

    // The error names the domain and its bound, never the value.
    let message = Segment::new(format!("{CANARY}.x")).unwrap_err().to_string();
    assert_eq!(message, "Segment must be free of '.'");
    assert_eq!(Seq::new(-77).unwrap_err().to_string(), "Seq must be at least 1");
    assert_eq!(Version::new(-77).unwrap_err().to_string(), "Version must be at least 0");
    assert_eq!(Count::new(-77).unwrap_err().to_string(), "Count must be at least 0");
    assert_eq!(Segment::new("").unwrap_err().to_string(), "Segment must be non-empty");
    let error = Segment::new(format!("{CANARY}.x")).unwrap_err();
    assert_eq!((error.domain(), error.bound()), ("Segment", "free of '.'"));
    assert!(!format!("{error:?}").contains(CANARY));
}

/// The result payload `[id, seq, [0, [message]]]` with the seq slot spelled by the caller.
fn result_payload(seq_slot: i32) -> Vec<u8> {
    let pending = Outcome::Pending(PendingOutcome { message: CANARY.into() });
    rmp_serde::to_vec(&("inv-1", seq_slot, &pending)).unwrap()
}

#[test]
fn result_decode_door_holds_domain() {
    // A seq the constructors cannot build is refused by every decode door.
    for bad in [0, -1, i32::MIN] {
        let payload = result_payload(bad);
        let message = rmp_serde::from_slice::<CommandResult>(&payload).unwrap_err().to_string();
        assert!(message.contains("Seq") && !message.contains(CANARY), "{message}");

        let message = format!("{:#}", decode_payload::<CommandResult>(&payload).unwrap_err());
        assert!(!message.contains(CANARY), "{message}");

        let mut cache = CultCache::new();
        ThingContract.register_entries(&mut cache).unwrap();
        let key = format!("thing:result:inv-1.{bad}");
        let envelope = CultCacheEnvelope {
            key: key.clone(),
            r#type: CommandResult::TYPE.into(),
            payload,
            stored_at: "2026-01-01T00:00:00Z".into(),
            schema_id: Some(CommandResult::TYPE.into()),
        };
        let message = format!("{:#}", cache.put_envelope::<CommandResult>(envelope).unwrap_err());
        assert!(message.contains("gamecult.thing.command_result") && message.contains(&key), "{message}");
        assert!(!message.contains(CANARY), "{message}");
    }

    // The boundary decodes, and equals what the constructor builds.
    let mut answered = invocation();
    answered.invocation_id = "inv-1".into();
    let expected = CommandResult::pending(&answered, Seq::FIRST, CANARY);
    assert_eq!(rmp_serde::from_slice::<CommandResult>(&result_payload(1)).unwrap(), expected);
    assert_eq!(decode_payload::<CommandResult>(&result_payload(1)).unwrap(), expected);
}
