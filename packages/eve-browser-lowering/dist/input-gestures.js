export class EveInputGestureResolver {
    bindings;
    pressed = new Set();
    sequences = new Map();
    constructor(bindings) {
        this.bindings = bindings;
    }
    press(control, at = Date.now()) {
        this.pressed.add(control);
        const actions = [];
        for (const binding of this.bindings) {
            const gesture = binding.gesture;
            if (gesture.kind === "direct" && gesture.controls[0] === control)
                actions.push(binding.actionId);
            if (gesture.kind === "chord" && gesture.controls.every(candidate => this.pressed.has(candidate)))
                actions.push(binding.actionId);
            if (gesture.kind === "sequence" && this.advanceSequence(binding, control, at))
                actions.push(binding.actionId);
        }
        return [...new Set(actions)];
    }
    release(control) {
        this.pressed.delete(control);
    }
    reset() {
        this.pressed.clear();
        this.sequences.clear();
    }
    advanceSequence(binding, control, at) {
        const controls = binding.gesture.controls;
        if (controls.length === 0)
            return false;
        const previous = this.sequences.get(binding.bindingId) || { index: 0, at: 0 };
        const timeout = binding.gesture.maxStepIntervalMs || 650;
        const index = previous.index > 0 && at - previous.at <= timeout ? previous.index : 0;
        const next = controls[index] === control ? index + 1 : controls[0] === control ? 1 : 0;
        if (next === controls.length) {
            this.sequences.delete(binding.bindingId);
            return !binding.gesture.completionControl;
        }
        this.sequences.set(binding.bindingId, { index: next, at });
        return false;
    }
}
