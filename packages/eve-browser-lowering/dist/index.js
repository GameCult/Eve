export function selectAdvertisedSurface(provider, requestedSurfaceId = "") {
    const surfaces = provider.surfaces || provider.localAdvertisement?.surfaces || [];
    const selected = requestedSurfaceId
        ? surfaces.find(surface => surface.surfaceId === requestedSurfaceId)
        : surfaces.find(surface => surface.status !== "unavailable") ?? surfaces[0];
    if (!selected?.surfaceId) {
        throw new Error(`Provider ${provider.providerId || "(unknown)"} does not advertise surface ${requestedSurfaceId || "(first available)"}.`);
    }
    return selected;
}
export class EveBrowserProviderHost {
    host;
    transport;
    options;
    active = false;
    lastSurfaceVersion = "";
    pollHandle;
    provider;
    selected;
    constructor(host, transport, options = {}) {
        this.host = host;
        this.transport = transport;
        this.options = options;
    }
    async start() {
        this.provider = await this.transport.providerAdvertisement();
        this.selected = selectAdvertisedSurface(this.provider, this.options.requestedSurfaceId);
        this.active = true;
        await this.refresh();
        const pollMs = Math.max(0, this.options.pollMs ?? 250);
        if (pollMs > 0) {
            this.pollHandle = window.setInterval(() => void this.refresh(), pollMs);
        }
    }
    stop() {
        this.active = false;
        if (this.pollHandle !== undefined)
            window.clearInterval(this.pollHandle);
        this.pollHandle = undefined;
    }
    async refresh() {
        if (!this.active || !this.provider || !this.selected)
            return;
        try {
            const surface = await this.transport.surface(this.selected);
            const version = `${surface.providerId || ""}:${surface.surface?.id || ""}:${surface.version ?? ""}`;
            if (version === this.lastSurfaceVersion)
                return;
            this.lastSurfaceVersion = version;
            renderEveSurface(surface, this.host, {
                activeSurfaceId: this.selected.surfaceId,
                assetUrlResolver: this.transport.resolveAssetUrl,
                body: this.options.body,
                clientId: this.options.clientId || "eve-browser",
                commandSink: intent => this.submit(intent),
                documentResolver: this.transport.resolveDocument,
                provider: this.provider,
                source: this.options.source,
                statusElement: this.options.statusElement,
            });
        }
        catch (error) {
            if (this.options.statusElement) {
                this.options.statusElement.textContent = error instanceof Error ? error.message : "Eve surface unavailable.";
            }
        }
    }
    async submit(intent) {
        await this.transport.submitCommand(intent);
        this.lastSurfaceVersion = "";
        window.setTimeout(() => void this.refresh(), 100);
    }
}
const defaultStyleTokens = {
    "--bg": "#020909",
    "--bg-top": "#020909",
    "--bg-mid": "#020909",
    "--bg-bottom": "#020909",
    "--shell-top": "#010707",
    "--shell-bottom": "#010707",
    "--panel": "#071918",
    "--panel-2": "#0a2423",
    "--line": "rgba(103, 240, 228, 0.28)",
    "--line-deep": "rgba(103, 240, 228, 0.18)",
    "--text": "#e7f1f1",
    "--text-bright": "#e7f1f1",
    "--quiet": "#8ba5a3",
    "--accent": "#ffb84f",
    "--accent-strong": "#ffb84f",
    "--corner-accent": "#ffb84f",
    "--cyan": "#8efcff",
    "--shadow": "rgba(0, 0, 0, 0.35)",
    "--pixel-grid": "rgba(142, 252, 255, 0.04)",
    "--border-width": "1px",
    "--border-bottom-width": "1px",
    "--corner-accent-size": "0",
    "--font-body": "\"M PLUS 1\", \"Ubuntu Sans\", Ubuntu, \"Noto Sans JP\", system-ui, sans-serif",
    "--font-title": "\"Montserrat\", \"Zen Kaku Gothic New\", \"M PLUS 1\", \"Ubuntu Sans\", system-ui, sans-serif",
    "--font-mono": "\"Ubuntu Sans Mono\", \"M PLUS 1 Code\", \"Cascadia Mono\", Consolas, monospace",
};
let activeFontStylesheet;
let currentSurfaceStyles = normalizeSurfaceStyles(undefined);
let currentSurfaceDocument;
let currentOptions = {};
export function renderEveSurface(surface, host, options = {}) {
    currentSurfaceDocument = surface;
    currentOptions = options;
    currentSurfaceStyles = normalizeSurfaceStyles(surface.surface?.styles);
    globalThis.__eveCurrentMesh = surface.mesh;
    applyEveSurfaceStyles(surface.surface?.styles, options.body ?? document.body);
    if (options.body) {
        options.body.dataset.provider = surface.providerId || options.provider?.providerId || "";
    }
    if (options.statusElement) {
        options.statusElement.textContent = `${surface.title || surface.surface?.title || "surface"}${options.source ? ` (${options.source})` : ""}`;
    }
    if (surface.surface?.root) {
        host.replaceChildren(renderEveComponent(surface.surface.root, options));
    }
    else {
        host.replaceChildren(emptyState("No surface root"));
    }
    return host;
}
export function renderEveComponent(node, options = currentOptions) {
    const kind = node.kind || "panel";
    const props = objectProps(node.props);
    const layout = objectProps(node.layout);
    const style = objectProps(node.style);
    const children = node.children || [];
    const embeddedDocuments = node.embeddedDocuments || [];
    if (kind === "surface" || kind === "cockpit" || kind === "dashboard") {
        const surface = el("section", "cultui-surface-root eve-surface");
        assignId(surface, node);
        if (typeof layout.direction === "string")
            surface.dataset.direction = layout.direction;
        else if (typeof props.layout === "object" && props.layout && typeof props.layout.direction === "string") {
            surface.dataset.direction = String(props.layout.direction);
        }
        if (kind !== "surface")
            surface.dataset.surfaceKind = kind;
        applyGeneratedLayout(surface, layout, style);
        for (const child of children)
            surface.append(renderEveComponent(child, options));
        return surface;
    }
    if (kind === "column" || kind === "row" || kind === "form" || kind === "rail") {
        const element = el("div", `cultui-partition eve-${kind}`);
        assignId(element, node);
        element.dataset.direction = kind === "row" || kind === "rail" ? "horizontal" : "vertical";
        if (kind === "rail")
            element.dataset.overflow = "x";
        applyBoxProps(element, { ...layout, ...props });
        applyGeneratedLayout(element, layout, style);
        for (const child of children)
            element.append(renderEveComponent(child, options));
        return element;
    }
    if (kind === "grid") {
        const grid = el("section", "cultui-grid");
        const columns = positiveInt(props.columns, 0);
        if (columns > 0)
            grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
        else if (typeof props.columns === "string")
            grid.style.gridTemplateColumns = props.columns;
        const rows = positiveInt(props.rows, 0);
        if (rows > 0)
            grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, auto))`;
        applyGeneratedLayout(grid, layout, style);
        for (const child of children)
            grid.append(renderEveComponent(child, options));
        return grid;
    }
    if (kind === "partition") {
        const partition = el("section", `cultui-partition split-${stringProp(props.split, "none")}`);
        assignId(partition, node);
        applyBoxProps(partition, props);
        applyGeneratedLayout(partition, layout, style);
        partition.style.minWidth = "0";
        if (stringProp(props.split, "none") === "x" && !firstString(props.flexWrap, layout.flexWrap, "")) {
            partition.style.flexWrap = "wrap";
        }
        if (typeof props.role === "string")
            partition.dataset.role = props.role;
        for (const child of children)
            partition.append(renderEveComponent(child, options));
        return partition;
    }
    if (kind === "input.binding-map") {
        return renderInputBindingMap(node, props, options);
    }
    if (kind === "inventory.drag_session") {
        return renderInventoryDragSession(node, props, layout, style);
    }
    if (kind === "inventory.grid") {
        return renderInventoryGrid(node, props, layout, style, options);
    }
    if (kind === "inventory.item") {
        return renderInventoryItem(node, props, layout, style);
    }
    if (kind === "field.surface2d" || kind === "gravity.surface") {
        return renderGravitySurface(node, props, layout, style, options);
    }
    if (kind === "image.background") {
        const view = el("div", "cultui-background");
        const src = resolveAssetUrl(firstString(props.src, props.assetUri, props.assetRef, ""));
        if (src)
            view.style.backgroundImage = `url("${src}")`;
        view.setAttribute("aria-label", stringProp(props.label, "background"));
        return view;
    }
    if (kind === "image.sprite") {
        const figure = el("figure", `cultui-sprite ${stringProp(props.slot, "center")}`);
        assignId(figure, node);
        const src = resolveAssetUrl(firstString(props.src, props.assetUri, props.assetRef, ""));
        if (src) {
            const image = el("img");
            image.src = src;
            image.alt = stringProp(props.alt, stringProp(props.actor, stringProp(props.label, "")));
            figure.append(image);
        }
        return figure;
    }
    if (kind === "avatar") {
        const card = el("figure", "cultui-avatar-card");
        assignId(card, node);
        const src = resolveAssetUrl(firstString(props.src, props.assetUri, props.assetRef, ""));
        if (src) {
            const image = el("img");
            image.src = src;
            image.alt = stringProp(props.alt, stringProp(props.text, stringProp(props.label, "")));
            card.append(image);
        }
        else {
            card.append(el("div", "cultui-avatar-fallback", initials(firstString(props.text, props.label, props.actor, "?"))));
        }
        const label = firstString(props.text, props.label, props.actor, "");
        if (label)
            card.append(el("figcaption", "cultui-avatar-name", label));
        const status = firstString(props.status, "");
        if (status)
            card.append(el("div", "cultui-avatar-status", status));
        const detail = firstString(props.detail, "");
        if (detail)
            card.append(el("div", "cultui-avatar-detail", detail));
        return card;
    }
    if (kind === "pane" || kind === "panel") {
        const pane = el("section", "pane cultui-pane");
        assignId(pane, node);
        const span = stringProp(props.span, "");
        if (span)
            pane.dataset.span = span;
        const density = stringProp(props.density, "");
        if (density)
            pane.dataset.density = density;
        const title = stringProp(props.title, node.text || "");
        if (title)
            pane.append(el("h2", "", title));
        for (const child of children)
            pane.append(renderEveComponent(child, options));
        return pane;
    }
    if (kind === "list") {
        const list = el("section", "cultui-list");
        assignId(list, node);
        const title = stringProp(props.title, "");
        if (title)
            list.append(el("h3", "cultui-list-title", title));
        for (const child of children)
            list.append(renderEveComponent(child, options));
        return list;
    }
    if (kind === "bar") {
        const bar = el("div", "cultui-meter");
        assignId(bar, node);
        const label = stringProp(props.label, "");
        const value = stringProp(props.value, "");
        if (label || value) {
            const head = el("div", "cultui-meter-head");
            head.append(el("span", "", label));
            head.append(el("strong", "", value));
            bar.append(head);
        }
        const track = el("div", "cultui-meter-track");
        const fill = el("span", "cultui-meter-fill");
        fill.style.width = `${clampPercent(props.percent)}%`;
        track.append(fill);
        bar.append(track);
        return bar;
    }
    if (kind === "card") {
        const commandId = resolveComponentCommandId(props, node);
        const card = commandId
            ? el("button", "card cultui-card cultui-card-button")
            : el("article", "card cultui-card");
        assignId(card, node);
        applyGeneratedLayout(card, layout, style);
        if (card instanceof HTMLButtonElement)
            card.type = "button";
        const title = stringProp(props.title, node.text || "");
        if (title)
            card.append(el("div", "card-title", title));
        for (const child of children)
            card.append(renderEveComponent(child, options));
        if (commandId)
            wireCommand(card, node, commandId, props, options);
        return card;
    }
    if (kind === "control.button") {
        const button = el("button", "cultui-button eve-control-button", stringProp(props.label, "Action"));
        assignId(button, node);
        button.type = "button";
        applyGeneratedLayout(button, layout, style);
        wireCommand(button, node, resolveComponentCommandId(props, node), props, options);
        return button;
    }
    if (kind === "control.popup") {
        const button = el("button", "cultui-button eve-control-popup", stringProp(props.label, "Open"));
        assignId(button, node);
        button.type = "button";
        applyGeneratedLayout(button, layout, style);
        button.addEventListener("click", event => {
            openComponentPopup(node, options, button, event.clientX, event.clientY);
        });
        return button;
    }
    if (kind === "text.dialogue" || kind === "text" || kind === "text.title" || kind === "text.subtitle" || kind === "label") {
        const text = el("div", textClassName(kind, props, node), stringProp(props.value, stringProp(props.text, node.text || "")));
        assignId(text, node);
        applyBoxProps(text, props);
        applyGeneratedLayout(text, layout, style);
        return text;
    }
    if (kind === "metric") {
        const metric = el("dl", "metric cultui-reactive-metric eve-metric");
        assignId(metric, node);
        applyGeneratedLayout(metric, layout, style);
        metric.append(el("dt", "", stringProp(props.label, "Metric")));
        metric.append(el("dd", "metric-value", stringProp(props.value, "")));
        return metric;
    }
    if (kind === "progress") {
        const progress = el("div", "cultui-meter eve-progress");
        assignId(progress, node);
        applyGeneratedLayout(progress, layout, style);
        const label = stringProp(props.label, "");
        const value = stringProp(props.value, "");
        const min = Number(props.min ?? 0);
        const max = Number(props.max ?? 1);
        const numeric = Number(props.value ?? 0);
        const percent = Number.isFinite(numeric) && Number.isFinite(min) && Number.isFinite(max) && max !== min
            ? ((numeric - min) / (max - min)) * 100
            : clampPercent(props.percent);
        if (label || value) {
            const head = el("div", "cultui-meter-head");
            head.append(el("span", "", label));
            head.append(el("strong", "", value));
            progress.append(head);
        }
        const track = el("div", "cultui-meter-track");
        const fill = el("span", "cultui-meter-fill");
        fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        track.append(fill);
        progress.append(track);
        return progress;
    }
    if (kind === "modal") {
        const modal = el("section", "cultui-modal-surface");
        assignId(modal, node);
        applyGeneratedLayout(modal, layout, style);
        const title = stringProp(props.title, "");
        if (title)
            modal.append(el("h2", "cultui-modal-surface-title", title));
        for (const child of children)
            modal.append(renderEveComponent(child, options));
        return modal;
    }
    if (kind === "options") {
        const list = el("section", "cultui-options");
        assignId(list, node);
        applyGeneratedLayout(list, layout, style);
        const label = stringProp(props.label, "");
        if (label)
            list.append(el("h3", "cultui-list-title", label));
        for (const child of children)
            list.append(renderEveComponent(child, options));
        if (children.length === 0)
            list.append(emptyState("waiting for options"));
        return list;
    }
    if (kind === "image.preview") {
        const figure = el("figure", "cultui-image-preview");
        assignId(figure, node);
        const frame = el("div", "cultui-image-frame");
        const src = resolveAssetUrl(firstString(props.src, props.assetUri, props.assetRef, ""));
        if (src) {
            const image = el("img");
            image.src = src;
            image.alt = stringProp(props.label, "");
            image.style.imageRendering = stringProp(props.imageRendering, "auto");
            if (props.zoom !== undefined) {
                image.style.transform = `scale(${props.zoom})`;
                image.style.transformOrigin = stringProp(props.crop, "50% 50%");
            }
            frame.append(image);
        }
        else {
            frame.append(el("span", "", stringProp(props.label, "image")));
        }
        figure.append(frame);
        if (props.label)
            figure.append(el("figcaption", "", String(props.label)));
        return figure;
    }
    if (kind === "canvas.preview" || kind === "canvas.editor") {
        const panel = el("div", `cultui-canvas-placeholder ${kind === "canvas.editor" ? "editor" : "preview"}`);
        assignId(panel, node);
        panel.append(el("div", "viz-label", stringProp(props.label, "Canvas")));
        panel.append(el("div", "cultui-canvas-grid", props.state === "empty" ? "waiting for pixels" : stringProp(props.state, "")));
        return panel;
    }
    if (kind === "surface.slot") {
        const slot = el("section", "cultui-embedded-slot");
        assignId(slot, node);
        applyGeneratedLayout(slot, layout, style);
        slot.dataset.slotId = stringProp(props.slotId, stringProp(embeddedDocuments[0]?.slotId, ""));
        slot.dataset.documentId = stringProp(props.documentId, stringProp(embeddedDocuments[0]?.documentId, ""));
        slot.dataset.schemaId = stringProp(props.schemaId, stringProp(embeddedDocuments[0]?.schemaId, ""));
        slot.dataset.presentationKind = stringProp(props.presentationKind, stringProp(embeddedDocuments[0]?.presentationKind, ""));
        const inlineSurface = embeddedDocuments
            .map(document => objectProps(document.surface))
            .find(surface => objectProps(surface.root).kind || surface.root);
        const isModal = props.modal === true || slot.dataset.presentationKind.includes("modal");
        if ((inlineSurface || slot.dataset.documentId) && isModal) {
            const trigger = el("button", "cultui-button cultui-modal-trigger", stringProp(props.label, slot.dataset.slotId || "Configure"));
            trigger.type = "button";
            trigger.addEventListener("click", () => openEmbeddedSurfaceModal(resolveEmbeddedSurface(node, options), options));
            slot.append(trigger);
        }
        else if (inlineSurface || slot.dataset.documentId) {
            const body = el("div", "cultui-embedded-slot-body");
            body.append(el("div", "detail", "materializing surface"));
            slot.append(body);
            void resolveEmbeddedSurface(node, options)
                .then(surface => {
                body.replaceChildren(surface?.root ? renderEveComponent(surface.root, options) : emptyState("Embedded surface unavailable"));
            })
                .catch(error => {
                body.replaceChildren(emptyState(`Embedded surface failed: ${error instanceof Error ? error.message : String(error)}`));
            });
        }
        else {
            slot.append(el("div", "detail", slot.dataset.presentationKind || slot.dataset.slotId || "embedded surface"));
        }
        return slot;
    }
    if (kind === "control.slider") {
        return renderSlider(props, children, options);
    }
    if (kind === "control.toggle") {
        const toggle = el("label", "toggle-row cultui-toggle");
        assignId(toggle, node);
        toggle.append(el("span", "field-control", props.value ? "on" : "off"));
        toggle.append(el("span", "toggle-copy", stringProp(props.label, "Toggle")));
        return toggle;
    }
    if (kind === "input.number" || kind === "input.select" || kind === "control.range" || kind === "control.input.text" || kind === "control.select") {
        const field = el("label", "field cultui-field");
        assignId(field, node);
        applyBoxProps(field, props);
        applyGeneratedLayout(field, layout, style);
        field.append(el("span", "field-label", stringProp(props.label, "")));
        field.append(el("span", "field-control cultui-field-value", props.value === undefined ? "" : String(props.value)));
        return field;
    }
    if (kind === "color.swatch") {
        const swatch = el("div", "paint-swatch cultui-swatch");
        assignId(swatch, node);
        swatch.style.background = stringProp(props.value, stringProp(props.color, "currentColor"));
        swatch.title = stringProp(props.label, "Color");
        return swatch;
    }
    const fallback = el("section", "pane");
    assignId(fallback, node);
    fallback.append(el("h2", "", kind));
    for (const child of children)
        fallback.append(renderEveComponent(child, options));
    return fallback;
}
function applyGeneratedLayout(element, layout, style = {}) {
    const display = firstString(layout.display, "");
    if (display)
        element.style.display = display;
    const direction = firstString(layout.direction, "");
    if (direction)
        element.style.flexDirection = direction === "horizontal" ? "row" : direction === "vertical" ? "column" : direction;
    const flexWrap = firstString(layout.flexWrap, "");
    if (flexWrap)
        element.style.flexWrap = flexWrap;
    const gridTemplateColumns = firstString(layout.gridTemplateColumns, "");
    if (gridTemplateColumns)
        element.style.gridTemplateColumns = gridTemplateColumns;
    const gridTemplateRows = firstString(layout.gridTemplateRows, "");
    if (gridTemplateRows)
        element.style.gridTemplateRows = gridTemplateRows;
    const gridTemplateAreas = firstString(layout.gridTemplateAreas, "");
    if (gridTemplateAreas)
        element.style.gridTemplateAreas = gridTemplateAreas;
    const gridArea = firstString(layout.gridArea, "");
    if (gridArea)
        element.style.gridArea = gridArea;
    const placeItems = firstString(layout.placeItems, "");
    if (placeItems)
        element.style.placeItems = placeItems;
    applyStyleSize(element, "gap", firstString(layout.gap, ""));
    applyStyleSize(element, "padding", firstString(layout.padding, ""));
    applyStyleSize(element, "margin", firstString(layout.margin, ""));
    applyStyleSize(element, "top", firstString(layout.top, ""));
    applyStyleSize(element, "right", firstString(layout.right, ""));
    applyStyleSize(element, "bottom", firstString(layout.bottom, ""));
    applyStyleSize(element, "left", firstString(layout.left, ""));
    applyStyleSize(element, "width", firstString(layout.width, ""));
    applyStyleSize(element, "minWidth", firstString(layout.minWidth, ""));
    applyStyleSize(element, "maxWidth", firstString(layout.maxWidth, ""));
    applyStyleSize(element, "height", firstString(layout.height, ""));
    applyStyleSize(element, "minHeight", firstString(layout.minHeight, ""));
    applyStyleSize(element, "maxHeight", firstString(layout.maxHeight, ""));
    const alignItems = firstString(layout.alignItems, "");
    if (alignItems)
        element.style.alignItems = alignItems;
    const justifyContent = firstString(layout.justifyContent, "");
    if (justifyContent)
        element.style.justifyContent = justifyContent;
    const alignSelf = firstString(layout.alignSelf, "");
    if (alignSelf)
        element.style.alignSelf = alignSelf;
    const overflow = firstString(layout.overflow, "");
    if (overflow)
        element.style.overflow = overflow;
    const overflowX = firstString(layout.overflowX, "");
    if (overflowX)
        element.style.overflowX = overflowX;
    const overflowY = firstString(layout.overflowY, "");
    if (overflowY)
        element.style.overflowY = overflowY;
    const position = firstString(layout.position, "");
    if (position)
        element.style.position = position;
    const cursor = firstString(layout.cursor, "");
    if (cursor)
        element.style.cursor = cursor;
    const background = firstString(style.background, "");
    if (background)
        element.style.background = tokenColor(background);
    const color = firstString(style.color, "");
    if (color)
        element.style.color = tokenColor(color);
    applyStyleSize(element, "borderWidth", firstString(style.borderWidth, ""));
    const borderColor = firstString(style.borderColor, "");
    if (borderColor)
        element.style.borderColor = tokenColor(borderColor);
    const borderStyle = firstString(style.borderStyle, "");
    if (borderStyle)
        element.style.borderStyle = borderStyle;
    applyStyleSize(element, "borderRadius", firstString(style.borderRadius, ""));
    const boxShadow = firstString(style.boxShadow, "");
    if (boxShadow)
        element.style.boxShadow = boxShadow;
    const font = firstString(style.font, "");
    if (font)
        element.style.font = font;
    applyStyleSize(element, "fontSize", firstString(style.fontSize, ""));
    const fontWeight = firstString(style.fontWeight, "");
    if (fontWeight)
        element.style.fontWeight = fontWeight;
    const textTransform = firstString(style.textTransform, "");
    if (textTransform)
        element.style.textTransform = textTransform;
    const textAlign = firstString(style.textAlign, "");
    if (textAlign)
        element.style.textAlign = textAlign;
    const whiteSpace = firstString(style.whiteSpace, "");
    if (whiteSpace)
        element.style.whiteSpace = whiteSpace;
    const styleOverflow = firstString(style.overflow, "");
    if (styleOverflow)
        element.style.overflow = styleOverflow;
    const textOverflow = firstString(style.textOverflow, "");
    if (textOverflow)
        element.style.textOverflow = textOverflow;
    applyStyleSize(element, "lineHeight", firstString(style.lineHeight, ""));
}
function applyStyleSize(element, property, value) {
    if (!value)
        return;
    element.style[property] = cssSize(value);
}
function prefixedProps(props, prefix) {
    const result = {};
    for (const [key, value] of Object.entries(props)) {
        if (key.startsWith(prefix))
            result[key.slice(prefix.length)] = value;
    }
    return result;
}
const gravitySurfaceDataStates = new WeakMap();
function renderGravitySurface(node, props, layout, style, options) {
    const canvas = el("canvas", "cultui-gravity-surface");
    assignId(canvas, node);
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", stringProp(props.label, "gravity surface"));
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    applyGeneratedLayout(canvas, layout, style);
    let drawQueued = false;
    const state = {};
    gravitySurfaceDataStates.set(canvas, state);
    const draw = () => drawGravitySurface(canvas, props, state);
    const scheduleDraw = () => {
        if (!canvas.isConnected || drawQueued)
            return;
        drawQueued = true;
        requestAnimationFrame(() => {
            if (!canvas.isConnected) {
                drawQueued = false;
                return;
            }
            drawQueued = false;
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
        void resolveGravitySurfaceDocuments(node, props, options, state)
            .then((changed) => {
            if (changed && canvas.isConnected)
                scheduleDraw();
        })
            .catch((error) => {
            state.lastError = error instanceof Error ? error.message : String(error);
        });
    };
    if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(scheduleDraw);
        observer.observe(canvas);
    }
    scheduleDraw();
    const refreshMs = Math.max(33, Math.min(1000, positiveInt(props.stateRefreshMs, 100)));
    refreshTimer = window.setInterval(refreshDocuments, refreshMs);
    queueMicrotask(refreshDocuments);
    window.setTimeout(scheduleDraw, 300);
    window.setTimeout(scheduleDraw, 1000);
    return canvas;
}
async function resolveGravitySurfaceDocuments(node, props, options, state) {
    if (!options.documentResolver || state.loading)
        return false;
    const requests = [
        gravityDocumentRequest(node, props, "renderSplats", "renderSplatsDocumentId", "renderSplatsSchemaId"),
        gravityDocumentRequest(node, props, "gravity", "gravityDocumentId", "gravitySchemaId"),
        gravityDocumentRequest(node, props, "objects", "objectsDocumentId", "objectsSchemaId"),
    ].filter((request) => Boolean(request?.documentId));
    if (requests.length === 0)
        return false;
    state.loading = true;
    try {
        let changed = false;
        for (const request of requests) {
            const resolved = await options.documentResolver(request, node);
            let document = objectProps(resolved?.document);
            if (Object.keys(document).length === 0) {
                document = objectProps(await fetchGravitySurfaceDocument(request, options));
            }
            if (!document || Object.keys(document).length === 0)
                continue;
            const key = request.slotId === "renderSplats"
                ? "renderSplats"
                : request.slotId === "gravity"
                    ? "gravity"
                    : "objects";
            const previousFrame = numberProp(state[key]?.frameId, -1);
            const nextFrame = numberProp(document.frameId, previousFrame);
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
async function fetchGravitySurfaceDocument(request, options) {
    if (typeof fetch !== "function" || typeof window === "undefined")
        return undefined;
    const providerId = currentSurfaceDocument?.providerId || options.provider?.providerId || "aetheria";
    const params = new URLSearchParams();
    params.set("documentId", request.documentId);
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
    const payload = await response.json();
    return objectProps(payload).document;
}
function gravityDocumentRequest(component, props, slotId, propDocumentId, propSchemaId) {
    const slot = (component.embeddedDocuments || []).find((candidate) => String(candidate?.slotId || "") === slotId);
    const documentId = firstString(props[propDocumentId], slot?.documentId, "");
    if (!documentId)
        return undefined;
    return {
        documentId,
        schemaId: firstString(props[propSchemaId], slot?.schemaId, ""),
        presentationKind: firstString(slot?.presentationKind, "data"),
        slotId,
    };
}
function drawGravitySurface(canvas, props, state) {
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
    drawGravityBodies(ctx, bodies, props, bounds, width, height);
    drawGravityObjects(ctx, objects, props, bounds, width, height);
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
const gravityWebGlRenderers = new WeakMap();
const GRAVITY_SPLAT_STRIDE_FLOATS = 20;
function drawGravityFieldWebGl(ctx, props, gravityDocument, bodies, bounds, width, height, renderSplatsDocument) {
    const renderer = resolveGravityWebGlRenderer(ctx.canvas);
    if (!renderer)
        return false;
    const gl = renderer.gl;
    if (!ensureGravityWebGlTarget(renderer, width, height)) {
        gravityWebGlRenderers.set(ctx.canvas, null);
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
function buildGravitySplatsFromDocument(document) {
    const splats = objectProps(document?.splats);
    const layers = Array.isArray(document?.layers) ? document.layers : [];
    const gravityLayerIndex = layers.findIndex(layer => stringProp(layer?.layerKey, "") === "gravity.height");
    if (gravityLayerIndex < 0)
        return undefined;
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
    const rows = [];
    const corners = [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1];
    for (let index = 0; index < count; index += 1) {
        if ((layerIndex[index] ?? -1) !== gravityLayerIndex)
            continue;
        for (let corner = 0; corner < corners.length; corner += 2) {
            rows.push(corners[corner], corners[corner + 1], centerX[index] ?? 0, centerY[index] ?? 0, Math.max(0.0001, halfExtentX[index] ?? 1), Math.max(0.0001, halfExtentY[index] ?? 1), rotationCos[index] ?? 1, rotationSin[index] ?? 0, channel[index] ?? 1, falloff[index] ?? 0, valueR[index] ?? 0, 0, sourceKind[index] ?? 0, frequencyX[index] ?? 1, animationSpeed[index] ?? 0, sourceFlags[index] ?? 0);
        }
    }
    return rows.length > 0 ? new Float32Array(rows) : undefined;
}
function buildGravitySplatBuffers(props, gravityDocument, bodies, bounds, renderSplatsDocument) {
    const gravityRows = [];
    const tintRows = [];
    appendUnityGravitySplats(gravityRows, props, gravityDocument, bodies, bounds);
    appendTintSplatsFromDocument(tintRows, props, renderSplatsDocument);
    return {
        gravity: new Float32Array(gravityRows),
        tint: new Float32Array(tintRows),
    };
}
function appendUnityGravitySplats(rows, props, gravityDocument, bodies, bounds) {
    const terrainRadius = numberProp(gravityDocument.terrainRadius, numberProp(props.terrainRadius, 1200));
    const terrainDepth = numberProp(gravityDocument.terrainDepth, numberProp(props.terrainDepth, -8));
    if (terrainDepth !== 0) {
        appendGravitySplat(rows, 0, 0, Math.max(1, terrainRadius * 2), Math.max(1, terrainRadius * 2), -terrainDepth, 0, 0, 1, Math.max(0.0001, numberProp(gravityDocument.terrainDepthExponent, numberProp(props.terrainDepthExponent, 1.2))), 0, 1, 0, 0);
    }
    for (const body of bodies) {
        appendGravitySplat(rows, body.x, body.y, Math.max(1, body.radius), Math.max(1, body.radius), -body.depth, 0, 0, 1, Math.max(0.0001, body.exponent), 0, 1, 0, 0);
        if (body.waveRadius > 0 && body.waveDepth !== 0) {
            appendGravitySplat(rows, body.x, body.y, body.waveRadius, body.waveRadius, -body.waveDepth, 0, 0, 1, 8.0, 4, numberProp(gravityDocument.terrainWaveFrequency, numberProp(props.terrainWaveFrequency, 0.6)), body.waveSpeed, 0);
        }
    }
    void bounds;
}
function appendTintSplatsFromDocument(rows, props, document) {
    const splats = objectProps(document?.splats);
    const layers = Array.isArray(document?.layers) ? document.layers : [];
    const tintLayerIndices = new Set();
    const selectedLayer = firstString(props.vectorFieldLayer, props.tintFieldLayer, "fog.tint");
    layers.forEach((layer, index) => {
        const layerKey = stringProp(layer?.layerKey, "");
        const channel = numberProp(layer?.channel, -1);
        if (channel === 4 && layerKey === selectedLayer)
            tintLayerIndices.add(index);
    });
    const count = Math.max(0, positiveInt(splats.count, 0));
    if (count <= 0 || tintLayerIndices.size === 0)
        return;
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
        if (!tintLayerIndices.has(layerIndex[index] ?? -1) || (channel[index] ?? -1) !== 4)
            continue;
        const power = (falloff[index] ?? 0) === 0 ? 0.0001 : 1.25;
        appendGravitySplat(rows, centerX[index] ?? 0, centerY[index] ?? 0, Math.max(0.0001, halfExtentX[index] ?? 1), Math.max(0.0001, halfExtentY[index] ?? 1), valueR[index] ?? 0, valueG[index] ?? 0, valueB[index] ?? 0, valueA[index] ?? 1, power, sourceKind[index] ?? 0, frequencyX[index] ?? 1, animationSpeed[index] ?? 0, sourceFlags[index] ?? 0, rotationCos[index] ?? 1, rotationSin[index] ?? 0);
    }
}
function resolveGravityWebGlRenderer(canvas) {
    if (gravityWebGlRenderers.has(canvas))
        return gravityWebGlRenderers.get(canvas) || null;
    const output = document.createElement("canvas");
    const gl = output.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false });
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
function ensureGravityWebGlTarget(renderer, width, height) {
    if (renderer.width === width && renderer.height === height && renderer.fieldTexture && renderer.tintTexture && renderer.framebuffer && renderer.tintFramebuffer)
        return true;
    const gl = renderer.gl;
    renderer.width = width;
    renderer.height = height;
    renderer.canvas.width = width;
    renderer.canvas.height = height;
    if (renderer.fieldTexture)
        gl.deleteTexture(renderer.fieldTexture);
    if (renderer.tintTexture)
        gl.deleteTexture(renderer.tintTexture);
    if (renderer.framebuffer)
        gl.deleteFramebuffer(renderer.framebuffer);
    if (renderer.tintFramebuffer)
        gl.deleteFramebuffer(renderer.tintFramebuffer);
    renderer.fieldTexture = gl.createTexture();
    renderer.tintTexture = gl.createTexture();
    renderer.framebuffer = gl.createFramebuffer();
    renderer.tintFramebuffer = gl.createFramebuffer();
    if (!renderer.fieldTexture || !renderer.tintTexture || !renderer.framebuffer || !renderer.tintFramebuffer)
        return false;
    configureGravityTexture(gl, renderer.fieldTexture, width, height);
    configureGravityTexture(gl, renderer.tintTexture, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderer.fieldTexture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        return false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.tintFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderer.tintTexture, 0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
}
function configureGravityTexture(gl, texture, width, height) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
}
function buildGravitySplats(props, gravityDocument, bodies, bounds) {
    const rows = [];
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
function appendGravitySplat(rows, centerX, centerY, halfX, halfY, valueR, valueG, valueB, valueA, power, sourceKind, frequencyX, animationSpeed, sourceFlags, rotationCos = 1, rotationSin = 0) {
    const corners = [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1];
    for (let i = 0; i < corners.length; i += 2) {
        rows.push(corners[i], corners[i + 1], centerX, centerY, halfX, halfY, rotationCos, rotationSin, power, 0, 0, 0, sourceKind, frequencyX, animationSpeed, sourceFlags, valueR, valueG, valueB, valueA);
    }
}
function bindGravitySplatAttributes(gl, program) {
    bindGravitySplatAttribute(gl, program, "a_corner", 2, 0);
    bindGravitySplatAttribute(gl, program, "a_center", 2, 2);
    bindGravitySplatAttribute(gl, program, "a_half", 2, 4);
    bindGravitySplatAttribute(gl, program, "a_rot", 2, 6);
    bindGravitySplatAttribute(gl, program, "a_meta", 4, 8);
    bindGravitySplatAttribute(gl, program, "a_source", 4, 12);
    bindGravitySplatAttribute(gl, program, "a_value", 4, 16);
}
function bindGravitySplatAttribute(gl, program, name, size, offsetFloats) {
    const location = gl.getAttribLocation(program, name);
    if (location < 0)
        return;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, GRAVITY_SPLAT_STRIDE_FLOATS * 4, offsetFloats * 4);
}
function createGravityProgram(gl, vertexSource, fragmentSource) {
    const vertex = compileGravityShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compileGravityShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment)
        return null;
    const program = gl.createProgram();
    if (!program)
        return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        return null;
    return program;
}
function compileGravityShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader)
        return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        return null;
    return shader;
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
function drawGravityBodies(ctx, bodies, props, bounds, width, height) {
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
function drawGravityObjects(ctx, objects, props, bounds, width, height) {
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
            tint: "cultmesh://aetheria/assets/textures/tint_splat",
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
function numberProp(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}
function vector3Prop(value, fallback) {
    if (Array.isArray(value)) {
        const values = value.map(entry => Number(entry));
        if (values.length >= 3 && values.slice(0, 3).every(Number.isFinite))
            return [values[0], values[1], values[2]];
    }
    if (typeof value === "string") {
        const values = value.split(/[,\s]+/).map(entry => Number(entry)).filter(Number.isFinite);
        if (values.length >= 3)
            return [values[0], values[1], values[2]];
    }
    return fallback;
}
function uniform3(gl, program, name, value) {
    gl.uniform3f(gl.getUniformLocation(program, name), value[0], value[1], value[2]);
}
function numberArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((entry) => numberProp(entry, 0));
}
function renderInventoryDragSession(node, props, layout, style) {
    const active = boolProp(props.active);
    const panel = el("section", "cultui-inventory-drag");
    assignId(panel, node);
    applyGeneratedLayout(panel, layout, style);
    panel.dataset.active = active ? "true" : "false";
    const label = el("div", "cultui-inventory-section-label", "Drag");
    applyGeneratedLayout(label, prefixedProps(layout, "sectionLabel."), prefixedProps(style, "sectionLabel."));
    panel.append(label);
    if (!active) {
        const empty = el("div", "cultui-inventory-empty", "None");
        applyGeneratedLayout(empty, prefixedProps(layout, "empty."), prefixedProps(style, "empty."));
        panel.append(empty);
        return panel;
    }
    const itemKey = firstString(props.itemKey, props.item, "item");
    const chip = el("div", "cultui-inventory-drag-chip", itemKey);
    applyGeneratedLayout(chip, prefixedProps(layout, "dragChip."), prefixedProps(style, "dragChip."));
    panel.append(chip);
    const offset = [props.originOffsetX, props.originOffsetY]
        .map(value => Number(value))
        .map(value => Number.isFinite(value) ? value : 0);
    const meta = el("div", "cultui-inventory-meta", `origin ${offset[0]}, ${offset[1]}`);
    applyGeneratedLayout(meta, prefixedProps(layout, "meta."), prefixedProps(style, "meta."));
    panel.append(meta);
    return panel;
}
function renderInventoryGrid(node, props, layout, style, options) {
    const grid = el("section", "cultui-inventory-grid");
    assignId(grid, node);
    applyGeneratedLayout(grid, layout, style);
    const requestedColumns = positiveInt(firstString(props.columns, props.gridColumns, props.widthCells, ""), 0);
    const columns = requestedColumns > 0 ? requestedColumns : 6;
    const requestedRows = positiveInt(props.rows, 0);
    const rows = requestedRows > 0 ? requestedRows : Math.max(3, Math.ceil(Math.max((node.children || []).length, 1) / columns));
    grid.style.setProperty("--inventory-columns", String(columns));
    grid.style.setProperty("--inventory-rows", String(rows));
    grid.dataset.cellSpriteMode = stringProp(props.cellSpriteMode, "");
    const title = firstString(props.title, props.label, "Inventory");
    const label = el("div", "cultui-inventory-section-label", title);
    applyGeneratedLayout(label, prefixedProps(layout, "sectionLabel."), prefixedProps(style, "sectionLabel."));
    grid.append(label);
    const board = el("div", "cultui-inventory-board");
    board.style.display = "grid";
    board.style.gridTemplateColumns = `repeat(${columns}, ${cssSize(firstString(props.cellSize, "72"))})`;
    board.style.gridTemplateRows = `repeat(${rows}, ${cssSize(firstString(props.cellSize, "72"))})`;
    board.style.gap = cssSize(firstString(props.cellGap, "4"));
    board.style.overflow = firstString(props.boardOverflow, "auto");
    board.style.padding = cssSize(firstString(props.boardPadding, "4"));
    applyGeneratedLayout(board, prefixedProps(layout, "board."), prefixedProps(style, "board."));
    const occupied = new Set();
    for (const child of node.children || []) {
        const childProps = objectProps(child.props);
        const x = positiveInt(childProps.x, 0);
        const y = positiveInt(childProps.y, 0);
        occupied.add(`${x}:${y}`);
        board.append(renderEveComponent(child, options));
    }
    const totalCells = Math.min(columns * rows, 256);
    for (let index = 0; index < totalCells; index += 1) {
        const x = index % columns;
        const y = Math.floor(index / columns);
        if (occupied.has(`${x}:${y}`))
            continue;
        const cell = el("div", "cultui-inventory-cell");
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.style.gridColumn = String(x + 1);
        cell.style.gridRow = String(y + 1);
        cell.style.width = cssSize(firstString(props.cellSize, "72"));
        cell.style.height = cssSize(firstString(props.cellSize, "72"));
        applyGeneratedLayout(cell, prefixedProps(layout, "cell."), prefixedProps(style, "cell."));
        board.append(cell);
    }
    grid.append(board);
    return grid;
}
function renderInventoryItem(node, props, layout, style) {
    const item = el("button", "cultui-inventory-item");
    assignId(item, node);
    item.type = "button";
    applyGeneratedLayout(item, layout, style);
    const x = positiveInt(props.x, 0);
    const y = positiveInt(props.y, 0);
    item.dataset.itemKey = firstString(props.itemKey, props.label, node.id, "item");
    item.dataset.source = firstString(props.source, "");
    item.style.gridColumn = String(x + 1);
    item.style.gridRow = String(y + 1);
    const icon = el("span", "cultui-inventory-item-icon");
    applyGeneratedLayout(icon, prefixedProps(layout, "icon."), prefixedProps(style, "icon."));
    icon.textContent = inventoryItemGlyph(firstString(props.iconAssetUri, props.iconAssetKey, props.itemKey, props.label, ""));
    item.append(icon);
    const label = firstString(props.label, props.itemKey, "");
    if (label) {
        const labelElement = el("span", "cultui-inventory-item-label", label);
        applyGeneratedLayout(labelElement, prefixedProps(layout, "label."), prefixedProps(style, "label."));
        item.append(labelElement);
    }
    const quantity = Number(props.quantity);
    if (Number.isFinite(quantity) && quantity > 1) {
        const quantityElement = el("span", "cultui-inventory-item-quantity", String(quantity));
        applyGeneratedLayout(quantityElement, prefixedProps(layout, "quantity."), prefixedProps(style, "quantity."));
        item.append(quantityElement);
    }
    item.title = [
        label,
        firstString(props.source, ""),
        firstString(props.quality, "") ? `quality ${props.quality}` : "",
        firstString(props.durability, "") ? `durability ${props.durability}` : "",
    ].filter(Boolean).join(" | ");
    return item;
}
function renderInputBindingMap(node, props, options) {
    const root = el("section", "cultui-binding-map");
    assignId(root, node);
    const diagram = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    diagram.setAttribute("class", "cultui-xbox-controller");
    diagram.setAttribute("viewBox", "0 0 780 420");
    diagram.setAttribute("role", "img");
    diagram.setAttribute("aria-label", stringProp(props.label, "Xbox controller remapping"));
    diagram.innerHTML = xboxControllerSvg();
    root.append(diagram);
    const overlay = el("div", "cultui-binding-overlay");
    for (const child of node.children || []) {
        const targetProps = objectProps(child.props);
        const target = stringProp(targetProps.target, child.id || "");
        const box = el("button", "cultui-binding-box");
        assignId(box, child);
        box.type = "button";
        box.dataset.target = target;
        box.dataset.kind = stringProp(targetProps.bindingKind, "button");
        box.style.left = cssSize(targetProps.x ?? "50%");
        box.style.top = cssSize(targetProps.y ?? "50%");
        box.append(el("span", "cultui-binding-target", stringProp(targetProps.label, target)));
        box.append(el("span", "cultui-binding-source", stringProp(targetProps.current, "unmapped")));
        box.addEventListener("click", () => {
            const documentRequest = embeddedDocumentRequest(child);
            if (inlineModalSurface(child) || documentRequest?.documentId) {
                openEmbeddedSurfaceModal(resolveEmbeddedSurface(child, options), options);
            }
            else {
                const commandId = stringProp(targetProps.commandId, "");
                if (commandId)
                    void options.commandSink?.(createEveCommandIntent(commandId, targetProps, options), child);
            }
        });
        overlay.append(box);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", "cultui-binding-line");
        line.setAttribute("x1", stringProp(targetProps.anchorX, "390"));
        line.setAttribute("y1", stringProp(targetProps.anchorY, "210"));
        line.setAttribute("x2", String(percentToSvg(targetProps.x, 780)));
        line.setAttribute("y2", String(percentToSvg(targetProps.y, 420)));
        diagram.append(line);
    }
    root.append(overlay);
    return root;
}
function inlineModalSurface(component) {
    for (const document of component.embeddedDocuments || []) {
        const surface = objectProps(document.surface);
        if (surface.root)
            return surface;
    }
    return undefined;
}
function embeddedDocumentRequest(component) {
    const document = (component.embeddedDocuments || [])[0];
    const props = objectProps(component.props);
    const documentId = firstString(props.documentId, document?.documentId, "");
    if (!documentId)
        return undefined;
    return {
        documentId,
        presentationKind: firstString(props.presentationKind, document?.presentationKind, ""),
        schemaId: firstString(props.schemaId, document?.schemaId, ""),
        slotId: firstString(props.slotId, document?.slotId, ""),
    };
}
async function resolveEmbeddedSurface(component, options) {
    const inline = inlineModalSurface(component);
    if (inline)
        return inline;
    const request = embeddedDocumentRequest(component);
    if (!request?.documentId || !options.documentResolver)
        return undefined;
    const resolved = await options.documentResolver(request, component);
    if (!resolved)
        return undefined;
    return objectProps(resolved.surface).root
        ? resolved.surface
        : resolved;
}
function openEmbeddedSurfaceModal(surfaceOrPromise, options) {
    const backdrop = el("div", "cultui-modal-backdrop");
    const dialog = el("section", "cultui-modal");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    const header = el("header", "cultui-modal-header");
    header.append(el("h2", "", "Configure Binding"));
    const close = el("button", "cultui-modal-close", "Close");
    close.type = "button";
    close.addEventListener("click", () => backdrop.remove());
    header.append(close);
    const body = el("div", "cultui-modal-body");
    dialog.append(header, body);
    backdrop.append(dialog);
    backdrop.addEventListener("click", event => {
        if (event.target === backdrop)
            backdrop.remove();
    });
    document.body.append(backdrop);
    body.append(el("div", "detail", "materializing document"));
    Promise.resolve(surfaceOrPromise)
        .then(surface => {
        header.querySelector("h2").textContent = surface?.title || "Configure Binding";
        body.replaceChildren(surface?.root ? renderEveComponent(surface.root, options) : emptyState("Embedded document unavailable"));
    })
        .catch(error => {
        body.replaceChildren(emptyState(`Embedded document failed: ${error instanceof Error ? error.message : String(error)}`));
    });
}
function openComponentPopup(component, options, trigger, clientX, clientY) {
    const props = objectProps(component.props);
    const popup = (component.children || [])[0];
    const popupProps = objectProps(popup?.props);
    const anchor = firstString(popupProps.anchor, props.anchor, "trigger");
    const placement = firstString(popupProps.placement, props.placement, "below-start");
    const offsetX = Number(firstString(popupProps.offsetX, props.offsetX, "0")) || 0;
    const offsetY = Number(firstString(popupProps.offsetY, props.offsetY, "4")) || 0;
    const backdrop = el("div", "cultui-modal-backdrop");
    backdrop.style.background = "transparent";
    backdrop.style.placeItems = "start";
    const dialog = el("section", "cultui-modal");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.style.position = "fixed";
    dialog.style.width = "min(420px, calc(100vw - 24px))";
    dialog.style.maxHeight = "min(620px, calc(100vh - 24px))";
    const header = el("header", "cultui-modal-header");
    header.append(el("h2", "", firstString(popupProps.title, props.title, props.label, "Options")));
    const close = el("button", "cultui-modal-close", "Close");
    close.type = "button";
    close.addEventListener("click", () => backdrop.remove());
    header.append(close);
    const body = el("div", "cultui-modal-body");
    if (popup) {
        const popupChildren = popup.children || [];
        if (popupChildren.length > 0) {
            body.replaceChildren(...popupChildren.map(child => renderEveComponent(child, options)));
        }
        else {
            body.append(renderEveComponent(popup, options));
        }
    }
    else {
        body.append(emptyState("Popup has no content"));
    }
    dialog.append(header, body);
    backdrop.append(dialog);
    backdrop.addEventListener("click", event => {
        if (event.target === backdrop)
            backdrop.remove();
    });
    document.body.append(backdrop);
    const position = resolvePopupPosition(anchor, placement, trigger, dialog, clientX, clientY, offsetX, offsetY);
    dialog.style.left = `${position.left}px`;
    dialog.style.top = `${position.top}px`;
}
function resolvePopupPosition(anchor, placement, trigger, dialog, clientX, clientY, offsetX, offsetY) {
    const rect = trigger.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const dialogWidth = dialogRect.width || 420;
    const dialogHeight = dialogRect.height || 320;
    const point = anchor === "cursor"
        ? { left: clientX, right: clientX, top: clientY, bottom: clientY, width: 0, height: 0 }
        : rect;
    if (placement === "right-down" || placement === "dropdown") {
        return resolveAnchoredDropdown(point, dialogWidth, dialogHeight, offsetX, offsetY, "right", "down");
    }
    if (placement === "left-down") {
        return resolveAnchoredDropdown(point, dialogWidth, dialogHeight, offsetX, offsetY, "left", "down");
    }
    if (placement === "right-up") {
        return resolveAnchoredDropdown(point, dialogWidth, dialogHeight, offsetX, offsetY, "right", "up");
    }
    if (placement === "left-up") {
        return resolveAnchoredDropdown(point, dialogWidth, dialogHeight, offsetX, offsetY, "left", "up");
    }
    switch (placement) {
        case "above-start":
            return clampPopup(point.left + offsetX, point.top - dialogHeight - offsetY, dialogWidth, dialogHeight);
        case "above-end":
            return clampPopup(point.right - dialogWidth + offsetX, point.top - dialogHeight - offsetY, dialogWidth, dialogHeight);
        case "below-end":
            return clampPopup(point.right - dialogWidth + offsetX, point.bottom + offsetY, dialogWidth, dialogHeight);
        case "right-start":
            return clampPopup(point.right + offsetX, point.top + offsetY, dialogWidth, dialogHeight);
        case "left-start":
            return clampPopup(point.left - dialogWidth - offsetX, point.top + offsetY, dialogWidth, dialogHeight);
        case "center":
            return clampPopup((window.innerWidth - dialogWidth) / 2 + offsetX, (window.innerHeight - dialogHeight) / 2 + offsetY, dialogWidth, dialogHeight);
        case "below-start":
        default:
            return clampPopup(point.left + offsetX, point.bottom + offsetY, dialogWidth, dialogHeight);
    }
}
function resolveAnchoredDropdown(anchor, width, height, offsetX, offsetY, preferredX, preferredY) {
    const margin = 12;
    const spaceRight = window.innerWidth - anchor.right - offsetX - margin;
    const spaceLeft = anchor.left - offsetX - margin;
    const spaceDown = window.innerHeight - anchor.top - offsetY - margin;
    const spaceUp = anchor.bottom - offsetY - margin;
    const opensRight = preferredX === "right"
        ? spaceRight >= width || spaceRight >= spaceLeft
        : !(spaceLeft >= width || spaceLeft >= spaceRight);
    const opensDown = preferredY === "down"
        ? spaceDown >= height || spaceDown >= spaceUp
        : !(spaceUp >= height || spaceUp >= spaceDown);
    const left = opensRight
        ? anchor.right + offsetX
        : anchor.left - width - offsetX;
    const top = opensDown
        ? anchor.top + offsetY
        : anchor.bottom - height - offsetY;
    return clampPopup(left, top, width, height);
}
function clampPopup(left, top, width, height) {
    return {
        left: clamp(left, 12, window.innerWidth - width - 12),
        top: clamp(top, 12, window.innerHeight - height - 12),
    };
}
function clamp(value, min, max) {
    if (max < min)
        return min;
    return Math.max(min, Math.min(max, value));
}
function percentToSvg(value, span) {
    if (typeof value === "string" && value.trim().endsWith("%")) {
        return (Number(value.trim().slice(0, -1)) / 100) * span;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : span / 2;
}
function xboxControllerSvg() {
    return `
    <path class="shell" d="M176 126 C212 76 310 76 340 128 L440 128 C470 76 568 76 604 126 C652 194 684 300 650 340 C620 374 570 328 536 276 L244 276 C210 328 160 374 130 340 C96 300 128 194 176 126 Z" />
    <circle class="stick" cx="265" cy="224" r="38" />
    <circle class="stick-dot" cx="265" cy="224" r="16" />
    <circle class="stick" cx="474" cy="256" r="34" />
    <circle class="stick-dot" cx="474" cy="256" r="14" />
    <path class="dpad" d="M190 246 h34 v-34 h42 v34 h34 v42 h-34 v34 h-42 v-34 h-34 z" />
    <circle class="face y" cx="568" cy="164" r="20" />
    <circle class="face b" cx="608" cy="204" r="20" />
    <circle class="face x" cx="528" cy="204" r="20" />
    <circle class="face a" cx="568" cy="244" r="20" />
    <rect class="menu" x="346" y="188" width="34" height="18" rx="9" />
    <rect class="menu" x="402" y="188" width="34" height="18" rx="9" />
    <circle class="guide" cx="391" cy="224" r="22" />
    <rect class="bumper" x="194" y="94" width="118" height="28" rx="14" />
    <rect class="bumper" x="468" y="94" width="118" height="28" rx="14" />
    <rect class="trigger" x="214" y="56" width="78" height="26" rx="10" />
    <rect class="trigger" x="488" y="56" width="78" height="26" rx="10" />
    <text x="568" y="169">Y</text><text x="613" y="209">B</text><text x="523" y="209">X</text><text x="563" y="249">A</text>
  `;
}
export function applyEveSurfaceStyles(styles, body = document.body) {
    const normalized = normalizeSurfaceStyles(styles);
    const root = document.documentElement.style;
    loadFontStylesheet(normalized.assets.fontCss);
    for (const [variable, value] of Object.entries(defaultStyleTokens))
        root.setProperty(variable, value);
    const map = {
        colorBackground: "--bg",
        colorBackgroundTop: "--bg-top",
        colorBackgroundMid: "--bg-mid",
        colorBackgroundBottom: "--bg-bottom",
        colorShellSurfaceTop: "--shell-top",
        colorShellSurfaceBottom: "--shell-bottom",
        colorPanel: "--panel",
        colorPanelAlt: "--panel-2",
        colorPanelBorder: "--line",
        colorPanelBorderDeep: "--line-deep",
        colorText: "--text",
        colorTextBright: "--text-bright",
        colorMuted: "--quiet",
        colorAccent: "--accent",
        colorAccentStrong: "--accent-strong",
        colorCornerAccent: "--corner-accent",
        colorLink: "--cyan",
        colorShadow: "--shadow",
        colorPixelGrid: "--pixel-grid",
    };
    for (const [token, variable] of Object.entries(map)) {
        const value = normalized.tokens[token];
        if (value !== undefined)
            root.setProperty(variable, String(value));
    }
    const fontBody = normalized.tokens.fontBody;
    const fontDisplay = normalized.tokens.fontDisplay;
    const fontTitle = normalized.tokens.fontTitle;
    const fontMono = normalized.tokens.fontMono;
    if (fontBody)
        root.setProperty("--font-body", withJapaneseGuiFallback(String(fontBody)));
    if (fontDisplay)
        root.setProperty("--font-title", withJapaneseGuiFallback(String(fontDisplay)));
    if (fontTitle)
        root.setProperty("--font-title", withJapaneseGuiFallback(String(fontTitle)));
    if (fontMono)
        root.setProperty("--font-mono", withJapaneseGuiFallback(String(fontMono)));
    if (normalized.tokens.borderWidthPx)
        root.setProperty("--border-width", `${normalized.tokens.borderWidthPx}px`);
    if (normalized.tokens.borderBottomWidthPx)
        root.setProperty("--border-bottom-width", `${normalized.tokens.borderBottomWidthPx}px`);
    if (normalized.tokens.cornerAccentPx)
        root.setProperty("--corner-accent-size", `${normalized.tokens.cornerAccentPx}px`);
    body.dataset.pixelArt = normalized.tokens.pixelArt || normalized.tokens.imageRendering === "pixelated" ? "true" : "false";
    body.dataset.scanlines = normalized.tokens.scanlineOverlay ? "true" : "false";
}
export function createEveCommandIntent(commandId, props = {}, options = currentOptions) {
    const action = objectProps(props.action);
    const providerId = options.provider?.providerId || currentSurfaceDocument?.providerId || "surface unknown";
    const surfaceId = options.activeSurfaceId || currentSurfaceDocument?.surface?.id || options.provider?.surfaces?.[0]?.surfaceId || providerId;
    const worldInteraction = resolveAdvertisedWorldInteraction(options, surfaceId);
    const commandBoundary = firstString(worldInteraction.commandBoundary, props.commandBoundary, action.commandBoundary, action.target);
    const receiptSchema = firstString(worldInteraction.receiptSchema, props.receiptSchema, action.receiptSchema);
    const intent = {
        type: "surface-command",
        schema: "gamecult.eve.command_invocation.v1",
        providerId,
        surfaceId,
        command: commandId || stringProp(action.type, "invoke"),
        payload: {
            ...action,
            transport: props.transport ?? null,
        },
        issuedAt: new Date().toISOString(),
        clientId: options.clientId || "eve.browser",
    };
    if (commandBoundary)
        intent.commandBoundary = commandBoundary;
    if (receiptSchema)
        intent.receiptSchema = receiptSchema;
    return intent;
}
function resolveAdvertisedWorldInteraction(options, surfaceId) {
    const surfaces = [
        ...(options.provider?.surfaces || []),
        ...(options.provider?.localAdvertisement?.surfaces || []),
    ];
    return surfaces.find(surface => surface.surfaceId === surfaceId && surface.worldInteraction)?.worldInteraction
        || surfaces.find(surface => surface.worldInteraction)?.worldInteraction
        || {};
}
function resolveComponentCommandId(props, node) {
    const action = objectProps(props.action);
    return stringProp(props.command, stringProp(props.commandId, stringProp(action.command, stringProp(action.target, stringProp(action.type, node?.commandId || "")))));
}
export function emptyState(message) {
    const pane = el("section", "pane");
    pane.append(el("h2", "", "No Surface"));
    pane.append(el("div", "detail", message));
    return pane;
}
function wireCommand(element, node, commandId, props, options) {
    element.dataset.commandId = commandId;
    element.tabIndex = element instanceof HTMLButtonElement ? element.tabIndex : 0;
    const publish = () => {
        const intent = createEveCommandIntent(commandId, props, options);
        void options.commandSink?.(intent, node);
    };
    element.addEventListener("click", publish);
    element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            publish();
        }
    });
}
function renderSlider(props, children, options) {
    const anatomy = resolveSliderAnatomy(props, children);
    const box = objectProps(anatomy.find(part => part.kind === "control.box")?.props);
    const parts = anatomy.filter(part => part.kind === "control.part");
    const min = Number(props.min ?? 0);
    const max = Number(props.max ?? 1);
    const slider = el("div", "cultui-slider");
    slider.dataset.skin = stringProp(props.skin, "default");
    applyControlBoxProps(slider, box);
    const visual = el("div", "cultui-slider-visual");
    const input = el("input", "cultui-slider-input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(props.step ?? 0.01);
    input.setAttribute("aria-label", stringProp(props.bind, "slider"));
    for (const part of parts) {
        const partProps = objectProps(part.props);
        const partEl = el("span", `cultui-slider-part ${stringProp(partProps.name, "part")}`);
        applySliderPartProps(partEl, partProps);
        visual.append(partEl);
    }
    if (!parts.some(part => objectProps(part.props).name === "track"))
        visual.append(el("span", "cultui-slider-part track"));
    if (!parts.some(part => objectProps(part.props).name === "fill"))
        visual.append(el("span", "cultui-slider-part fill"));
    if (!parts.some(part => objectProps(part.props).name === "thumb"))
        visual.append(el("span", "cultui-slider-part thumb"));
    slider.append(visual, input);
    const setVisualValue = (value) => {
        const number = Number(value ?? min);
        const bounded = Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
        const percent = max === min ? 0 : ((bounded - min) / (max - min)) * 100;
        input.value = String(bounded);
        slider.style.setProperty("--cultui-slider-value", `${percent}%`);
        slider.dataset.value = String(bounded);
    };
    setVisualValue(props.value ?? min);
    input.addEventListener("input", () => {
        const intent = createEveCommandIntent(stringProp(props.command, "control.slider.input"), {
            ...props,
            value: Number(input.value),
        }, options);
        void options.commandSink?.(intent, { kind: "control.slider", props });
    });
    return slider;
}
function resolveSliderAnatomy(props, children) {
    const skinName = typeof props.skin === "string" ? props.skin : "";
    const skinChildren = skinName ? currentSurfaceStyles.controlSkins[skinName]?.children || [] : [];
    const anatomy = [...skinChildren, ...children];
    if (anatomy.length)
        return anatomy;
    return [
        { kind: "control.box", props: { height: 18, overflow: "visible" } },
        { kind: "control.part", props: { name: "track", anchor: "center", size: ["100%", 6], radius: 2, fill: "color.panelInset" } },
        { kind: "control.part", props: { name: "fill", anchor: ["left", "center"], size: ["value%", 6], radius: 2, fill: "color.accent" } },
        { kind: "control.part", props: { name: "thumb", anchor: ["value", "center"], size: [12, 12], bleed: 3, radius: 999, fill: "color.accent" } },
    ];
}
function normalizeSurfaceStyles(styles) {
    if (Array.isArray(styles)) {
        const tokens = {};
        const assets = {};
        for (const token of styles) {
            if (!token?.name)
                continue;
            if (token.name === "font.web.google" && typeof token.value === "string")
                assets.fontCss = token.value;
            else
                tokens[token.name] = token.value;
        }
        return { tokens, assets, controlSkins: {} };
    }
    return {
        tokens: objectProps(styles?.tokens),
        assets: objectProps(styles?.assets),
        controlSkins: objectProps(styles?.controlSkins),
    };
}
function resolveAssetUrl(uri) {
    if (!uri)
        return "";
    const resolver = currentOptions.assetUrlResolver;
    if (resolver)
        return resolver(uri, currentSurfaceDocument);
    if (/^(https?:|data:|blob:)/i.test(uri))
        return uri;
    if (currentOptions.assetBaseUrl && uri.startsWith("/")) {
        return `${currentOptions.assetBaseUrl.replace(/\/+$/, "")}${uri}`;
    }
    return uri;
}
function loadFontStylesheet(href) {
    const normalized = typeof href === "string" ? href.trim() : "";
    if (activeFontStylesheet?.dataset.href === normalized)
        return;
    activeFontStylesheet?.remove();
    activeFontStylesheet = undefined;
    if (!normalized)
        return;
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://fonts.gstatic.com";
    preconnect.crossOrigin = "anonymous";
    document.head.append(preconnect);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = normalized;
    link.dataset.href = normalized;
    document.head.append(link);
    activeFontStylesheet = link;
}
function textClassName(kind, props, node) {
    const classes = [];
    if (kind === "text.title" || props.role === "title")
        classes.push("cultui-title", "eve-text-title");
    if (kind === "text.subtitle")
        classes.push("eve-text-subtitle");
    if (kind === "label")
        classes.push("cultui-label");
    if (props.role === "mono")
        classes.push("detail", "mono");
    if (classes.length === 0)
        classes.push("detail", "eve-text");
    if (node.id === "aetheria.main_menu.root.title")
        classes.push("eve-root-title");
    if (node.id === "aetheria.main_menu.root.subtitle")
        classes.push("eve-root-subtitle");
    return classes.join(" ");
}
function applyControlBoxProps(element, props) {
    if (props.height !== undefined)
        element.style.minHeight = cssSize(props.height);
    if (props.width !== undefined)
        element.style.width = cssSize(props.width);
    if (typeof props.overflow === "string")
        element.style.overflow = props.overflow;
}
function applySliderPartProps(element, props) {
    const size = Array.isArray(props.size) ? props.size : [props.size, undefined];
    if (size[0] !== undefined && size[0] !== "value%")
        element.style.width = cssSize(size[0]);
    if (size[1] !== undefined)
        element.style.height = cssSize(size[1]);
    if (props.radius !== undefined)
        element.style.borderRadius = cssSize(props.radius);
    if (props.fill !== undefined)
        element.style.background = tokenColor(String(props.fill));
    if (props.bleed !== undefined)
        element.style.setProperty("--part-bleed", cssSize(props.bleed));
    const anchor = Array.isArray(props.anchor) ? props.anchor : [props.anchor];
    if (anchor.includes("value"))
        element.dataset.anchorValue = "true";
}
function applyBoxProps(element, props) {
    if (props.gap !== undefined)
        element.style.gap = cssSize(props.gap);
    if (props.padding !== undefined)
        element.style.padding = cssSize(props.padding);
    if (props.size !== undefined)
        element.style.flex = flexSize(props.size);
    if (props.min !== undefined)
        element.style.minWidth = cssSize(props.min);
    if (props.max !== undefined)
        element.style.maxWidth = cssSize(props.max);
    if (props.align !== undefined)
        element.style.alignItems = props.align === "end" ? "flex-end" : String(props.align);
    if (props.clip === "true" || props.clip === true)
        element.style.overflow = "hidden";
    if (props.scroll === "y")
        element.style.overflowY = "auto";
    if (props.scroll === "x")
        element.style.overflowX = "auto";
}
function flexSize(value) {
    if (typeof value === "string" && value.endsWith("fr"))
        return `${Number(value.slice(0, -2)) || 1} 1 0`;
    if (value === "auto" || value === "content")
        return "0 0 auto";
    return `0 0 ${cssSize(value)}`;
}
function cssSize(value) {
    if (Array.isArray(value))
        return value.map(cssSize).join(" ");
    if (typeof value === "number")
        return `${value}px`;
    if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value))
        return `${value}px`;
    return String(value ?? "");
}
function tokenColor(value) {
    return {
        "color.accent": "var(--accent)",
        "color.panelInset": "rgba(0, 0, 0, 0.34)",
        "color.panel": "var(--panel)",
        "color.text": "var(--text)",
    }[value] || value;
}
function withJapaneseGuiFallback(stack) {
    if (stack.includes("Zen Kaku Gothic New") || stack.includes("M PLUS 1"))
        return stack;
    if (stack.includes("Montserrat"))
        return `${stack}, "Zen Kaku Gothic New", "M PLUS 1", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif`;
    if (stack.includes("Ubuntu"))
        return `${stack}, "M PLUS 1", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif`;
    return `${stack}, "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif`;
}
function assignId(element, node) {
    if (node.id)
        element.id = node.id;
    if (node.id)
        element.dataset.eveNodeId = node.id;
    if (node.kind)
        element.dataset.eveKind = node.kind;
}
function objectProps(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function stringProp(value, fallback) {
    return value === null || value === undefined ? fallback : String(value);
}
function firstString(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim())
            return value;
        if (typeof value === "number" && Number.isFinite(value))
            return String(value);
    }
    return "";
}
function boolProp(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    if (typeof value === "string")
        return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
    return false;
}
function positiveInt(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric))
        return fallback;
    return Math.max(0, Math.floor(numeric));
}
function inventoryItemGlyph(value) {
    const normalized = value.toLowerCase();
    if (normalized.includes("sensor"))
        return "S";
    if (normalized.includes("thermal"))
        return "T";
    if (normalized.includes("fuel"))
        return "F";
    if (normalized.includes("cargo"))
        return "C";
    if (normalized.includes("weapon"))
        return "W";
    return value.trim().slice(0, 1).toUpperCase() || "?";
}
function initials(value) {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (!words.length)
        return "?";
    return words.slice(0, 2).map(word => word[0]?.toUpperCase() || "").join("") || "?";
}
function clampPercent(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
}
function el(tag, className = "", text = "") {
    const element = document.createElement(tag);
    if (className)
        element.className = className;
    if (text)
        element.textContent = text;
    return element;
}
