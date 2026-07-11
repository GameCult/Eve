import { type EveBrowserPluginAdapter } from "./fields-browser-adapter.js";
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
    embeddedDocuments?: Array<Record<string, unknown>>;
}
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
export interface EveCommandIntent {
    type: "surface-command";
    schema: "gamecult.eve.command_invocation.v1";
    providerId: string;
    surfaceId: string;
    command: string;
    commandBoundary?: string;
    receiptSchema?: string;
    payload: Record<string, unknown>;
    issuedAt: string;
    clientId: string;
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
    commandSink?: (intent: EveCommandIntent, component: EveSurfaceComponent) => void | Promise<void>;
    documentResolver?: (request: EveEmbeddedDocumentRequest, component: EveSurfaceComponent) => Promise<EveResolvedDocument | EveSurfaceDocument | EveSurfaceDocument["surface"] | undefined>;
    provider?: EveProviderAdvertisement;
    pluginAdapters?: readonly EveBrowserPluginAdapter[];
    source?: string;
    statusElement?: HTMLElement;
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
    constructor(host: HTMLElement, transport: EveBrowserProviderTransport, options?: EveBrowserProviderHostOptions);
    start(): Promise<void>;
    stop(): void;
    refresh(): Promise<void>;
    private submit;
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
export declare function renderEveComponent(node: EveSurfaceComponent, options?: EveBrowserLoweringOptions): HTMLElement;
export declare function projectWorldScene(node: EveSurfaceComponent): EveProjectedWorldEntity[];
export declare function createWorldActionIntent(command: string, action: Record<string, unknown>, options?: EveBrowserLoweringOptions): EveCommandIntent;
export declare function applyEveSurfaceStyles(styles: EveSurfaceStyles | undefined, body?: HTMLElement): void;
export declare function createEveCommandIntent(commandId: string, props?: Record<string, unknown>, options?: EveBrowserLoweringOptions): EveCommandIntent;
export declare function emptyState(message: string): HTMLElement;
export * from "./input-gestures.js";
