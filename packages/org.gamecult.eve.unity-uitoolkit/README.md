# Eve UI Toolkit Lowering

This package lowers `gamecult.eve.surface.v1` retained surface documents into
Unity UI Toolkit `VisualElement` trees.

It owns native projection only. Providers still own truth, accepted state,
style token values, and command effects through CultMesh/CultNet. Unknown
component kinds degrade to inert containers instead of gaining local semantics.

This package lives in the Eve repository as the shared Unity lowering target.
Aetheria and other Unity consumers should import it from Eve instead of
carrying local copies.
