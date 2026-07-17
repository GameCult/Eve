import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import type { EveCommandDescriptor } from "./generated/command-descriptor.js";
import type { EveCommandInvocation } from "./generated/command-invocation.js";
import type { EveCommandReceipt } from "./generated/command-receipt.js";
import type { EveInputCapability } from "./generated/input-capability.js";
import type { EveProviderAdvertisement } from "./generated/provider-advertisement.js";
import type { EveSurfaceDocument } from "./generated/surface.js";
import { eveContractSchemas, type EveContractSchemaName } from "./generated/schemas.js";

export type { EveCommandDescriptor } from "./generated/command-descriptor.js";
export type { EveCommandInvocation } from "./generated/command-invocation.js";
export type { EveCommandReceipt } from "./generated/command-receipt.js";
export type { EveInputCapability } from "./generated/input-capability.js";
export type { EveProviderAdvertisement } from "./generated/provider-advertisement.js";
export type { EveSurfaceDocument } from "./generated/surface.js";
export { eveContractSchemas, type EveContractSchemaName } from "./generated/schemas.js";

export const EVE_PROVIDER_ADVERTISEMENT_SCHEMA = "gamecult.eve.provider_advertisement.v1" as const;
export const EVE_SURFACE_SCHEMA = "gamecult.eve.surface.v1" as const;
export const EVE_COMMAND_DESCRIPTOR_SCHEMA = "gamecult.eve.command.v1" as const;
export const EVE_COMMAND_INVOCATION_SCHEMA = "gamecult.eve.command_invocation.v1" as const;
export const EVE_COMMAND_RECEIPT_SCHEMA = "gamecult.eve.command_receipt.v1" as const;
export const EVE_INPUT_CAPABILITY_SCHEMA = "gamecult.eve.input_capability.v1" as const;

type ContractTypes = {
  providerAdvertisement: EveProviderAdvertisement;
  surface: EveSurfaceDocument;
  commandDescriptor: EveCommandDescriptor;
  commandInvocation: EveCommandInvocation;
  commandReceipt: EveCommandReceipt;
  inputCapability: EveInputCapability;
};

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
  strictRequired: false,
  strictTypes: false,
});
for (const schema of Object.values(eveContractSchemas)) ajv.addSchema(schema);

const validators = Object.fromEntries(
  Object.entries(eveContractSchemas).map(([name, schema]) => [name, requiredValidator(schema.$id)]),
) as Record<EveContractSchemaName, ValidateFunction>;

export class EveContractValidationError extends TypeError {
  public readonly contract: EveContractSchemaName;
  public readonly errors: readonly ErrorObject[];

  public constructor(contract: EveContractSchemaName, errors: readonly ErrorObject[]) {
    super(`Invalid Eve ${contract}: ${ajv.errorsText(errors as ErrorObject[], { separator: "; " })}`);
    this.name = "EveContractValidationError";
    this.contract = contract;
    this.errors = errors;
  }
}

export function isEveContract<K extends EveContractSchemaName>(
  contract: K,
  value: unknown,
): value is ContractTypes[K] {
  return Boolean(validators[contract](value));
}

export function parseEveContract<K extends EveContractSchemaName>(
  contract: K,
  value: unknown,
): ContractTypes[K] {
  const validator = validators[contract];
  if (!validator(value)) throw new EveContractValidationError(contract, validator.errors ?? []);
  return value as ContractTypes[K];
}

export const isEveProviderAdvertisement = (value: unknown): value is EveProviderAdvertisement =>
  isEveContract("providerAdvertisement", value);
export const isEveSurfaceDocument = (value: unknown): value is EveSurfaceDocument =>
  isEveContract("surface", value);
export const isEveCommandDescriptor = (value: unknown): value is EveCommandDescriptor =>
  isEveContract("commandDescriptor", value);
export const isEveCommandInvocation = (value: unknown): value is EveCommandInvocation =>
  isEveContract("commandInvocation", value);
export const isEveCommandReceipt = (value: unknown): value is EveCommandReceipt =>
  isEveContract("commandReceipt", value);
export const isEveInputCapability = (value: unknown): value is EveInputCapability =>
  isEveContract("inputCapability", value);

export const parseEveProviderAdvertisement = (value: unknown): EveProviderAdvertisement =>
  parseEveContract("providerAdvertisement", value);
export const parseEveSurfaceDocument = (value: unknown): EveSurfaceDocument =>
  parseEveContract("surface", value);
export const parseEveCommandDescriptor = (value: unknown): EveCommandDescriptor =>
  parseEveContract("commandDescriptor", value);
export const parseEveCommandInvocation = (value: unknown): EveCommandInvocation =>
  parseEveContract("commandInvocation", value);
export const parseEveCommandReceipt = (value: unknown): EveCommandReceipt =>
  parseEveContract("commandReceipt", value);
export const parseEveInputCapability = (value: unknown): EveInputCapability =>
  parseEveContract("inputCapability", value);

function requiredValidator(schemaId: string): ValidateFunction {
  const validator = ajv.getSchema(schemaId);
  if (!validator) throw new Error(`Eve contract schema ${schemaId} was not registered.`);
  return validator;
}
