import Ajv2020 from "ajv/dist/2020.js";
import { eveContractSchemas } from "./generated/schemas.js";
export { eveContractSchemas } from "./generated/schemas.js";
export const EVE_PROVIDER_ADVERTISEMENT_SCHEMA = "gamecult.eve.provider_advertisement.v1";
export const EVE_SURFACE_SCHEMA = "gamecult.eve.surface.v1";
export const EVE_COMMAND_DESCRIPTOR_SCHEMA = "gamecult.eve.command.v1";
export const EVE_COMMAND_INVOCATION_SCHEMA = "gamecult.eve.command_invocation.v1";
export const EVE_COMMAND_RECEIPT_SCHEMA = "gamecult.eve.command_receipt.v1";
export const EVE_COMMAND_RESULT_SCHEMA = "gamecult.eve.command_result.v1";
export const EVE_INPUT_CAPABILITY_SCHEMA = "gamecult.eve.input_capability.v1";
const ajv = new Ajv2020({
    allErrors: true,
    allowUnionTypes: true,
    strict: true,
    strictRequired: false,
    strictTypes: false,
});
for (const schema of Object.values(eveContractSchemas))
    ajv.addSchema(schema);
const validators = Object.fromEntries(Object.entries(eveContractSchemas).map(([name, schema]) => [name, requiredValidator(schema.$id)]));
export class EveContractValidationError extends TypeError {
    contract;
    errors;
    constructor(contract, errors) {
        super(`Invalid Eve ${contract}: ${ajv.errorsText(errors, { separator: "; " })}`);
        this.name = "EveContractValidationError";
        this.contract = contract;
        this.errors = errors;
    }
}
export function isEveContract(contract, value) {
    return Boolean(validators[contract](value));
}
export function parseEveContract(contract, value) {
    const validator = validators[contract];
    if (!validator(value))
        throw new EveContractValidationError(contract, validator.errors ?? []);
    return value;
}
export const isEveProviderAdvertisement = (value) => isEveContract("providerAdvertisement", value);
export const isEveSurfaceDocument = (value) => isEveContract("surface", value);
export const isEveCommandDescriptor = (value) => isEveContract("commandDescriptor", value);
export const isEveCommandInvocation = (value) => isEveContract("commandInvocation", value);
export const isEveCommandReceipt = (value) => isEveContract("commandReceipt", value);
export const isEveCommandResult = (value) => isEveContract("commandResult", value);
export const isEveInputCapability = (value) => isEveContract("inputCapability", value);
export const parseEveProviderAdvertisement = (value) => parseEveContract("providerAdvertisement", normalizeEveProviderAdvertisement(value));
export const parseEveSurfaceDocument = (value) => parseEveContract("surface", value);
export const parseEveCommandDescriptor = (value) => parseEveContract("commandDescriptor", value);
export const parseEveCommandInvocation = (value) => parseEveContract("commandInvocation", value);
export const parseEveCommandReceipt = (value) => parseEveContract("commandReceipt", value);
export const parseEveCommandResult = (value) => {
    const result = parseEveContract("commandResult", value);
    if (result.transientProjection)
        parseEveSurfaceDocument(result.transientProjection);
    return result;
};
export const parseEveInputCapability = (value) => parseEveContract("inputCapability", value);
function requiredValidator(schemaId) {
    const validator = ajv.getSchema(schemaId);
    if (!validator)
        throw new Error(`Eve contract schema ${schemaId} was not registered.`);
    return validator;
}
/**
 * Converts the canonical positional MessagePack representation used by the C#
 * Eve package into the JSON-shaped provider contract used at browser/model
 * boundaries. This is serialization lowering, not a second advertisement DTO.
 */
export function normalizeEveProviderAdvertisement(value) {
    if (!Array.isArray(value))
        return value;
    if (value.length < 13)
        return value;
    const [schema, providerId, serviceId, verseId, title, kind, cultMeshAddress, updatedAtUtc, freshness, schemas, witnesses, surfaces, commands, authorizedBodyProducerIds] = value;
    return {
        schema,
        providerId,
        serviceId,
        verseId,
        title,
        kind,
        cultMeshAddress,
        updatedAtUtc,
        freshness: normalizeFreshness(freshness),
        schemas,
        witnesses: Array.isArray(witnesses) ? witnesses.map(normalizeWitness) : witnesses,
        surfaces: Array.isArray(surfaces) ? surfaces.map(normalizeSurfaceAdvertisement) : surfaces,
        commands: Array.isArray(commands) ? commands.map(normalizeAdvertisedCommand) : commands,
        ...(Array.isArray(authorizedBodyProducerIds) ? { authorizedBodyProducerIds } : {}),
    };
}
function normalizeFreshness(value) {
    return Array.isArray(value)
        ? { state: value[0], lastSeenAtUtc: value[1], maxAgeMs: value[2] }
        : value;
}
function normalizeWitness(value) {
    return Array.isArray(value)
        ? { kind: value[0], ref: value[1], summary: value[2] }
        : value;
}
function normalizeSurfaceAdvertisement(value) {
    if (!Array.isArray(value))
        return value;
    return {
        surfaceId: value[0],
        schema: value[1],
        recordRef: value[2],
        transport: value[3],
        ...(value[4] ? { status: value[4] } : {}),
        ...(value[5] ? { surfaceKind: value[5] } : {}),
        ...(value[6] ? { worldInteraction: normalizeWorldInteraction(value[6]) } : {}),
    };
}
function normalizeWorldInteraction(value) {
    if (!Array.isArray(value))
        return value;
    return {
        projectionKind: value[0],
        stateSchemas: value[1],
        commandBoundary: value[2],
        commandRecordRef: value[3],
        receiptSchema: value[4],
        receiptRecordRef: value[5],
        assetManifestRecordRef: value[6],
        loweringTargets: value[7],
        ownership: value[8],
    };
}
function normalizeAdvertisedCommand(value) {
    return Array.isArray(value)
        ? { command: value[0], surfaceId: value[1], transport: value[2], summary: value[3] }
        : value;
}
