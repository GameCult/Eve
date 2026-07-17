export declare const eveContractSchemas: {
    readonly providerAdvertisement: {
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "gamecult.eve.provider_advertisement.v1";
        readonly title: "Eve Provider Advertisement";
        readonly type: "object";
        readonly required: readonly ["schema", "providerId", "serviceId", "verseId", "title", "kind", "freshness", "schemas", "witnesses", "surfaces", "commands"];
        readonly properties: {
            readonly schema: {
                readonly const: "gamecult.eve.provider_advertisement.v1";
            };
            readonly providerId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly serviceId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly verseId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly rootVerse: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly canonicalService: {
                readonly type: "string";
            };
            readonly locatedService: {
                readonly type: "string";
            };
            readonly cultMeshAddress: {
                readonly type: "string";
            };
            readonly title: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly kind: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly updatedAt: {
                readonly type: "string";
            };
            readonly updatedAtUtc: {
                readonly type: "string";
            };
            readonly freshness: {
                readonly type: "object";
                readonly required: readonly ["state"];
                readonly properties: {
                    readonly state: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly lastSeenAt: {
                        readonly type: "string";
                    };
                    readonly lastSeenAtUtc: {
                        readonly type: "string";
                    };
                    readonly maxAgeMs: {
                        readonly type: "number";
                    };
                };
                readonly additionalProperties: true;
            };
            readonly schemas: {
                readonly type: "array";
                readonly items: {
                    readonly type: readonly ["string", "object"];
                };
            };
            readonly witnesses: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["kind"];
                    readonly properties: {
                        readonly kind: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly ref: {
                            readonly type: "string";
                        };
                        readonly path: {
                            readonly type: "string";
                        };
                        readonly summary: {
                            readonly type: "string";
                        };
                    };
                    readonly additionalProperties: true;
                };
            };
            readonly surfaces: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["surfaceId", "schema", "transport"];
                    readonly properties: {
                        readonly surfaceId: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly schema: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly key: {
                            readonly type: "string";
                        };
                        readonly recordRef: {
                            readonly type: "string";
                        };
                        readonly url: {
                            readonly type: "string";
                        };
                        readonly transport: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly status: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly surfaceKind: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly interactionModel: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly worldInteraction: {
                            readonly type: "object";
                            readonly required: readonly ["projectionKind", "stateSchemas", "commandBoundary", "receiptSchema", "loweringTargets", "ownership"];
                            readonly properties: {
                                readonly projectionKind: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly stateSchemas: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                        readonly minLength: 1;
                                    };
                                };
                                readonly commandBoundary: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly commandRecordRef: {
                                    readonly type: "string";
                                };
                                readonly receiptSchema: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly receiptRecordRef: {
                                    readonly type: "string";
                                };
                                readonly assetManifestRecordRef: {
                                    readonly type: "string";
                                };
                                readonly loweringTargets: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                        readonly minLength: 1;
                                    };
                                };
                                readonly ownership: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                            };
                            readonly additionalProperties: true;
                        };
                        readonly requiresPlugins: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly required: readonly ["pluginId", "requiredCapabilities"];
                                readonly properties: {
                                    readonly pluginId: {
                                        readonly type: "string";
                                        readonly minLength: 1;
                                    };
                                    readonly versionRange: {
                                        readonly type: "string";
                                    };
                                    readonly availability: {
                                        readonly type: "string";
                                        readonly enum: readonly ["required", "optional", "optional-nested"];
                                    };
                                    readonly requiredCapabilities: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                            readonly minLength: 1;
                                        };
                                    };
                                    readonly optionalCapabilities: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                            readonly minLength: 1;
                                        };
                                    };
                                };
                                readonly allOf: readonly [{
                                    readonly if: {
                                        readonly properties: {
                                            readonly availability: {
                                                readonly const: "required";
                                            };
                                        };
                                    };
                                    readonly then: {
                                        readonly properties: {
                                            readonly requiredCapabilities: {
                                                readonly minItems: 1;
                                            };
                                        };
                                    };
                                }, {
                                    readonly if: {
                                        readonly required: readonly ["availability"];
                                        readonly properties: {
                                            readonly availability: {
                                                readonly const: "optional-nested";
                                            };
                                        };
                                    };
                                    readonly then: {
                                        readonly required: readonly ["optionalCapabilities"];
                                        readonly properties: {
                                            readonly requiredCapabilities: {
                                                readonly maxItems: 0;
                                            };
                                            readonly optionalCapabilities: {
                                                readonly minItems: 1;
                                            };
                                        };
                                    };
                                }];
                                readonly additionalProperties: true;
                            };
                        };
                    };
                    readonly additionalProperties: true;
                };
            };
            readonly commands: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["command", "transport"];
                    readonly properties: {
                        readonly command: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly transport: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly summary: {
                            readonly type: "string";
                        };
                    };
                    readonly additionalProperties: true;
                };
            };
            readonly conformanceScenarios: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["scenarioId", "schema", "path"];
                    readonly properties: {
                        readonly scenarioId: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly schema: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly path: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly summary: {
                            readonly type: "string";
                        };
                    };
                    readonly additionalProperties: true;
                };
            };
        };
        readonly additionalProperties: true;
    };
    readonly surface: {
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "gamecult.eve.surface.v1";
        readonly title: "Eve Surface Document";
        readonly type: "object";
        readonly required: readonly ["type", "schema", "providerId", "providerKind", "title", "version", "surface", "commands"];
        readonly properties: {
            readonly type: {
                readonly const: "surface-state";
            };
            readonly schema: {
                readonly const: "gamecult.eve.surface.v1";
            };
            readonly providerId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly providerKind: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly title: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly version: {
                readonly type: "integer";
                readonly minimum: 0;
            };
            readonly updatedAt: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly updatedAtUtc: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly surface: {
                readonly type: "object";
                readonly required: readonly ["root", "styles"];
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly title: {
                        readonly type: "string";
                    };
                    readonly root: {
                        readonly $ref: "#/$defs/component";
                    };
                    readonly styles: {
                        readonly type: readonly ["object", "array"];
                    };
                };
                readonly additionalProperties: true;
            };
            readonly commands: {
                readonly type: "array";
                readonly items: {
                    readonly $ref: "gamecult.eve.command.v1";
                };
            };
            readonly nodes: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                };
            };
            readonly selectedNodeId: {
                readonly type: "string";
            };
        };
        readonly $defs: {
            readonly component: {
                readonly type: "object";
                readonly required: readonly ["id", "kind", "props", "children"];
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly kind: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly props: {
                        readonly type: "object";
                    };
                    readonly children: {
                        readonly type: "array";
                        readonly items: {
                            readonly $ref: "#/$defs/component";
                        };
                    };
                    readonly stateBindings: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly required: readonly ["targetProp", "pointerId", "sourceId", "schemaId", "routeKind"];
                            readonly properties: {
                                readonly targetProp: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly pointerId: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly sourceId: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly schemaId: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly routeKind: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly routeDescription: {
                                    readonly type: "string";
                                };
                            };
                            readonly additionalProperties: true;
                        };
                    };
                    readonly embeddedDocuments: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly required: readonly ["slotId", "documentId", "schemaId", "presentationKind"];
                            readonly properties: {
                                readonly slotId: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly documentId: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly schemaId: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly presentationKind: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly routeHint: {
                                    readonly type: readonly ["string", "object"];
                                };
                            };
                            readonly additionalProperties: true;
                        };
                    };
                };
                readonly additionalProperties: true;
            };
        };
        readonly anyOf: readonly [{
            readonly required: readonly ["updatedAt"];
        }, {
            readonly required: readonly ["updatedAtUtc"];
        }];
        readonly additionalProperties: true;
    };
    readonly commandDescriptor: {
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "gamecult.eve.command.v1";
        readonly title: "Eve Command Descriptor";
        readonly type: "object";
        readonly required: readonly ["schema", "command"];
        readonly properties: {
            readonly schema: {
                readonly const: "gamecult.eve.command.v1";
            };
            readonly command: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly label: {
                readonly type: "string";
            };
            readonly surfaceId: {
                readonly type: "string";
            };
            readonly transport: {
                readonly type: "string";
            };
            readonly authority: {
                readonly type: "string";
            };
            readonly result: {
                readonly type: "string";
            };
            readonly payloadSchema: {
                readonly type: "string";
            };
        };
        readonly additionalProperties: true;
    };
    readonly commandInvocation: {
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "gamecult.eve.command_invocation.v1";
        readonly title: "Eve Command Invocation";
        readonly type: "object";
        readonly required: readonly ["schema", "providerId", "surfaceId", "operation", "payload", "issuedAt", "clientId", "commandBoundary", "receiptSchema"];
        readonly properties: {
            readonly schema: {
                readonly const: "gamecult.eve.command_invocation.v1";
            };
            readonly providerId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly surfaceId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly operation: {
                readonly type: "object";
                readonly required: readonly ["operationId"];
                readonly properties: {
                    readonly operationId: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly schemaId: {
                        readonly type: "string";
                    };
                    readonly idempotencyKey: {
                        readonly type: "string";
                    };
                    readonly routeHint: {
                        readonly type: "object";
                    };
                };
                readonly additionalProperties: true;
            };
            readonly payload: {
                readonly type: "object";
            };
            readonly issuedAt: {
                readonly type: "string";
            };
            readonly clientId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly commandBoundary: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly receiptSchema: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly additionalProperties: false;
    };
    readonly commandReceipt: {
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "gamecult.eve.command_receipt.v1";
        readonly title: "Eve Command Receipt";
        readonly type: "object";
        readonly required: readonly ["schema", "receiptId", "commandId", "command", "state", "ownerRepo", "authority", "providerId", "surfaceId", "sourceVersion"];
        readonly properties: {
            readonly schema: {
                readonly const: "gamecult.eve.command_receipt.v1";
            };
            readonly receiptId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly commandId: {
                readonly type: "string";
            };
            readonly command: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly state: {
                readonly type: "string";
                readonly enum: readonly ["accepted", "denied", "pending", "reconciled"];
            };
            readonly ownerRepo: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly authority: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly providerId: {
                readonly type: "string";
            };
            readonly surfaceId: {
                readonly type: "string";
            };
            readonly message: {
                readonly type: "string";
            };
            readonly diagnostics: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                };
            };
            readonly issuedAtUtc: {
                readonly type: "string";
            };
            readonly sourceVersion: {
                readonly type: "integer";
                readonly minimum: 0;
            };
        };
        readonly additionalProperties: true;
    };
    readonly inputCapability: {
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "gamecult.eve.input_capability.v1";
        readonly title: "Eve Input Capability";
        readonly type: "object";
        readonly required: readonly ["schema", "providerId", "capabilityId", "actions", "defaultProfiles"];
        readonly properties: {
            readonly schema: {
                readonly const: "gamecult.eve.input_capability.v1";
            };
            readonly providerId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly capabilityId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly version: {
                readonly type: "integer";
                readonly minimum: 0;
            };
            readonly actions: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["actionId", "label", "operation", "availability"];
                    readonly properties: {
                        readonly actionId: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly operation: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly context: {
                            readonly type: "string";
                        };
                        readonly category: {
                            readonly type: "string";
                        };
                        readonly iconRef: {
                            readonly type: "string";
                        };
                        readonly availability: {
                            readonly enum: readonly ["available", "dormant", "unavailable"];
                        };
                        readonly sourceRef: {
                            readonly type: "string";
                        };
                        readonly payload: {
                            readonly type: "object";
                            readonly additionalProperties: {
                                readonly type: "string";
                            };
                        };
                        readonly inputValue: {
                            readonly $ref: "#/$defs/inputValue";
                        };
                    };
                    readonly additionalProperties: false;
                };
            };
            readonly defaultProfiles: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["profileId", "deviceClass", "bindings"];
                    readonly properties: {
                        readonly profileId: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly deviceClass: {
                            readonly enum: readonly ["keyboard-mouse", "gamepad"];
                        };
                        readonly bindings: {
                            readonly type: "array";
                            readonly items: {
                                readonly $ref: "#/$defs/binding";
                            };
                        };
                    };
                    readonly additionalProperties: false;
                };
            };
        };
        readonly $defs: {
            readonly inputValue: {
                readonly type: "object";
                readonly required: readonly ["model"];
                readonly properties: {
                    readonly model: {
                        readonly enum: readonly ["button-hold.v1", "axis.v1", "view-direction.v1"];
                    };
                    readonly payloadKey: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly payloadKeys: {
                        readonly type: "array";
                        readonly minItems: 3;
                        readonly maxItems: 3;
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                };
                readonly allOf: readonly [{
                    readonly if: {
                        readonly properties: {
                            readonly model: {
                                readonly const: "view-direction.v1";
                            };
                        };
                        readonly required: readonly ["model"];
                    };
                    readonly then: {
                        readonly required: readonly ["payloadKeys"];
                    };
                    readonly else: {
                        readonly required: readonly ["payloadKey"];
                    };
                }];
                readonly additionalProperties: false;
            };
            readonly gesture: {
                readonly type: "object";
                readonly required: readonly ["kind", "controls"];
                readonly properties: {
                    readonly kind: {
                        readonly enum: readonly ["direct", "chord", "sequence", "axis"];
                    };
                    readonly controls: {
                        readonly type: "array";
                        readonly minItems: 1;
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                    readonly maxStepIntervalMs: {
                        readonly type: "integer";
                        readonly minimum: 50;
                    };
                    readonly completionControl: {
                        readonly type: "string";
                    };
                };
                readonly additionalProperties: false;
            };
            readonly binding: {
                readonly type: "object";
                readonly required: readonly ["bindingId", "actionId", "gesture"];
                readonly properties: {
                    readonly bindingId: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly actionId: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly gesture: {
                        readonly $ref: "#/$defs/gesture";
                    };
                    readonly actionBar: {
                        readonly type: "boolean";
                    };
                };
                readonly additionalProperties: false;
            };
        };
        readonly additionalProperties: false;
    };
};
export type EveContractSchemaName = keyof typeof eveContractSchemas;
