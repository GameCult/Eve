import { drawGravityFieldWebGl } from "./fields-webgl-renderer.js";
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
    const draw = () => drawGravitySurface(canvas, props, state, context.resolveAssetUrl);
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
function drawGravitySurface(canvas, props, state, resolveAssetUrl) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || canvas.clientWidth || 1));
    const height = Math.max(1, Math.floor(rect.height || canvas.clientHeight || 1));
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const pixelWidth = Math.max(1, Math.floor(width * dpr));
    const pixelHeight = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const bounds = fitBoundsToAspect(gravityBounds(props), width, height);
    const gravityDocument = objectProps(state?.gravity);
    const bodies = gravityBodiesFromDocument(state?.gravity) || parseGravityBodies(firstString(props.bodies, ""));
    const objects = gravityObjectsFromDocument(state?.objects) || parseGravityObjects(firstString(props.objects, ""));
    if (!drawGravityFieldWebGl(ctx, props, gravityDocument, bodies, bounds, width, height, state?.renderSplats)) {
        drawFieldLoweringFailure(ctx, props, width, height, "field.surface2d requires WebGL2 float render targets");
    }
    drawGravityBodies(ctx, bodies, props, bounds, width, height, resolveAssetUrl);
    drawGravityObjects(ctx, objects, props, bounds, width, height, resolveAssetUrl);
}
function drawFieldLoweringFailure(ctx, props, width, height, message) {
    ctx.save();
    ctx.fillStyle = firstString(props.failureBackground, "rgba(0, 0, 0, 0.72)");
    ctx.fillRect(0, 0, width, height);
    ctx.font = firstString(props.failureFont, "700 13px Cascadia Mono, Consolas, monospace");
    ctx.fillStyle = firstString(props.failureColor, "rgba(255, 184, 79, 0.95)");
    ctx.fillText(message, 16, 28);
    ctx.restore();
}
function drawGravityBodies(ctx, bodies, props, bounds, width, height, resolveAssetUrl) {
    for (const body of bodies) {
        const screen = worldToSurface(bounds, body.x, body.y, width, height);
        const visualRadius = Math.max(18, Math.min(190, body.radius / Math.max(1, bounds.maxX - bounds.minX) * width * 0.32));
        const icon = resolveAssetUrl(body.icon);
        const fallbackIconSize = body.kind.toLowerCase().includes("sun")
            ? Math.max(numberProp(props.sunIconMinPx, 34), visualRadius * numberProp(props.sunIconScale, 0.72))
            : Math.max(numberProp(props.bodyIconMinPx, 24), visualRadius * numberProp(props.bodyIconScale, 0.48));
        const iconSize = body.iconSize > 0 ? body.iconSize : fallbackIconSize;
        if (icon)
            drawGravityAsset(ctx, icon, screen.x, screen.y, iconSize, 0.92);
        if (body.key) {
            drawGravityLabel(ctx, props, body.key.replace(/^local\./, ""), screen.x + visualRadius * 0.44, screen.y - visualRadius * 0.48, firstString(props.bodyLabelColor, "rgba(226, 244, 255, 0.82)"));
        }
    }
}
const gravityImageCache = new Map();
function drawGravityAsset(ctx, src, x, y, size, alpha) {
    let image = gravityImageCache.get(src);
    if (!image) {
        image = new Image();
        image.decoding = "async";
        image.onload = () => requestAnimationFrame(() => {
            const canvas = ctx.canvas;
            canvas.dispatchEvent(new CustomEvent("cultui:asset-loaded"));
        });
        image.src = src;
        gravityImageCache.set(src, image);
    }
    if (!image.complete || image.naturalWidth === 0)
        return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    ctx.restore();
}
function drawGravityObjects(ctx, objects, props, bounds, width, height, resolveAssetUrl) {
    for (const obj of objects) {
        const screen = worldToSurface(bounds, obj.x, obj.y, width, height);
        if (screen.x < -40 || screen.x > width + 40 || screen.y < -40 || screen.y > height + 40)
            continue;
        const size = obj.kind.toLowerCase().includes("station")
            ? numberProp(props.stationIconSizePx, 34)
            : obj.controlled ? numberProp(props.shipIconSizePx, 22) : numberProp(props.remoteShipIconSizePx, 18);
        const color = factionColor(props, obj.faction, obj.controlled, obj.visibility);
        const icon = resolveAssetUrl(obj.icon);
        ctx.save();
        ctx.globalAlpha = Math.max(0.25, Math.min(1, obj.visibility));
        ctx.translate(screen.x, screen.y);
        const angle = Math.atan2(obj.directionY, obj.directionX) + Math.PI / 2;
        if (obj.kind.toLowerCase().includes("ship"))
            ctx.rotate(angle);
        if (icon) {
            const image = gravityImageCache.get(icon);
            if (!image) {
                const loading = new Image();
                loading.decoding = "async";
                loading.onload = () => ctx.canvas.dispatchEvent(new CustomEvent("cultui:asset-loaded"));
                loading.src = icon;
                gravityImageCache.set(icon, loading);
            }
            else if (image.complete && image.naturalWidth > 0) {
                ctx.drawImage(image, -size / 2, -size / 2, size, size);
            }
        }
        ctx.restore();
        drawGravityLabel(ctx, props, obj.label, screen.x + size * 0.55, screen.y - size * 0.45, color);
    }
}
function drawGravityLabel(ctx, props, label, x, y, color) {
    if (!label)
        return;
    ctx.save();
    ctx.font = firstString(props.objectLabelFont, "700 12px Ubuntu, system-ui, sans-serif");
    ctx.textBaseline = "middle";
    ctx.lineWidth = numberProp(props.objectLabelStrokeWidth, 3);
    ctx.strokeStyle = firstString(props.objectLabelStroke, "rgba(0, 0, 0, 0.72)");
    ctx.fillStyle = color;
    ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
    ctx.restore();
}
function factionColor(props, faction, controlled, visibility) {
    const alpha = Math.max(0.25, Math.min(1, visibility));
    if (controlled)
        return colorTemplate(firstString(props.objectControlledColor, "rgba(122, 240, 255, {alpha})"), alpha);
    const normalized = faction.toLowerCase();
    if (normalized.includes("raider"))
        return colorTemplate(firstString(props.objectRaiderColor, "rgba(255, 143, 74, {alpha})"), alpha);
    if (normalized.includes("neutral"))
        return colorTemplate(firstString(props.objectNeutralColor, "rgba(232, 232, 224, {alpha})"), alpha);
    return colorTemplate(firstString(props.objectDefaultColor, "rgba(214, 244, 255, {alpha})"), alpha);
}
function colorTemplate(template, alpha) {
    return template.replaceAll("{alpha}", String(alpha));
}
function parseGravityBodies(value) {
    return value
        .split(";")
        .map(entry => entry.trim())
        .filter(Boolean)
        .map(entry => {
        const parts = entry.split("|");
        return {
            key: parts[0] ?? "",
            kind: parts[1] ?? "",
            x: Number(parts[2]) || 0,
            y: Number(parts[3]) || 0,
            radius: Math.max(1, Number(parts[4]) || 1),
            depth: Number(parts[5]) || 0,
            exponent: Number(parts[6]) || 1,
            waveRadius: Number(parts[7]) || 0,
            waveDepth: Number(parts[8]) || 0,
            waveSpeed: Number(parts[9]) || 0,
            icon: parts[10] ?? "",
            iconSize: Number(parts[12]) || 0,
            tint: parts[11] ?? "",
        };
    });
}
function parseGravityObjects(value) {
    return value
        .split(";")
        .map(entry => entry.trim())
        .filter(Boolean)
        .map(entry => {
        const parts = entry.split("|");
        return {
            key: parts[0] ?? "",
            kind: parts[1] ?? "",
            label: parts[2] ?? "",
            x: Number(parts[3]) || 0,
            y: Number(parts[4]) || 0,
            directionX: Number(parts[5]) || 0,
            directionY: Number(parts[6]) || 1,
            faction: parts[7] ?? "",
            controlled: parts[8] === "1" || parts[8] === "true",
            visibility: Number(parts[9]) || 1,
            icon: parts[10] ?? "",
        };
    });
}
function gravityBodiesFromDocument(document) {
    const influences = Array.isArray(document?.gravityInfluences) ? document.gravityInfluences : [];
    const bodies = Array.isArray(document?.bodies) ? document.bodies : [];
    if (influences.length === 0 && bodies.length === 0)
        return undefined;
    const displayBodiesByKey = new Map();
    for (const body of bodies) {
        const key = firstString(body.bodyKey, body.name, "");
        if (key)
            displayBodiesByKey.set(key, body);
    }
    return (influences.length > 0 ? influences : bodies).map((body) => {
        const key = firstString(body.bodyKey, body.name, "body");
        const displayBody = displayBodiesByKey.get(key);
        const kind = firstString(body.kind, "Body");
        return {
            key,
            kind,
            x: numberProp(body.x, 0),
            y: numberProp(body.y, 0),
            radius: Math.max(1, numberProp(body.radius, 80)),
            depth: numberProp(body.gravityDepth, 0),
            exponent: numberProp(body.gravityDepthExponent, 1),
            waveRadius: numberProp(body.waveRadius, 0),
            waveDepth: numberProp(body.waveDepth, 0),
            waveSpeed: numberProp(body.waveSpeed, 0),
            icon: assetUriFromRef(body.iconAsset) || assetUriFromRef(displayBody?.iconAsset),
            iconSize: numberProp(displayBody?.iconSize, numberProp(body.iconSize, 0)),
            tint: "",
        };
    });
}
function gravityObjectsFromDocument(document) {
    const objects = Array.isArray(document?.objects) ? document.objects : [];
    if (objects.length === 0)
        return undefined;
    return objects.map((obj) => {
        const kind = firstString(obj.kind, "object");
        return {
            key: firstString(obj.entityKey, String(obj.entityIndex ?? ""), "object"),
            kind,
            label: firstString(obj.displayName, obj.entityKey, "object"),
            x: numberProp(obj.x, 0),
            y: numberProp(obj.y, 0),
            directionX: numberProp(obj.directionX, 1),
            directionY: numberProp(obj.directionY, 0),
            faction: firstString(obj.factionKey, ""),
            controlled: boolProp(obj.controlled),
            visibility: numberProp(obj.visibility, 1),
            icon: assetUriFromRef(obj.iconAsset),
        };
    });
}
function assetUriFromRef(value) {
    const asset = objectProps(value);
    const uri = firstString(asset.uri, "");
    return uri;
}
function gravityBounds(props) {
    const radius = Math.max(1, numberProp(props.viewRadius, Math.max(1200, numberProp(props.terrainRadius, 1200))));
    return {
        minX: numberProp(props.minX, -radius),
        minY: numberProp(props.minY, -radius),
        maxX: numberProp(props.maxX, radius),
        maxY: numberProp(props.maxY, radius),
    };
}
function fitBoundsToAspect(bounds, width, height) {
    const worldWidth = Math.max(0.0001, bounds.maxX - bounds.minX);
    const worldHeight = Math.max(0.0001, bounds.maxY - bounds.minY);
    const canvasAspect = Math.max(0.0001, width / Math.max(1, height));
    const worldAspect = worldWidth / worldHeight;
    const centerX = (bounds.minX + bounds.maxX) * 0.5;
    const centerY = (bounds.minY + bounds.maxY) * 0.5;
    if (canvasAspect > worldAspect) {
        const fittedWidth = worldHeight * canvasAspect;
        return {
            minX: centerX - fittedWidth * 0.5,
            maxX: centerX + fittedWidth * 0.5,
            minY: bounds.minY,
            maxY: bounds.maxY,
        };
    }
    const fittedHeight = worldWidth / canvasAspect;
    return {
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: centerY - fittedHeight * 0.5,
        maxY: centerY + fittedHeight * 0.5,
    };
}
function worldToSurface(bounds, x, y, width, height) {
    return {
        x: (x - bounds.minX) / Math.max(1, bounds.maxX - bounds.minX) * width,
        y: (y - bounds.minY) / Math.max(1, bounds.maxY - bounds.minY) * height,
    };
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
const objectProps = record;
const numberProp = numberValue;
function boolProp(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}
