import { type EveBrowserPluginAdapter } from "./fields-browser-adapter.js";
import { type EveCommandInvocation, type EveCommandResult } from "@gamecult/eve-contracts";
export { fieldsBrowserAdapter, normalizeFieldsDocument, type EveBrowserPluginAdapter } from "./fields-browser-adapter.js";
export interface EveSurfaceComponent {
    id?: string;
    kind?: string;
    text?: string;
    commandId?: string;
    props?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    style?: Record<string, unknown>;
    children?: EveSurfaceComponent[];
    stateBindings?: EveStateBindingDescriptor[];
    embeddedDocuments?: Array<Record<string, unknown>>;
}
export interface EveStateBindingDescriptor {
    targetProp: string;
    pointerId: string;
    sourceId: string;
    schemaId: string;
    routeKind: string;
    routeDescription?: string;
    bindingName?: string;
    documentId?: string;
    fieldPath?: string;
    valueKind?: "string" | "number" | "boolean" | "choice" | "string-list";
    accessMode?: "read" | "write" | "read-write" | "local-draft";
    authority?: string;
    writeCommand?: string;
}
export interface EveStateBindingHandle {
    latest(): Promise<unknown>;
    watch(callback: (value: unknown) => void): () => void;
}
export type EveStateBindingResolver = (binding: EveStateBindingDescriptor, component: EveSurfaceComponent) => Promise<EveStateBindingHandle | undefined>;
export interface EveSurfaceDocument {
    providerId?: string;
    title?: string;
    version?: number;
    surface?: {
        id?: string;
        title?: string;
        root?: EveSurfaceComponent;
        styles?: EveSurfaceStyles;
    };
    mesh?: unknown;
    commands?: Array<{
        command: string;
        payloadSchema?: string;
        captureBindings?: string[];
        transport?: string;
    }>;
}
export type EveSurfaceStyles = {
    tokens?: Record<string, unknown>;
    assets?: {
        fontCss?: string;
    };
    controlSkins?: Record<string, {
        children?: EveSurfaceComponent[];
    }>;
} | Array<{
    name?: string;
    value?: unknown;
}>;
export type EveCommandIntent = EveCommandInvocation;
export type EveBrowserCommandResult = EveCommandResult;
export interface EveSemanticListItem {
    label: string;
    status: string;
    detail: string;
    badges: string[];
}
export interface EveSurfaceWorldInteraction {
    commandBoundary?: string;
    receiptSchema?: string;
}
export interface EveProviderSurfaceAdvertisement {
    surfaceId?: string;
    key?: string;
    status?: string;
    transport?: string;
    worldInteraction?: EveSurfaceWorldInteraction;
    requiresPlugins?: EvePluginRequirement[];
}
export interface EvePluginRequirement {
    pluginId: string;
    versionRange?: string;
    availability?: "required" | "optional" | "optional-nested";
    requiredCapabilities?: string[];
    optionalCapabilities?: string[];
}
export interface EveProviderAdvertisement {
    providerId?: string;
    surfaces?: EveProviderSurfaceAdvertisement[];
    localAdvertisement?: {
        surfaces?: EveProviderSurfaceAdvertisement[];
    };
}
export interface EveBrowserLoweringOptions {
    activeSurfaceId?: string;
    assetBaseUrl?: string;
    assetUrlResolver?: (uri: string, surface: EveSurfaceDocument | undefined) => string;
    body?: HTMLElement;
    clientId?: string;
    commandSink?: (intent: EveCommandIntent, component: EveSurfaceComponent) => EveBrowserCommandResult | void | Promise<EveBrowserCommandResult | void>;
    documentResolver?: (request: EveEmbeddedDocumentRequest, component: EveSurfaceComponent) => Promise<EveResolvedDocument | EveSurfaceDocument | EveSurfaceDocument["surface"] | undefined>;
    provider?: EveProviderAdvertisement;
    pluginAdapters?: readonly EveBrowserPluginAdapter[];
    stateBindingResolver?: EveStateBindingResolver;
    source?: string;
    statusElement?: HTMLElement;
    draftStore?: EveBrowserDraftStore;
}
export interface EveBrowserProviderTransport {
    providerAdvertisement(): Promise<EveProviderAdvertisement>;
    surface(surface: EveProviderSurfaceAdvertisement): Promise<EveSurfaceDocument>;
    submitCommand(intent: EveCommandIntent): Promise<unknown>;
    resolveDocument?: EveBrowserLoweringOptions["documentResolver"];
    resolveAssetUrl?: EveBrowserLoweringOptions["assetUrlResolver"];
}
export interface EveBrowserProviderHostOptions {
    body?: HTMLElement;
    clientId?: string;
    pollMs?: number;
    requestedSurfaceId?: string;
    source?: string;
    statusElement?: HTMLElement;
    pluginAdapters?: readonly EveBrowserPluginAdapter[];
}
export declare class EveBrowserDraftStore {
    private readonly values;
    private key;
    has(providerId: string, surfaceId: string, bindingName: string): boolean;
    get(providerId: string, surfaceId: string, bindingName: string): unknown;
    set(providerId: string, surfaceId: string, bindingName: string, value: unknown): void;
    clear(providerId: string, surfaceId: string, bindingNames?: readonly string[]): void;
    capture(providerId: string, surfaceId: string, bindingNames: readonly string[]): Record<string, unknown>;
}
export declare const defaultBrowserPluginAdapters: readonly EveBrowserPluginAdapter[];
export declare function resolveRequiredPluginAdapters(surface: EveProviderSurfaceAdvertisement, available?: readonly EveBrowserPluginAdapter[]): readonly EveBrowserPluginAdapter[];
export declare function selectAdvertisedSurface(provider: EveProviderAdvertisement, requestedSurfaceId?: string): EveProviderSurfaceAdvertisement;
export declare class EveBrowserProviderHost {
    private readonly host;
    private readonly transport;
    private readonly options;
    private active;
    private lastSurfaceVersion;
    private pollHandle;
    private provider;
    private selected;
    private pluginAdapters;
    private readonly draftStore;
    constructor(host: HTMLElement, transport: EveBrowserProviderTransport, options?: EveBrowserProviderHostOptions);
    start(): Promise<void>;
    stop(): void;
    refresh(): Promise<void>;
    private submit;
    private consumeCommandResult;
    private presentCommandStatus;
    private loweringOptions;
}
export interface EveEmbeddedDocumentRequest {
    documentId: string;
    presentationKind?: string;
    schemaId?: string;
    slotId?: string;
}
export interface EveResolvedDocument {
    document?: unknown;
    documentId?: string;
    schemaId?: string;
    surface?: EveSurfaceDocument["surface"];
}
export interface EveProjectedWorldEntity {
    entityId: string;
    faction: string;
    kind: string;
    label: string;
    controlled: boolean;
    xPercent: number;
    yPercent: number;
    source: EveSurfaceComponent;
}
export declare function renderEveSurface(surface: EveSurfaceDocument, host: HTMLElement, options?: EveBrowserLoweringOptions): HTMLElement;
export declare function applyEveStateBindingValue(component: EveSurfaceComponent, binding: EveStateBindingDescriptor, value: unknown): void;
export declare function renderEveComponent(node: EveSurfaceComponent, options?: EveBrowserLoweringOptions): HTMLElement;
export declare function projectSemanticListItem(node: EveSurfaceComponent): EveSemanticListItem;
export declare function projectWorldScene(node: EveSurfaceComponent): EveProjectedWorldEntity[];
export declare function createWorldActionIntent(command: string, action: Record<string, unknown>, options?: EveBrowserLoweringOptions): EveCommandIntent;
export declare function createInventoryDropIntent(source: Record<string, unknown>, target: Record<string, unknown>, destinationX: number, destinationY: number, options?: EveBrowserLoweringOptions): EveCommandIntent | undefined;
export interface InventoryPlacementCell {
    x: number;
    y: number;
}
export interface InventoryPlacementPreview {
    valid: boolean;
    reason: "valid" | "outside-grid" | "outside-valid-shape" | "occupied";
    cells: InventoryPlacementCell[];
}
export declare function createInventoryPlacementPreview(source: Record<string, unknown>, target: Record<string, unknown>, targetChildren: EveSurfaceComponent[], destinationX: number, destinationY: number): InventoryPlacementPreview;
export declare function applyEveSurfaceStyles(styles: EveSurfaceStyles | undefined, body?: HTMLElement): void;
export declare function createEveCommandIntent(commandId: string, props?: Record<string, unknown>, options?: EveBrowserLoweringOptions): EveCommandIntent;
export declare function emptyState(message: string): HTMLElement;
export declare function projectSemanticListItems(value: unknown): EveSemanticListItem[];
export * from "./input-gestures.js";
