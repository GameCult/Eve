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

type GravityWebGlRenderer = {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  fieldTexture: WebGLTexture | null;
  tintTexture: WebGLTexture | null;
  framebuffer: WebGLFramebuffer | null;
  tintFramebuffer: WebGLFramebuffer | null;
  splatProgram: WebGLProgram;
  shadeProgram: WebGLProgram;
  splatBuffer: WebGLBuffer;
  quadBuffer: WebGLBuffer;
  width: number;
  height: number;
};

const gravityWebGlRenderers = new WeakMap<HTMLCanvasElement, GravityWebGlRenderer | null>();
const GRAVITY_SPLAT_STRIDE_FLOATS = 20;

export function drawGravityFieldWebGl(
  ctx: CanvasRenderingContext2D,
  props: Record<string, unknown>,
  gravityDocument: Record<string, unknown>,
  bodies: GravitySurfaceBody[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  width: number,
  height: number,
  renderSplatsDocument?: Record<string, unknown>,
): boolean {
  const renderer = resolveGravityWebGlRenderer(ctx.canvas as HTMLCanvasElement);
  if (!renderer) return false;
  const gl = renderer.gl;
  if (!ensureGravityWebGlTarget(renderer, width, height)) {
    gravityWebGlRenderers.set(ctx.canvas as HTMLCanvasElement, null);
    return false;
  }

  const splatBuffers = buildGravitySplatBuffers(props, gravityDocument, bodies, bounds, renderSplatsDocument);
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.framebuffer);
  gl.viewport(0, 0, width, height);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (splatBuffers.gravity.length > 0) {
    gl.useProgram(renderer.splatProgram);
    gl.uniform4f(gl.getUniformLocation(renderer.splatProgram, "u_viewport"), bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    gl.uniform1f(gl.getUniformLocation(renderer.splatProgram, "u_time"), numberProp(props.simulationTimeSeconds, 0));
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.splatBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, splatBuffers.gravity, gl.DYNAMIC_DRAW);
    bindGravitySplatAttributes(gl, renderer.splatProgram);
    gl.drawArrays(gl.TRIANGLES, 0, splatBuffers.gravity.length / GRAVITY_SPLAT_STRIDE_FLOATS);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.tintFramebuffer);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (splatBuffers.tint.length > 0) {
    gl.useProgram(renderer.splatProgram);
    gl.uniform4f(gl.getUniformLocation(renderer.splatProgram, "u_viewport"), bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    gl.uniform1f(gl.getUniformLocation(renderer.splatProgram, "u_time"), numberProp(props.simulationTimeSeconds, 0));
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.splatBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, splatBuffers.tint, gl.DYNAMIC_DRAW);
    bindGravitySplatAttributes(gl, renderer.splatProgram);
    gl.drawArrays(gl.TRIANGLES, 0, splatBuffers.tint.length / GRAVITY_SPLAT_STRIDE_FLOATS);
  }

  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, width, height);
  gl.useProgram(renderer.shadeProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderer.fieldTexture);
  gl.uniform1i(gl.getUniformLocation(renderer.shadeProgram, "u_field"), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, renderer.tintTexture);
  gl.uniform1i(gl.getUniformLocation(renderer.shadeProgram, "u_tint"), 1);
  gl.uniform2f(gl.getUniformLocation(renderer.shadeProgram, "u_resolution"), width, height);
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_time"), numberProp(gravityDocument.simulationTimeSeconds, numberProp(props.simulationTimeSeconds, 0)));
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_lineInterval"), numberProp(props.lineInterval, numberProp(props.scalarFieldLineInterval, numberProp(props.depthRange, 228.79605) / 20)));
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_lineOffset"), numberProp(props.lineOffset, numberProp(props.startDepth, 2.310401)));
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_lineWidth"), numberProp(props.lineWidth, 0.3));
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_lineFade"), numberProp(props.lineFade, 5));
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_angleWidth"), numberProp(props.angleWidth, 0.05));
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_angleFade"), numberProp(props.angleFade, 1.15));
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_dangerSteepness"), numberProp(props.dangerSteepness, 1.5));
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_scale"), numberProp(props.isolineScale, 2.6924083));
  uniform3(gl, renderer.shadeProgram, "u_baseColor", vector3Prop(props.scalarFieldBaseColor, [0.002, 0.006, 0.012]));
  uniform3(gl, renderer.shadeProgram, "u_fieldGlowColor", vector3Prop(props.scalarFieldGlowColor, [0.018, 0.050, 0.075]));
  uniform3(gl, renderer.shadeProgram, "u_lineLowColor", vector3Prop(props.scalarFieldLowLineColor, [0.0, 0.34, 0.52]));
  uniform3(gl, renderer.shadeProgram, "u_lineHighColor", vector3Prop(props.scalarFieldHighLineColor, [1.45, 0.30, 0.05]));
  uniform3(gl, renderer.shadeProgram, "u_angleLowColor", vector3Prop(props.scalarFieldLowAngleColor, [0.06, 0.16, 0.24]));
  uniform3(gl, renderer.shadeProgram, "u_angleHighColor", vector3Prop(props.scalarFieldHighAngleColor, [1.10, 0.24, 0.04]));
  gl.uniform1f(gl.getUniformLocation(renderer.shadeProgram, "u_tintScale"), numberProp(props.vectorFieldTintScale, 0.45));
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.quadBuffer);
  const position = gl.getAttribLocation(renderer.shadeProgram, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  ctx.drawImage(renderer.canvas, 0, 0, width, height);
  return true;
}

