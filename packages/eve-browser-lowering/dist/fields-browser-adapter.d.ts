export interface EveBrowserPluginAdapter {
    pluginId: string;
    capabilities: readonly string[];
    schemas: readonly string[];
    normalizeDocument(schemaId: string | undefined, value: unknown): unknown;
}
export declare const fieldsBrowserAdapter: EveBrowserPluginAdapter;
export declare function normalizeFieldsDocument(schemaId: string | undefined, value: unknown): unknown;
