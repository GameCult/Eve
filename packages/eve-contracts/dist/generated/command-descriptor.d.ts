export interface EveCommandDescriptor {
    schema: "gamecult.eve.command.v1";
    command: string;
    label?: string;
    surfaceId?: string;
    transport?: string;
    authority?: string;
    result?: string;
    payloadSchema?: string;
    [k: string]: any;
}
