export interface EveBrowserPluginAdapter {
    pluginId: string;
    capabilities: readonly string[];
    componentKinds: readonly string[];
    schemas: readonly string[];
    normalizeDocument(schemaId: string | undefined, value: unknown): unknown;
    renderComponent?: (component: FieldsComponent, props: Record<string, unknown>, layout: Record<string, unknown>, style: Record<string, unknown>, options: FieldsLoweringOptions, context: FieldsRuntimeContext) => HTMLElement;
}
export declare const fieldsBrowserAdapter: EveBrowserPluginAdapter;
export interface FieldsComponent {
    id?: string;
    kind?: string;
    text?: string;
    commandId?: string;
    props?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    style?: Record<string, unknown>;
    children?: FieldsComponent[];
    embeddedDocuments?: Array<Record<string, unknown>>;
}
export interface FieldsResolvedDocument {
    document?: unknown;
    schemaId?: string;
}
export interface FieldsLoweringOptions {
    documentResolver?: (request: FieldsDocumentRequest, component: FieldsComponent) => Promise<unknown>;
    provider?: {
        providerId?: string;
    };
}
export interface FieldsDocumentRequest {
    documentId: string;
    presentationKind?: string;
    schemaId?: string;
    slotId?: string;
}
export interface FieldsSurfaceDataState {
    renderSplats?: Record<string, unknown>;
    gravity?: Record<string, unknown>;
    objects?: Record<string, unknown>;
    loading?: boolean;
    lastError?: string;
    lastLoadedAt?: number;
}
export interface FieldsRuntimeContext {
    applyGeneratedLayout(element: HTMLElement, layout: Record<string, unknown>, style: Record<string, unknown>): void;
    providerId?: string;
    resolveAssetUrl(uri: string): string;
}
export declare function normalizeFieldsDocument(schemaId: string | undefined, value: unknown): unknown;