function buildGravitySplatsFromDocument(document: Record<string, unknown> | undefined): Float32Array | undefined {
  const splats = objectProps(document?.splats);
  const layers = Array.isArray(document?.layers) ? document.layers as Array<Record<string, unknown>> : [];
  const gravityLayerIndex = layers.findIndex(layer => stringProp(layer?.layerKey, "") === "gravity.height");
  if (gravityLayerIndex < 0) return undefined;
  const count = Math.max(0, positiveInt(splats.count, 0));
  const centerX = numberArray(splats.centerX);
  const centerY = numberArray(splats.centerY);
  const halfExtentX = numberArray(splats.halfExtentX);
  const halfExtentY = numberArray(splats.halfExtentY);
  const rotationCos = numberArray(splats.rotationCos);
  const rotationSin = numberArray(splats.rotationSin);
  const channel = numberArray(splats.channel);
  const falloff = numberArray(splats.falloff);
  const valueR = numberArray(splats.valueR);
  const valueG = numberArray(splats.valueG);
  const sourceKind = numberArray(splats.sourceKind);
  const frequencyX = numberArray(splats.frequencyX);
  const animationSpeed = numberArray(splats.animationSpeed);
  const sourceFlags = numberArray(splats.sourceFlags);
  const layerIndex = numberArray(splats.layerIndex);
  const rows: number[] = [];
  const corners = [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1];
  for (let index = 0; index < count; index += 1) {
    if ((layerIndex[index] ?? -1) !== gravityLayerIndex) continue;
    for (let corner = 0; corner < corners.length; corner += 2) {
      rows.push(
        corners[corner], corners[corner + 1],
        centerX[index] ?? 0, centerY[index] ?? 0,
        Math.max(0.0001, halfExtentX[index] ?? 1), Math.max(0.0001, halfExtentY[index] ?? 1),
        rotationCos[index] ?? 1, rotationSin[index] ?? 0,
        channel[index] ?? 1, falloff[index] ?? 0, valueR[index] ?? 0, 0,
        sourceKind[index] ?? 0, frequencyX[index] ?? 1, animationSpeed[index] ?? 0, sourceFlags[index] ?? 0,
      );
    }
  }
  return rows.length > 0 ? new Float32Array(rows) : undefined;
}

