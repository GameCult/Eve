export interface EveCommandInvocation {
    schema: "gamecult.eve.command_invocation.v1";
    providerId: string;
    surfaceId: string;
    operation: {
        operationId: string;
        schemaId?: string;
        idempotencyKey?: string;
        routeHint?: {
            [k: string]: any;
        };
        [k: string]: any;
    };
    payload: {
        [k: string]: any;
    };
    issuedAt: string;
    clientId: string;
    commandBoundary: string;
    receiptSchema: string;
}
