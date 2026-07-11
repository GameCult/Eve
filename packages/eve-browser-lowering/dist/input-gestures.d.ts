export type EveInputGestureKind = "direct" | "chord" | "sequence" | "axis";
export type EveInputGesture = {
    kind: EveInputGestureKind;
    controls: string[];
    maxStepIntervalMs?: number;
    completionControl?: string;
};
export type EveInputBinding = {
    bindingId: string;
    actionId: string;
    gesture: EveInputGesture;
    actionBar?: boolean;
};
export declare class EveInputGestureResolver {
    private readonly bindings;
    private readonly pressed;
    private readonly sequences;
    constructor(bindings: EveInputBinding[]);
    press(control: string, at?: number): string[];
    release(control: string): void;
    reset(): void;
    private advanceSequence;
}
