mod common;

use common::*;
use thing_contract::*;

fn other_invocation() -> CommandInvocation {
    let mut other = invocation();
    other.invocation_id = "an-invocation-no-constructor-can-guess".into();
    other
}

#[test]
fn result_copies_invocation_id() {
    let invocation = other_invocation();
    let built = [
        CommandResult::pending(&invocation, 1, "m"),
        CommandResult::completed(&invocation, 2, None, false, None),
        CommandResult::denied(&invocation, 3, "r", None),
        CommandResult::failed(&invocation, 4, "r"),
    ];
    for (index, result) in built.iter().enumerate() {
        assert_eq!(result.invocation_id(), "an-invocation-no-constructor-can-guess");
        assert_eq!(result.seq(), index as i32 + 1);
    }
}

#[test]
fn each_constructor_builds_its_outcome_arm() {
    let invocation = other_invocation();
    let node = Some(nid("go"));
    assert!(matches!(
        CommandResult::pending(&invocation, 1, "wait").outcome(),
        Outcome::Pending(PendingOutcome { message }) if message == "wait"
    ));
    let effect = Effect::OpenSurface(OpenSurfaceEffect { key: "k".into() });
    assert!(matches!(
        CommandResult::completed(&invocation, 1, Some(5), true, Some(effect.clone())).outcome(),
        Outcome::Completed(CompletedOutcome { source_version: Some(5), clear_drafts: true, effect: Some(e) }) if *e == effect
    ));
    assert!(matches!(
        CommandResult::completed(&invocation, 1, None, false, None).outcome(),
        Outcome::Completed(CompletedOutcome { source_version: None, clear_drafts: false, effect: None })
    ));
    assert!(matches!(
        CommandResult::denied(&invocation, 1, "no", node.clone()).outcome(),
        Outcome::Denied(DeniedOutcome { reason, node: n }) if reason == "no" && *n == node
    ));
    assert!(matches!(
        CommandResult::failed(&invocation, 1, "broke").outcome(),
        Outcome::Failed(FailedOutcome { reason }) if reason == "broke"
    ));
}

#[test]
fn record_keys_are_built_from_the_fields() {
    let invocation = other_invocation();
    assert_eq!(invocation.record_key(), "thing:invocation:an-invocation-no-constructor-can-guess");
    assert_eq!(
        CommandResult::failed(&invocation, 3, "r").record_key(),
        "thing:result:an-invocation-no-constructor-can-guess.3"
    );
    let surface = SurfaceDocument {
        provider_id: ProviderId::new("p"),
        label: "main".into(),
        version: 1,
        title: String::new(),
        root: boxed("r", vec![]),
        commands: vec![],
    };
    assert_eq!(surface.record_key(), "thing:surface:p.main");
    let composition = CompositionDocument {
        publisher: "pub".into(),
        name: "card".into(),
        version: 2,
        params: vec![],
        body: boxed("r", vec![]),
    };
    assert_eq!(composition.record_key(), "thing:composition:pub.card.v2");
    let catalog = AssetCatalog { provider_id: ProviderId::new("p"), catalog_id: "icons".into(), version: 1, assets: vec![] };
    assert_eq!(catalog.record_key(), "thing:assets:p.icons");
}
