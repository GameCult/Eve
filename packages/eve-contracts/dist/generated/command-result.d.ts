export interface EveCommandResult {
    schema: "gamecult.eve.command_result.v1";
    receipt: EveCommandReceipt;
    transientProjection?: {
        schema: "gamecult.eve.surface.v1";
        [k: string]: any;
    };
    pluginPayload?: {
        pluginId: string;
        schemaId: string;
        payload: {
            [k: string]: any;
        };
    };
    draftDirective?: {
        clear: boolean;
        bindingNames?: string[];
    };
}
export interface EveCommandReceipt {
    schema: "gamecult.eve.command_receipt.v1";
    receiptId: string;
    commandId: string;
    command: string;
    state: ("accepted" | "denied" | "pending" | "reconciled");
    ownerRepo: string;
    authority: string;
    providerId: string;
    surfaceId: string;
    message?: string;
    diagnostics?: {
        [k: string]: any;
    }[];
    issuedAtUtc?: string;
    /**
     * Provider-state generation that causally owns this result. It is not implicitly an Eve surface version.
     */
    sourceVersion: number;
    /**
     * Optional advertised base-surface version that a renderer must mount before exposing terminal presentation finality.
     */
    presentationSurfaceVersion?: number;
    /**
     * Canonical digest of the immutable invocation envelope finalized by this receipt.
     */
    invocationHash?: string;
    navigation?: {
        verseId: string;
        authorityRuntimeId?: string;
        providerId?: string;
        surfaceId: string;
        surfaceKind?: string;
        rendezvousEndpoints?: string[];
    };
    [k: string]: any;
}
