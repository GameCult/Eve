const FIELD_SCHEMAS = new Set([
    "gamecult.fields.splats.v1",
    "gamecult.fields.gravity.v1",
    "gamecult.fields.objects.v1",
]);
export const fieldsBrowserAdapter = {
    pluginId: "fields.surface",
    capabilities: ["field.surface2d", "gravity.surface", "field.scalar", "field.vector", "field.objects"],
    componentKinds: ["field.surface2d", "gravity.surface"],
    schemas: [...FIELD_SCHEMAS],
    normalizeDocument: normalizeFieldsDocument,
    renderComponent: renderFieldsComponent,
};
function renderFieldsComponent(component, props, layout, style, options, context) {
    const canvas = document.createElement("canvas");
    canvas.className = "cultui-gravity-surface";
    if (component.id)
        canvas.id = component.id;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", stringValue(props.label, "gravity surface"));
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    context.applyGeneratedLayout(canvas, layout, style);
    let drawQueued = false;
    const state = {};
    const draw = () => context.drawSurface(canvas, props, state);
    const scheduleDraw = () => {
        if (!canvas.isConnected || drawQueued)
            return;
        drawQueued = true;
        requestAnimationFrame(() => {
            drawQueued = false;
            if (canvas.isConnected)
                draw();
        });
    };
    canvas.addEventListener("cultui:asset-loaded", scheduleDraw);
    let refreshTimer = 0;
    let observer;
    const cleanup = () => {
        if (refreshTimer)
            window.clearInterval(refreshTimer);
        observer?.disconnect();
        canvas.removeEventListener("cultui:asset-loaded", scheduleDraw);
    };
    const refreshDocuments = () => {
        if (!canvas.isConnected) {
            cleanup();
            return;
        }
        void resolveFieldsDocuments(component, props, options, context.providerId, state)
            .then(changed => {
            if (changed && canvas.isConnected)
                scheduleDraw();
        })
            .catch(error => {
            state.lastError = error instanceof Error ? error.message : String(error);
        });
    };
    if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(scheduleDraw);
        observer.observe(canvas);
    }
    scheduleDraw();
    const refreshMs = Math.max(33, Math.min(1000, positiveInteger(props.stateRefreshMs, 100)));
    refreshTimer = window.setInterval(refreshDocuments, refreshMs);
    queueMicrotask(refreshDocuments);
    window.setTimeout(scheduleDraw, 300);
    window.setTimeout(scheduleDraw, 1000);
    return canvas;
}
async function resolveFieldsDocuments(component, props, options, providerId, state) {
    if (state.loading)
        return false;
    const requests = [
        fieldDocumentRequest(component, props, "renderSplats", "renderSplatsDocumentId", "renderSplatsSchemaId"),
        fieldDocumentRequest(component, props, "gravity", "gravityDocumentId", "gravitySchemaId"),
        fieldDocumentRequest(component, props, "objects", "objectsDocumentId", "objectsSchemaId"),
    ].filter((request) => Boolean(request?.documentId));
    if (requests.length === 0)
        return false;
    state.loading = true;
    try {
        let changed = false;
        for (const request of requests) {
            const resolved = await options.documentResolver?.(request, component);
            let document = record(normalizeFieldsDocument(resolved?.schemaId || request.schemaId, resolved?.document));
            if (Object.keys(document).length === 0) {
                document = record(normalizeFieldsDocument(request.schemaId, await fetchFieldsDocument(request, providerId || options.provider?.providerId)));
            }
            if (Object.keys(document).length === 0)
                continue;
            const key = request.slotId === "renderSplats" ? "renderSplats" : request.slotId === "gravity" ? "gravity" : "objects";
            const previousFrame = numberValue(state[key]?.frameId, -1);
            const nextFrame = numberValue(document.frameId, previousFrame);
            state[key] = document;
            changed ||= nextFrame !== previousFrame;
        }
        state.lastLoadedAt = Date.now();
        return changed;
    }
    finally {
        state.loading = false;
    }
}
async function fetchFieldsDocument(request, providerId) {
    if (typeof fetch !== "function" || typeof window === "undefined" || !providerId)
        return undefined;
    const params = new URLSearchParams({ documentId: request.documentId });
    if (request.schemaId)
        params.set("schemaId", request.schemaId);
    if (request.slotId)
        params.set("slotId", request.slotId);
    const response = await fetch(`/eir/document/${encodeURIComponent(providerId)}?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
    });
    if (!response.ok)
        return undefined;
    return record(await response.json()).document;
}
function fieldDocumentRequest(component, props, slotId, documentIdProp, schemaIdProp) {
    const slot = (component.embeddedDocuments || []).find(candidate => String(candidate?.slotId || "") === slotId);
    const documentId = firstString(props[documentIdProp], slot?.documentId);
    if (!documentId)
        return undefined;
    return {
        documentId,
        schemaId: firstString(props[schemaIdProp], slot?.schemaId),
        presentationKind: firstString(slot?.presentationKind) || "data",
        slotId,
    };
}
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
function record(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function firstString(...values) {
    for (const value of values)
        if (typeof value === "string" && value.trim())
            return value.trim();
    return "";
}
function stringValue(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
}
function positiveInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
function numberValue(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
