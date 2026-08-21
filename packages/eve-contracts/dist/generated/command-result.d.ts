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
    sourceVersion: number;
    navigation?: {
        verseId: string;
        providerId?: string;
        surfaceId: string;
        surfaceKind?: string;
        rendezvousEndpoints?: string[];
    };
    [k: string]: any;
}