function buildGravitySplatBuffers(
  props: Record<string, unknown>,
  gravityDocument: Record<string, unknown>,
  bodies: GravitySurfaceBody[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  renderSplatsDocument?: Record<string, unknown>,
): { gravity: Float32Array; tint: Float32Array } {
  const gravityRows: number[] = [];
  const tintRows: number[] = [];
  appendUnityGravitySplats(gravityRows, props, gravityDocument, bodies, bounds);
  appendTintSplatsFromDocument(tintRows, props, renderSplatsDocument);
  return {
    gravity: new Float32Array(gravityRows),
    tint: new Float32Array(tintRows),
  };
}

function appendUnityGravitySplats(
  rows: number[],
  props: Record<string, unknown>,
  gravityDocument: Record<string, unknown>,
  bodies: GravitySurfaceBody[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): void {
  const terrainRadius = numberProp(gravityDocument.terrainRadius, numberProp(props.terrainRadius, 1200));
  const terrainDepth = numberProp(gravityDocument.terrainDepth, numberProp(props.terrainDepth, -8));
  if (terrainDepth !== 0) {
    appendGravitySplat(
      rows,
      0,
      0,
      Math.max(1, terrainRadius * 2),
      Math.max(1, terrainRadius * 2),
      -terrainDepth,
      0,
      0,
      1,
      Math.max(0.0001, numberProp(gravityDocument.terrainDepthExponent, numberProp(props.terrainDepthExponent, 1.2))),
      0,
      1,
      0,
      0);
  }
  for (const body of bodies) {
    appendGravitySplat(
      rows,
      body.x,
      body.y,
      Math.max(1, body.radius),
      Math.max(1, body.radius),
      -body.depth,
      0,
      0,
      1,
      Math.max(0.0001, body.exponent),
      0,
      1,
      0,
      0);
    if (body.waveRadius > 0 && body.waveDepth !== 0) {
      appendGravitySplat(
        rows,
        body.x,
        body.y,
        body.waveRadius,
        body.waveRadius,
        -body.waveDepth,
        0,
        0,
        1,
        8.0,
        4,
        numberProp(gravityDocument.terrainWaveFrequency, numberProp(props.terrainWaveFrequency, 0.6)),
        body.waveSpeed,
        0);
    }
  }
  void bounds;
}

function appendTintSplatsFromDocument(rows: number[], props: Record<string, unknown>, document: Record<string, unknown> | undefined): void {
  const splats = objectProps(document?.splats);
  const layers = Array.isArray(document?.layers) ? document.layers as Array<Record<string, unknown>> : [];
  const tintLayerIndices = new Set<number>();
  const selectedLayer = firstString(props.vectorFieldLayer, props.tintFieldLayer, "fog.tint");
  layers.forEach((layer, index) => {
    const layerKey = stringProp(layer?.layerKey, "");
    const channel = numberProp(layer?.channel, -1);
    if (channel === 4 && layerKey === selectedLayer) tintLayerIndices.add(index);
  });
  const count = Math.max(0, positiveInt(splats.count, 0));
  if (count <= 0 || tintLayerIndices.size === 0) return;
  const centerX = numberArray(splats.centerX);
  const centerY = numberArray(splats.centerY);
  const halfExtentX = numberArray(splats.halfExtentX);
  const halfExtentY = numberArray(splats.halfExtentY);
  const rotationCos = numberArray(splats.rotationCos);
  const rotationSin = numberArray(splats.rotationSin);
  const channel = numberArray(splats.channel);
  const falloff = numberArray(splats.falloff);
  const valueR = numberArray(splats.valueR);
  const valueG = numberArray(splats.valueG);
  const valueB = numberArray(splats.valueB);
  const valueA = numberArray(splats.valueA);
  const sourceKind = numberArray(splats.sourceKind);
  const frequencyX = numberArray(splats.frequencyX);
  const animationSpeed = numberArray(splats.animationSpeed);
  const sourceFlags = numberArray(splats.sourceFlags);
  const layerIndex = numberArray(splats.layerIndex);
  for (let index = 0; index < count; index += 1) {
    if (!tintLayerIndices.has(layerIndex[index] ?? -1) || (channel[index] ?? -1) !== 4) continue;
    const power = (falloff[index] ?? 0) === 0 ? 0.0001 : 1.25;
    appendGravitySplat(
      rows,
      centerX[index] ?? 0,
      centerY[index] ?? 0,
      Math.max(0.0001, halfExtentX[index] ?? 1),
      Math.max(0.0001, halfExtentY[index] ?? 1),
      valueR[index] ?? 0,
      valueG[index] ?? 0,
      valueB[index] ?? 0,
      valueA[index] ?? 1,
      power,
      sourceKind[index] ?? 0,
      frequencyX[index] ?? 1,
      animationSpeed[index] ?? 0,
      sourceFlags[index] ?? 0,
      rotationCos[index] ?? 1,
      rotationSin[index] ?? 0);
  }
}

function resolveGravityWebGlRenderer(canvas: HTMLCanvasElement): GravityWebGlRenderer | null {
  if (gravityWebGlRenderers.has(canvas)) return gravityWebGlRenderers.get(canvas) || null;
  const output = document.createElement("canvas");
  const gl = output.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false }) as WebGL2RenderingContext | null;
  if (!gl) {
    gravityWebGlRenderers.set(canvas, null);
    return null;
  }
  const colorBufferFloat = gl.getExtension("EXT_color_buffer_float");
  if (!colorBufferFloat) {
    gravityWebGlRenderers.set(canvas, null);
    return null;
  }

  const splatProgram = createGravityProgram(gl, GRAVITY_SPLAT_VERTEX_SHADER, GRAVITY_SPLAT_FRAGMENT_SHADER);
  const shadeProgram = createGravityProgram(gl, GRAVITY_SHADE_VERTEX_SHADER, GRAVITY_SHADE_FRAGMENT_SHADER);
  const splatBuffer = gl.createBuffer();
  const quadBuffer = gl.createBuffer();
  if (!splatProgram || !shadeProgram || !splatBuffer || !quadBuffer) {
    gravityWebGlRenderers.set(canvas, null);
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, 1, 1,
    -1, -1, 1, 1, -1, 1,
  ]), gl.STATIC_DRAW);

  const renderer = {
    canvas: output,
    gl,
    fieldTexture: null,
    tintTexture: null,
    framebuffer: null,
    tintFramebuffer: null,
    splatProgram,
    shadeProgram,
    splatBuffer,
    quadBuffer,
    width: 0,
    height: 0,
  };
  gravityWebGlRenderers.set(canvas, renderer);
  return renderer;
}

