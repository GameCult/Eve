import { fieldsBrowserAdapter } from "./fields-browser-adapter.js";
export { fieldsBrowserAdapter, normalizeFieldsDocument } from "./fields-browser-adapter.js";
export const defaultBrowserPluginAdapters = [fieldsBrowserAdapter];
export function resolveRequiredPluginAdapters(surface, available = defaultBrowserPluginAdapters) {
    const resolved = [];
    for (const requirement of surface.requiresPlugins || []) {
        const adapter = available.find(candidate => candidate.pluginId === requirement.pluginId);
        if (!adapter) {
            if ((requirement.availability || "required") === "required") {
                throw new Error(`Missing required Eve plugin adapter ${requirement.pluginId}.`);
            }
            continue;
        }
        const missing = (requirement.requiredCapabilities || []).filter(capability => !adapter.capabilities.includes(capability));
        if (missing.length > 0) {
            throw new Error(`Eve plugin adapter ${requirement.pluginId} lacks required capabilities: ${missing.join(", ")}.`);
        }
        resolved.push(adapter);
    }
    return resolved;
}
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
    pluginAdapters = [];
    constructor(host, transport, options = {}) {
        this.host = host;
        this.transport = transport;
        this.options = options;
    }
    async start() {
        this.provider = await this.transport.providerAdvertisement();
        this.selected = selectAdvertisedSurface(this.provider, this.options.requestedSurfaceId);
        this.pluginAdapters = resolveRequiredPluginAdapters(this.selected, this.options.pluginAdapters || defaultBrowserPluginAdapters);
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
                pluginAdapters: this.pluginAdapters,
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
const activeSurfaceBindings = new WeakMap();
export function renderEveSurface(surface, host, options = {}) {
    activeSurfaceBindings.get(host)?.dispose();
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
        if (options.stateBindingResolver) {
            const controller = new EveSurfaceBindingController(surface, host, options);
            activeSurfaceBindings.set(host, controller);
            void controller.start();
        }
    }
    else {
        host.replaceChildren(emptyState("No surface root"));
    }
    return host;
}
export function applyEveStateBindingValue(component, binding, value) {
    const path = binding.targetProp.split(".").filter(Boolean);
    if (path.length === 0)
        throw new Error("Eve state binding targetProp must not be empty.");
    component.props ||= {};
    let owner = component.props;
    for (const segment of path.slice(0, -1)) {
        const current = owner[segment];
        if (!current || typeof current !== "object" || Array.isArray(current))
            owner[segment] = {};
        owner = owner[segment];
    }
    owner[path[path.length - 1]] = value;
}
class EveSurfaceBindingController {
    surface;
    host;
    options;
    disposed = false;
    unsubscribers = [];
    constructor(surface, host, options) {
        this.surface = surface;
        this.host = host;
        this.options = options;
    }
    async start() {
        const resolver = this.options.stateBindingResolver;
        const root = this.surface.surface?.root;
        if (!resolver || !root)
            return;
        for (const component of walkEveComponents(root)) {
            for (const binding of component.stateBindings || []) {
                if (this.disposed)
                    return;
                const handle = await resolver(binding, component);
                if (!handle || this.disposed)
                    continue;
                const apply = (value) => {
                    if (this.disposed)
                        return;
                    applyEveStateBindingValue(component, binding, value);
                    this.renderCanonicalProjection();
                };
                apply(await handle.latest());
                if (this.disposed)
                    return;
                this.unsubscribers.push(handle.watch(apply));
            }
        }
    }
    dispose() {
        this.disposed = true;
        for (const unsubscribe of this.unsubscribers.splice(0))
            unsubscribe();
    }
    renderCanonicalProjection() {
        const root = this.surface.surface?.root;
        if (root)
            this.host.replaceChildren(renderEveComponent(root, this.options));
    }
}
function* walkEveComponents(root) {
    yield root;
    for (const child of root.children || [])
        yield* walkEveComponents(child);
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
        return renderInventoryItem(node, props, layout, style, options);
    }
    const adapter = (options.pluginAdapters || defaultBrowserPluginAdapters)
        .find(candidate => candidate.componentKinds.includes(kind));
    if (adapter?.renderComponent) {
        return adapter.renderComponent(node, props, layout, style, options, {
            applyGeneratedLayout,
            providerId: currentSurfaceDocument?.providerId || options.provider?.providerId,
            resolveAssetUrl,
        });
    }
    if (kind === "world.scene3d" || kind === "world.scene2d") {
        return renderWorldScene(node, props, layout, style, options);
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
    if (kind === "list" || kind.endsWith(".roster")) {
        const list = el("section", "cultui-list");
        assignId(list, node);
        list.dataset.componentKind = kind;
        const title = stringProp(props.title, "");
        if (title)
            list.append(el("h3", "cultui-list-title", title));
        for (const [index, item] of projectSemanticListItems(props.items).entries()) {
            list.append(renderEveComponent({
                id: `${node.id || "list"}-item-${index}`,
                kind: "list.item",
                props: { ...item },
            }, options));
        }
        for (const child of children)
            list.append(renderEveComponent(child, options));
        return list;
    }
    if (kind === "list.item" || kind.endsWith(".item")) {
        const semantic = projectSemanticListItem(node);
        const item = el("article", "cultui-list-item");
        assignId(item, node);
        item.dataset.componentKind = kind;
        const heading = el("div", "cultui-list-item-heading");
        heading.append(el("strong", "cultui-list-item-label", semantic.label));
        if (semantic.status)
            heading.append(el("span", "cultui-list-item-status", semantic.status));
        item.append(heading);
        if (semantic.detail)
            item.append(el("div", "cultui-list-item-detail", semantic.detail));
        if (semantic.badges.length) {
            const badgeRow = el("div", "cultui-list-item-badges");
            for (const badge of semantic.badges)
                badgeRow.append(el("span", "cultui-list-item-badge", badge));
            item.append(badgeRow);
        }
        for (const child of children)
            item.append(renderEveComponent(child, options));
        return item;
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
export function projectSemanticListItem(node) {
    const props = objectProps(node.props);
    return {
        label: firstString(props.label, props.title, props.displayName, node.text, node.kind, "item"),
        status: firstString(props.status, props.state, ""),
        detail: firstString(props.detail, props.phase, props.repoName, ""),
        badges: Array.isArray(props.badges)
            ? props.badges.map(value => String(value).trim()).filter(Boolean)
            : firstString(props.badges, "").split(",").map(value => value.trim()).filter(Boolean),
    };
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
export function projectWorldScene(node) {
    const entities = (node.children || []).filter(child => child.kind === "world.entity3d");
    const positions = entities.map(entity => vector3Prop(objectProps(entity.props).position, [0, 0, 0]));
    const xs = positions.map(position => position[0]);
    const zs = positions.map(position => position[2]);
    const minX = Math.min(...xs, -1);
    const maxX = Math.max(...xs, 1);
    const minZ = Math.min(...zs, -1);
    const maxZ = Math.max(...zs, 1);
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    const padding = 6;
    return entities.map((entity, index) => {
        const props = objectProps(entity.props);
        return {
            entityId: firstString(props.entityId, entity.id),
            faction: stringProp(props.faction, "neutral"),
            kind: stringProp(props.entityKind, "entity"),
            label: firstString(props.label, props.entityId, entity.id, "Entity"),
            controlled: boolProp(props.controllable),
            xPercent: padding + ((positions[index][0] - minX) / spanX) * (100 - padding * 2),
            yPercent: padding + (1 - ((positions[index][2] - minZ) / spanZ)) * (100 - padding * 2),
            source: entity,
        };
    });
}
function renderWorldScene(node, props, layout, style, options) {
    const scene = el("section", "cultui-world-scene");
    assignId(scene, node);
    applyGeneratedLayout(scene, layout, style);
    scene.tabIndex = 0;
    scene.setAttribute("aria-label", stringProp(props.label, "Interactive world"));
    const entities = projectWorldScene(node);
    const controlled = entities.find(entity => entity.controlled);
    const heading = el("div", "cultui-world-heading");
    heading.append(el("strong", "", stringProp(props.label, "World")));
    heading.append(el("span", "", `${entities.length} entities`));
    scene.append(heading);
    const plane = el("div", "cultui-world-plane");
    for (const entity of entities) {
        const marker = el("button", `cultui-world-entity faction-${cssIdentifier(entity.faction)} kind-${cssIdentifier(entity.kind)}`);
        marker.type = "button";
        marker.style.left = `${entity.xPercent}%`;
        marker.style.top = `${entity.yPercent}%`;
        marker.dataset.entityId = entity.entityId;
        marker.dataset.controlled = entity.controlled ? "true" : "false";
        marker.title = entity.label;
        marker.setAttribute("aria-label", `${entity.label}, ${entity.kind}, ${entity.faction}`);
        marker.append(el("span", "cultui-world-entity-glyph", worldEntityGlyph(entity.kind)));
        marker.append(el("span", "cultui-world-entity-label", entity.label));
        const entityProps = objectProps(entity.source.props);
        const targetCommand = firstString(entityProps.targetCommand, props.targetCommand, entityProps.focusCommand, props.focusCommand);
        if (targetCommand) {
            marker.addEventListener("click", () => emitWorldCommand(targetCommand, {
                actorEntityId: controlled?.entityId || firstString(props.playerEntityId),
                entityId: entity.entityId,
                targetEntityId: entity.entityId,
                targetEntityKey: entity.entityId,
            }, entity.source, options));
        }
        plane.append(marker);
    }
    scene.append(plane);
    scene.addEventListener("keydown", event => {
        const direction = worldDirectionForKey(event.key);
        if (direction) {
            event.preventDefault();
            const command = firstString(props.movementCommand, objectProps(controlled?.source.props).moveCommand);
            if (command)
                emitWorldCommand(command, {
                    actorEntityId: controlled?.entityId || firstString(props.playerEntityId),
                    actorEntityKey: controlled?.entityId || firstString(props.playerEntityId),
                    directionX: direction[0],
                    directionY: direction[1],
                    scalar: 1,
                }, node, options);
            return;
        }
        const command = event.key === " "
            ? firstString(props.actionCommand, objectProps(controlled?.source.props).actionCommand)
            : event.key.toLowerCase() === "f"
                ? firstString(props.focusCommand, objectProps(controlled?.source.props).focusCommand)
                : "";
        if (command) {
            event.preventDefault();
            emitWorldCommand(command, {
                actionId: event.key === " " ? "0" : "focus",
                actorEntityId: controlled?.entityId || firstString(props.playerEntityId),
                actorEntityKey: controlled?.entityId || firstString(props.playerEntityId),
            }, node, options);
        }
    });
    return scene;
}
function emitWorldCommand(command, action, node, options) {
    void options.commandSink?.(createWorldActionIntent(command, action, options), node);
}
export function createWorldActionIntent(command, action, options = currentOptions) {
    return createEveCommandIntent(command, { action }, options);
}
function worldDirectionForKey(key) {
    switch (key.toLowerCase()) {
        case "w":
        case "arrowup": return [0, 1];
        case "s":
        case "arrowdown": return [0, -1];
        case "a":
        case "arrowleft": return [-1, 0];
        case "d":
        case "arrowright": return [1, 0];
        default: return undefined;
    }
}
function worldEntityGlyph(kind) {
    if (kind.includes("station"))
        return "S";
    if (kind.includes("projectile"))
        return ".";
    if (kind.includes("ship"))
        return "^";
    return "+";
}
function cssIdentifier(value) {
    return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
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
    board.addEventListener("dragover", event => {
        if (!hasInventoryDropCommand(props))
            return;
        event.preventDefault();
        if (event.dataTransfer)
            event.dataTransfer.dropEffect = "move";
    });
    board.addEventListener("drop", event => {
        const encoded = event.dataTransfer?.getData("application/vnd.gamecult.eve.inventory-item+json") || "";
        if (!encoded)
            return;
        let source;
        try {
            source = JSON.parse(encoded);
        }
        catch {
            return;
        }
        const rect = board.getBoundingClientRect();
        const cellSize = Math.max(1, numberProp(props.cellSize, 72));
        const cellGap = Math.max(0, numberProp(props.cellGap, 4));
        const pitch = cellSize + cellGap;
        const x = Math.max(0, Math.min(columns - 1, Math.floor((event.clientX - rect.left) / pitch)));
        const y = Math.max(0, Math.min(rows - 1, Math.floor((event.clientY - rect.top) / pitch)));
        const intent = createInventoryDropIntent(source, props, x, y, options);
        if (!intent)
            return;
        event.preventDefault();
        void options.commandSink?.(intent, node);
    });
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
function renderInventoryItem(node, props, layout, style, options) {
    const item = el("button", "cultui-inventory-item");
    assignId(item, node);
    item.type = "button";
    applyGeneratedLayout(item, layout, style);
    const x = positiveInt(props.x, 0);
    const y = positiveInt(props.y, 0);
    item.dataset.itemKey = firstString(props.itemKey, props.label, node.id, "item");
    item.dataset.source = firstString(props.source, "");
    item.draggable = (props.draggable === undefined || boolProp(props.draggable)) &&
        !!firstString(props.sourceKind, props.source, "");
    item.addEventListener("dragstart", event => {
        if (!item.draggable || !event.dataTransfer)
            return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/vnd.gamecult.eve.inventory-item+json", JSON.stringify(props));
    });
    let widthCells = positiveInt(props.shapeWidth, 1);
    let heightCells = positiveInt(props.shapeHeight, 1);
    const rotation = firstString(props.rotation, "").toLowerCase();
    if (["clockwise", "counterclockwise", "right", "left", "rotate90", "rotate270"].includes(rotation)) {
        [widthCells, heightCells] = [heightCells, widthCells];
    }
    item.style.gridColumn = `${x + 1} / span ${widthCells}`;
    item.style.gridRow = `${y + 1} / span ${heightCells}`;
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
function hasInventoryDropCommand(target) {
    return Object.entries(target).some(([key, value]) => (key === "dropCommand" || key.startsWith("dropCommand.")) && typeof value === "string" && value.length > 0);
}
export function createInventoryDropIntent(source, target, destinationX, destinationY, options = currentOptions) {
    const sourceKind = firstString(source.sourceKind, source.source, "");
    const command = firstString(target[`dropCommand.${sourceKind}`], target.dropCommand, "");
    if (!sourceKind || !command)
        return undefined;
    const sourceIndex = numberProp(source.sourceIndex, -1);
    const targetIndex = numberProp(target.targetIndex, -1);
    const targetKind = firstString(target.targetKind, "");
    const payload = {
        sourceKind,
        originEntityKey: firstString(source.sourceEntityKey, source.entityKey, ""),
        originIndex: sourceIndex,
        originCargoIndex: sourceKind === "cargo" ? sourceIndex : -1,
        itemKey: firstString(source.itemKey, ""),
        quantity: Math.max(1, numberProp(source.quantity, 1)),
        sourceX: numberProp(source.x, -2147483648),
        sourceY: numberProp(source.y, -2147483648),
        destinationKind: targetKind,
        destinationEntityKey: firstString(target.targetEntityKey, target.entityKey, ""),
        destinationIndex: targetIndex,
        destinationCargoIndex: targetKind === "cargo" ? targetIndex : -1,
        destinationX: Math.trunc(destinationX),
        destinationY: Math.trunc(destinationY),
        hasDestinationPosition: true,
    };
    return createEveCommandIntent(command, { action: payload }, options);
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
    slider.dataset.bind = stringProp(props.bind, "");
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
            action: {
                ...objectProps(props.action),
                value: Number(input.value),
            },
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
function arrayProp(value) {
    return Array.isArray(value) ? value : [];
}
export function projectSemanticListItems(value) {
    return arrayProp(value).map((item, index) => projectSemanticListItem({
        id: `list-item-${index}`,
        kind: "list.item",
        props: objectProps(item),
    }));
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
export * from "./input-gestures.js";
