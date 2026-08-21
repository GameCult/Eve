export type EveSurfaceDocument = ({
    [k: string]: any;
} & {
    type: "surface-state";
    schema: "gamecult.eve.surface.v1";
    providerId: string;
    providerKind: string;
    title: string;
    version: number;
    updatedAt?: string;
    updatedAtUtc?: string;
    surface: {
        id?: string;
        title?: string;
        root: Component;
        styles: ({
            [k: string]: any;
        } | any[]);
        [k: string]: any;
    };
    commands: EveCommandDescriptor[];
    nodes?: {
        [k: string]: any;
    }[];
    selectedNodeId?: string;
    [k: string]: any;
});
export interface Component {
    id: string;
    kind: string;
    props: {
        [k: string]: any;
    };
    children: Component[];
    stateBindings?: {
        targetProp: string;
        pointerId: string;
        sourceId: string;
        schemaId: string;
        routeKind: string;
        routeDescription?: string;
        bindingName?: string;
        documentId?: string;
        fieldPath?: string;
        valueKind?: ("string" | "number" | "boolean" | "choice" | "string-list");
        accessMode?: ("read" | "write" | "read-write" | "local-draft");
        authority?: string;
        writeCommand?: string;
        [k: string]: any;
    }[];
    embeddedDocuments?: {
        slotId: string;
        documentId: string;
        schemaId: string;
        presentationKind: string;
        routeHint?: (string | {
            [k: string]: any;
        });
        [k: string]: any;
    }[];
    [k: string]: any;
}
export interface EveCommandDescriptor {
    schema: "gamecult.eve.command.v1";
    command: string;
    label?: string;
    surfaceId?: string;
    transport?: string;
    authority?: string;
    result?: string;
    payloadSchema?: string;
    captureBindings?: string[];
    [k: string]: any;
}