function ensureGravityWebGlTarget(renderer: GravityWebGlRenderer, width: number, height: number): boolean {
  if (renderer.width === width && renderer.height === height && renderer.fieldTexture && renderer.tintTexture && renderer.framebuffer && renderer.tintFramebuffer) return true;
  const gl = renderer.gl;
  renderer.width = width;
  renderer.height = height;
  renderer.canvas.width = width;
  renderer.canvas.height = height;
  if (renderer.fieldTexture) gl.deleteTexture(renderer.fieldTexture);
  if (renderer.tintTexture) gl.deleteTexture(renderer.tintTexture);
  if (renderer.framebuffer) gl.deleteFramebuffer(renderer.framebuffer);
  if (renderer.tintFramebuffer) gl.deleteFramebuffer(renderer.tintFramebuffer);
  renderer.fieldTexture = gl.createTexture();
  renderer.tintTexture = gl.createTexture();
  renderer.framebuffer = gl.createFramebuffer();
  renderer.tintFramebuffer = gl.createFramebuffer();
  if (!renderer.fieldTexture || !renderer.tintTexture || !renderer.framebuffer || !renderer.tintFramebuffer) return false;
  configureGravityTexture(gl, renderer.fieldTexture, width, height);
  configureGravityTexture(gl, renderer.tintTexture, width, height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderer.fieldTexture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false;
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.tintFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderer.tintTexture, 0);
  return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
}

function configureGravityTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, width: number, height: number): void {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
}

