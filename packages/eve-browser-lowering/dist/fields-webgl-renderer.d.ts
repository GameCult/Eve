export type GravitySurfaceBody = {
    key: string;
    kind: string;
    x: number;
    y: number;
    radius: number;
    depth: number;
    exponent: number;
    waveRadius: number;
    waveDepth: number;
    waveSpeed: number;
    icon: string;
    iconSize: number;
    tint: string;
};
export declare function drawGravityFieldWebGl(ctx: CanvasRenderingContext2D, props: Record<string, unknown>, gravityDocument: Record<string, unknown>, bodies: GravitySurfaceBody[], bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}, width: number, height: number, renderSplatsDocument?: Record<string, unknown>): boolean;
