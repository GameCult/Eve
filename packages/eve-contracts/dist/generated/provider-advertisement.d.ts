export interface EveProviderAdvertisement {
    schema: "gamecult.eve.provider_advertisement.v1";
    providerId: string;
    serviceId: string;
    verseId: string;
    rootVerse?: string;
    canonicalService?: string;
    locatedService?: string;
    cultMeshAddress?: string;
    title: string;
    kind: string;
    updatedAt?: string;
    updatedAtUtc?: string;
    freshness: {
        state: string;
        lastSeenAt?: string;
        lastSeenAtUtc?: string;
        maxAgeMs?: number;
        [k: string]: any;
    };
    schemas: (string | {
        [k: string]: any;
    })[];
    witnesses: {
        kind: string;
        ref?: string;
        path?: string;
        summary?: string;
        [k: string]: any;
    }[];
    surfaces: {
        surfaceId: string;
        schema: string;
        key?: string;
        recordRef?: string;
        url?: string;
        transport: string;
        status?: string;
        surfaceKind?: string;
        interactionModel?: string;
        worldInteraction?: {
            projectionKind: string;
            stateSchemas: string[];
            commandBoundary: string;
            commandRecordRef?: string;
            receiptSchema: string;
            receiptRecordRef?: string;
            assetManifestRecordRef?: string;
            loweringTargets: string[];
            ownership: string;
            [k: string]: any;
        };
        requiresPlugins?: {
            [k: string]: any;
        }[];
        [k: string]: any;
    }[];
    commands: {
        command: string;
        transport: string;
        summary?: string;
        [k: string]: any;
    }[];
    conformanceScenarios?: {
        scenarioId: string;
        schema: string;
        path: string;
        summary?: string;
        [k: string]: any;
    }[];
    [k: string]: any;
}