function buildGravitySplats(
  props: Record<string, unknown>,
  gravityDocument: Record<string, unknown>,
  bodies: GravitySurfaceBody[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): Float32Array {
  const rows: number[] = [];
  void bounds;
  const terrainRadius = numberProp(gravityDocument.terrainRadius, numberProp(props.terrainRadius, 1200));
  const terrainDepth = numberProp(gravityDocument.terrainDepth, numberProp(props.terrainDepth, -8));
  if (terrainDepth !== 0) {
    const terrainHalfExtent = Math.max(1, terrainRadius * 2);
    appendGravitySplat(rows, 0, 0, terrainHalfExtent, terrainHalfExtent, -terrainDepth, 0, 0, 1, Math.max(0.0001, numberProp(gravityDocument.terrainDepthExponent, numberProp(props.terrainDepthExponent, 1.2))), 0, 1, 0, 0);
  }
  for (const body of bodies) {
    appendGravitySplat(rows, body.x, body.y, Math.max(1, body.radius), Math.max(1, body.radius), -body.depth, 0, 0, 1, Math.max(0.0001, body.exponent), 0, 1, 0, 0);
    if (body.waveRadius > 0 && body.waveDepth !== 0) {
      appendGravitySplat(rows, body.x, body.y, body.waveRadius, body.waveRadius, -body.waveDepth, 0, 0, 1, 8.0, 4, numberProp(gravityDocument.terrainWaveFrequency, numberProp(props.terrainWaveFrequency, 0.6)), body.waveSpeed, 0);
    }
  }
  return new Float32Array(rows);
}

function appendGravitySplat(
  rows: number[],
  centerX: number,
  centerY: number,
  halfX: number,
  halfY: number,
  valueR: number,
  valueG: number,
  valueB: number,
  valueA: number,
  power: number,
  sourceKind: number,
  frequencyX: number,
  animationSpeed: number,
  sourceFlags: number,
  rotationCos = 1,
  rotationSin = 0,
): void {
  const corners = [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1];
  for (let i = 0; i < corners.length; i += 2) {
    rows.push(
      corners[i], corners[i + 1],
      centerX, centerY,
      halfX, halfY,
      rotationCos, rotationSin,
      power, 0, 0, 0,
      sourceKind, frequencyX, animationSpeed, sourceFlags,
      valueR, valueG, valueB, valueA,
    );
  }
}

function bindGravitySplatAttributes(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  bindGravitySplatAttribute(gl, program, "a_corner", 2, 0);
  bindGravitySplatAttribute(gl, program, "a_center", 2, 2);
  bindGravitySplatAttribute(gl, program, "a_half", 2, 4);
  bindGravitySplatAttribute(gl, program, "a_rot", 2, 6);
  bindGravitySplatAttribute(gl, program, "a_meta", 4, 8);
  bindGravitySplatAttribute(gl, program, "a_source", 4, 12);
  bindGravitySplatAttribute(gl, program, "a_value", 4, 16);
}

function bindGravitySplatAttribute(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, size: number, offsetFloats: number): void {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) return;
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, GRAVITY_SPLAT_STRIDE_FLOATS * 4, offsetFloats * 4);
}

function createGravityProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null {
  const vertex = compileGravityShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileGravityShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  return program;
}

function compileGravityShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
  return shader;
}

