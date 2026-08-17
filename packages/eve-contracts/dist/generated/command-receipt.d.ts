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
