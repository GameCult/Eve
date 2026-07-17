import Ajv2020 from "ajv/dist/2020.js";
import { eveContractSchemas } from "./generated/schemas.js";
export { eveContractSchemas } from "./generated/schemas.js";
export const EVE_PROVIDER_ADVERTISEMENT_SCHEMA = "gamecult.eve.provider_advertisement.v1";
export const EVE_SURFACE_SCHEMA = "gamecult.eve.surface.v1";
export const EVE_COMMAND_DESCRIPTOR_SCHEMA = "gamecult.eve.command.v1";
export const EVE_COMMAND_INVOCATION_SCHEMA = "gamecult.eve.command_invocation.v1";
export const EVE_COMMAND_RECEIPT_SCHEMA = "gamecult.eve.command_receipt.v1";
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
export const isEveInputCapability = (value) => isEveContract("inputCapability", value);
export const parseEveProviderAdvertisement = (value) => parseEveContract("providerAdvertisement", value);
export const parseEveSurfaceDocument = (value) => parseEveContract("surface", value);
export const parseEveCommandDescriptor = (value) => parseEveContract("commandDescriptor", value);
export const parseEveCommandInvocation = (value) => parseEveContract("commandInvocation", value);
export const parseEveCommandReceipt = (value) => parseEveContract("commandReceipt", value);
export const parseEveInputCapability = (value) => parseEveContract("inputCapability", value);
function requiredValidator(schemaId) {
    const validator = ajv.getSchema(schemaId);
    if (!validator)
        throw new Error(`Eve contract schema ${schemaId} was not registered.`);
    return validator;
}