function numberProp(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function vector3Prop(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (Array.isArray(value)) {
    const values = value.map(entry => Number(entry));
    if (values.length >= 3 && values.slice(0, 3).every(Number.isFinite)) return [values[0], values[1], values[2]];
  }
  if (typeof value === "string") {
    const values = value.split(/[,\s]+/).map(entry => Number(entry)).filter(Number.isFinite);
    if (values.length >= 3) return [values[0], values[1], values[2]];
  }
  return fallback;
}

function uniform3(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, value: [number, number, number]): void {
  gl.uniform3f(gl.getUniformLocation(program, name), value[0], value[1], value[2]);
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(entry => numberProp(entry, 0));
}

function objectProps(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringProp(value: unknown, fallback: string): string {
  return value === null || value === undefined ? fallback : String(value);
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function positiveInt(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
}

const GRAVITY_SPLAT_VERTEX_SHADER = `#version 300 es
in vec2 a_corner;
in vec2 a_center;
in vec2 a_half;
in vec2 a_rot;
in vec4 a_meta;
in vec4 a_source;
in vec4 a_value;
uniform vec4 u_viewport;
out vec2 v_local;
out vec4 v_meta;
out vec4 v_source;
out vec4 v_value;
void main() {
  vec2 scaled = a_corner * a_half;
  vec2 world = a_center + vec2(
    scaled.x * a_rot.x - scaled.y * a_rot.y,
    scaled.x * a_rot.y + scaled.y * a_rot.x
  );
  vec2 clip = vec2(
    ((world.x - u_viewport.x) / max(0.0001, u_viewport.z - u_viewport.x)) * 2.0 - 1.0,
    ((world.y - u_viewport.y) / max(0.0001, u_viewport.w - u_viewport.y)) * 2.0 - 1.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  v_local = a_corner;
  v_meta = a_meta;
  v_source = a_source;
  v_value = a_value;
}`;

const GRAVITY_SPLAT_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_local;
in vec4 v_meta;
in vec4 v_source;
in vec4 v_value;
uniform float u_time;
out vec4 outColor;
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}
float powerPulse(float x, float power) {
  x = clamp(abs(x), 0.0, 1.0);
  return pow((x + 1.0) * (1.0 - x), max(0.0001, power));
}
void main() {
  float d = length(v_local);
  if (d > 1.0) discard;
  float alpha = powerPulse(d, v_meta.x);
  if (alpha <= 0.0001) discard;
  float source = 1.0;
  if (v_source.x > 0.5 && v_source.x < 2.5) {
    float timeOffset = v_source.x > 1.5 ? u_time * v_source.z : 0.0;
    source = valueNoise(v_local * v_source.y + timeOffset);
    if (v_source.w != 0.0) source = abs(source);
  } else if (v_source.x > 3.5) {
    source = cos(pow(d * 2.0, 1.25) * v_source.y + u_time * v_source.z);
  }
  outColor = v_value * alpha * source;
}`;

const GRAVITY_SHADE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const GRAVITY_SHADE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_field;
uniform sampler2D u_tint;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_lineInterval;
uniform float u_lineOffset;
uniform float u_lineWidth;
uniform float u_lineFade;
uniform float u_angleWidth;
uniform float u_angleFade;
uniform float u_dangerSteepness;
uniform float u_scale;
uniform vec3 u_baseColor;
uniform vec3 u_fieldGlowColor;
uniform vec3 u_lineLowColor;
uniform vec3 u_lineHighColor;
uniform vec3 u_angleLowColor;
uniform vec3 u_angleHighColor;
uniform float u_tintScale;
in vec2 v_uv;
out vec4 outColor;
vec2 calcGrad(vec2 uv, float me) {
  vec2 texel = 1.0 / max(vec2(1.0), u_resolution);
  float n = -texture(u_field, vec2(uv.x, uv.y + texel.y)).r;
  float e = -texture(u_field, vec2(uv.x + texel.x, uv.y)).r;
  return vec2(e - me, n - me);
}
void main() {
  float height = -texture(u_field, v_uv).r;
  vec4 tint = texture(u_tint, v_uv);
  vec2 plan = calcGrad(v_uv, height);
  float slope = max(length(plan), 0.00001);
  vec3 color = u_baseColor;
  float fieldGlow = smoothstep(0.0, u_lineInterval * 7.0, abs(height));
  color += u_fieldGlowColor * fieldGlow;
  color += tint.rgb * clamp(tint.a, 0.0, 1.0) * u_tintScale;

  float dangerBlend = smoothstep(0.0, u_dangerSteepness, pow(slope / max(0.0001, u_scale), 2.0));
  vec3 baseLine = mix(u_lineLowColor, u_lineHighColor, dangerBlend);
  vec3 angleLine = mix(u_angleLowColor, u_angleHighColor, dangerBlend) * clamp(slope / max(0.0001, u_scale), 0.0, 1.0);

  vec3 lines = vec3(0.0);
  float interval = max(0.0001, abs(u_lineInterval));
  float nearestLine = abs(fract((height + u_lineOffset) / interval) - 0.5) * interval;
  float lineDistance = nearestLine / slope;
  float line = 1.0 - smoothstep(u_lineWidth, u_lineWidth * u_lineFade, lineDistance);
  lines += line * baseLine;

  float angle = atan(plan.y, plan.x) / 3.1415926536 + 1.0;
  float nearestAngle = abs(fract(angle * 6.0) - 0.5) / 6.0;
  float angleMask = smoothstep(interval * 0.25, interval * 1.5, abs(height));
  float angleLineAmount = 1.0 - smoothstep(u_angleWidth, u_angleWidth * u_angleFade, nearestAngle);
  lines += angleLineAmount * angleMask * angleLine;

  color += clamp(lines, 0.0, 1.7);
  outColor = vec4(color, 1.0);
}`;

