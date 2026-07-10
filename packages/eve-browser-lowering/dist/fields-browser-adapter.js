const FIELD_SCHEMAS = new Set([
    "gamecult.fields.splats.v1",
    "gamecult.fields.gravity.v1",
    "gamecult.fields.objects.v1",
]);
export const fieldsBrowserAdapter = {
    pluginId: "fields.surface",
    capabilities: ["field.surface2d", "gravity.surface", "field.scalar", "field.vector", "field.objects"],
    schemas: [...FIELD_SCHEMAS],
    normalizeDocument: normalizeFieldsDocument,
};
export function normalizeFieldsDocument(schemaId, value) {
    const tuple = Array.isArray(value) ? value : undefined;
    const documentSchema = tuple ? tuple[0] : value?.schema;
    const schema = String(schemaId || documentSchema || "");
    if (!tuple || !FIELD_SCHEMAS.has(schema))
        return value;
    if (schema === "gamecult.fields.splats.v1")
        return normalizeSplats(tuple);
    if (schema === "gamecult.fields.gravity.v1")
        return normalizeGravity(tuple);
    return normalizeObjects(tuple);
}
function normalizeSplats(value) {
    const splats = array(value[9]);
    return {
        schema: value[0], frameId: value[1], publishedAtUtc: value[2], simulationTimeSeconds: value[3],
        runId: value[4], zoneIndex: value[5], zoneName: value[6], viewport: normalizeViewport(value[7]),
        layers: array(value[8]).map(normalizeSplatLayer),
        splats: {
            count: splats[0] ?? 0, centerX: splats[1] || [], centerY: splats[2] || [],
            halfExtentX: splats[3] || [], halfExtentY: splats[4] || [], rotationCos: splats[5] || [],
            rotationSin: splats[6] || [], channel: splats[7] || [], falloff: splats[8] || [],
            valueR: splats[9] || [], valueG: splats[10] || [], valueB: splats[11] || [], valueA: splats[12] || [],
            sourceKey: splats[13] || [], layerIndex: splats[14] || [], sourceKind: splats[15] || [],
            frequencyX: splats[16] || [], frequencyY: splats[17] || [], phaseX: splats[18] || [],
            phaseY: splats[19] || [], animationSpeed: splats[20] || [], sourceFlags: splats[21] || [],
        },
    };
}
function normalizeGravity(value) {
    return {
        schema: value[0], frameId: value[1], publishedAtUtc: value[2], simulationTimeSeconds: value[3],
        runId: value[4], zoneIndex: value[5], zoneName: value[6], viewport: normalizeViewport(value[7]),
        gravityInfluences: array(value[8]).map(normalizeGravityInfluence),
        bodies: array(value[9]).map(normalizeBody), terrainRadius: value[10], terrainDepth: value[11],
        terrainDepthExponent: value[12], terrainWaveFrequency: value[13],
    };
}
function normalizeObjects(value) {
    return {
        schema: value[0], frameId: value[1], publishedAtUtc: value[2], simulationTimeSeconds: value[3],
        runId: value[4], zoneIndex: value[5], zoneName: value[6], currentEntityKey: value[7],
        viewport: normalizeViewport(value[8]), controlledEntityIndices: array(value[9]),
        objects: array(value[10]).map(normalizeObject),
    };
}
function normalizeViewport(value) {
    const row = array(value);
    return row.length ? { minX: row[0], minY: row[1], maxX: row[2], maxY: row[3] } : value;
}
function normalizeSplatLayer(value) {
    const row = array(value);
    if (!row.length)
        return value;
    return {
        layerKey: row[0], displayName: row[1], channel: row[2], blendMode: row[3], graphicsFormat: row[4],
        clearBeforeDraw: row[5], clearR: row[6], clearG: row[7], clearB: row[8], clearA: row[9],
    };
}
function normalizeGravityInfluence(value) {
    const row = array(value);
    if (!row.length)
        return value;
    return {
        bodyKey: row[0], orbitKey: row[1], kind: row[2], x: row[3], y: row[4], radius: row[5],
        gravityDepth: row[6], gravityDepthExponent: row[7], waveRadius: row[8], waveDepth: row[9], waveSpeed: row[10],
    };
}
function normalizeBody(value) {
    const row = array(value);
    if (!row.length)
        return value;
    return {
        bodyKey: row[0], orbitKey: row[1], name: row[2], kind: row[3], x: row[4], y: row[5], radius: row[6],
        isAsteroidBelt: row[7], body: row[8], iconAsset: normalizeAsset(row[9]),
    };
}
function normalizeObject(value) {
    const row = array(value);
    if (!row.length)
        return value;
    return {
        entityIndex: row[0], entityKey: row[1], displayName: row[2], kind: row[3], factionKey: row[4],
        x: row[5], y: row[6], z: row[7], directionX: row[8], directionY: row[9], velocityX: row[10],
        velocityY: row[11], controlled: row[12], targetEntityIndex: row[13], isActive: row[14], visibility: row[15],
        status: normalizeStatus(row[16]), inventory: array(row[17]).map(normalizeInventoryItem), iconAsset: normalizeAsset(row[18]),
    };
}
function normalizeStatus(value) {
    const row = array(value);
    return row.length ? { hull: row[0], shield: row[1], heat: row[2] } : value || {};
}
function normalizeInventoryItem(value) {
    const row = array(value);
    if (!row.length)
        return value;
    return {
        source: row[0], itemKey: row[1], quantity: row[2], quality: row[3], durability: row[4], enabled: row[5],
        sourceIndex: row[6], x: row[7], y: row[8], iconAsset: normalizeAsset(row[9]),
    };
}
function normalizeAsset(value) {
    const row = array(value);
    if (!row.length)
        return value || {};
    return {
        assetKey: row[0], kind: row[1], uri: row[2], transport: row[3], contentHash: row[4],
        mimeType: row[5], metadata: row[6] || {},
    };
}
function array(value) {
    return Array.isArray(value) ? value : [];
}
