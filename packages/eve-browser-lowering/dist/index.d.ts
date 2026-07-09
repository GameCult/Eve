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
    schema: "gamecult.eve.command.v1";
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
    worldInteraction?: EveSurfaceWorldInteraction;
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
    source?: string;
    statusElement?: HTMLElement;
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
export declare function renderEveSurface(surface: EveSurfaceDocument, host: HTMLElement, options?: EveBrowserLoweringOptions): HTMLElement;
export declare function renderEveComponent(node: EveSurfaceComponent, options?: EveBrowserLoweringOptions): HTMLElement;
export declare function applyEveSurfaceStyles(styles: EveSurfaceStyles | undefined, body?: HTMLElement): void;
export declare function createEveCommandIntent(commandId: string, props?: Record<string, unknown>, options?: EveBrowserLoweringOptions): EveCommandIntent;
export declare function emptyState(message: string): HTMLElement;
