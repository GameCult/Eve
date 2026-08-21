import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import type { EveCommandDescriptor } from "./generated/command-descriptor.js";
import type { EveCommandInvocation } from "./generated/command-invocation.js";
import type { EveCommandReceipt } from "./generated/command-receipt.js";
import type { EveCommandResult } from "./generated/command-result.js";
import type { EveInputCapability } from "./generated/input-capability.js";
import type { EveProviderAdvertisement } from "./generated/provider-advertisement.js";
import type { EveSurfaceDocument } from "./generated/surface.js";
import { eveContractSchemas, type EveContractSchemaName } from "./generated/schemas.js";

export type { EveCommandDescriptor } from "./generated/command-descriptor.js";
export type { EveCommandInvocation } from "./generated/command-invocation.js";
export type { EveCommandReceipt } from "./generated/command-receipt.js";
export type { EveCommandResult } from "./generated/command-result.js";
export type { EveInputCapability } from "./generated/input-capability.js";
export type { EveProviderAdvertisement } from "./generated/provider-advertisement.js";
export type { EveSurfaceDocument } from "./generated/surface.js";
export { eveContractSchemas, type EveContractSchemaName } from "./generated/schemas.js";

export const EVE_PROVIDER_ADVERTISEMENT_SCHEMA = "gamecult.eve.provider_advertisement.v1" as const;
export const EVE_SURFACE_SCHEMA = "gamecult.eve.surface.v1" as const;
export const EVE_COMMAND_DESCRIPTOR_SCHEMA = "gamecult.eve.command.v1" as const;
export const EVE_COMMAND_INVOCATION_SCHEMA = "gamecult.eve.command_invocation.v1" as const;
export const EVE_COMMAND_RECEIPT_SCHEMA = "gamecult.eve.command_receipt.v1" as const;
export const EVE_COMMAND_RESULT_SCHEMA = "gamecult.eve.command_result.v1" as const;
export const EVE_INPUT_CAPABILITY_SCHEMA = "gamecult.eve.input_capability.v1" as const;

type ContractTypes = {
  providerAdvertisement: EveProviderAdvertisement;
  surface: EveSurfaceDocument;
  commandDescriptor: EveCommandDescriptor;
  commandInvocation: EveCommandInvocation;
  commandReceipt: EveCommandReceipt;
  commandResult: EveCommandResult;
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
export const isEveCommandResult = (value: unknown): value is EveCommandResult =>
  isEveContract("commandResult", value);
export const isEveInputCapability = (value: unknown): value is EveInputCapability =>
  isEveContract("inputCapability", value);

export const parseEveProviderAdvertisement = (value: unknown): EveProviderAdvertisement =>
  parseEveContract("providerAdvertisement", normalizeEveProviderAdvertisement(value));
export const parseEveSurfaceDocument = (value: unknown): EveSurfaceDocument =>
  parseEveContract("surface", value);
export const parseEveCommandDescriptor = (value: unknown): EveCommandDescriptor =>
  parseEveContract("commandDescriptor", value);
export const parseEveCommandInvocation = (value: unknown): EveCommandInvocation =>
  parseEveContract("commandInvocation", value);
export const parseEveCommandReceipt = (value: unknown): EveCommandReceipt =>
  parseEveContract("commandReceipt", value);
export const parseEveCommandResult = (value: unknown): EveCommandResult => {
  const result = parseEveContract("commandResult", value);
  if (result.transientProjection) parseEveSurfaceDocument(result.transientProjection);
  return result;
};
export const parseEveInputCapability = (value: unknown): EveInputCapability =>
  parseEveContract("inputCapability", value);

function requiredValidator(schemaId: string): ValidateFunction {
  const validator = ajv.getSchema(schemaId);
  if (!validator) throw new Error(`Eve contract schema ${schemaId} was not registered.`);
  return validator;
}

/**
 * Converts the canonical positional MessagePack representation used by the C#
 * Eve package into the JSON-shaped provider contract used at browser/model
 * boundaries. This is serialization lowering, not a second advertisement DTO.
 */
export function normalizeEveProviderAdvertisement(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  if (value.length < 13) return value;
  const [schema, providerId, serviceId, verseId, title, kind, cultMeshAddress, updatedAtUtc,
    freshness, schemas, witnesses, surfaces, commands, authorizedBodyProducerIds] = value;
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

function normalizeFreshness(value: unknown): unknown {
  return Array.isArray(value)
    ? { state: value[0], lastSeenAtUtc: value[1], maxAgeMs: value[2] }
    : value;
}

function normalizeWitness(value: unknown): unknown {
  return Array.isArray(value)
    ? { kind: value[0], ref: value[1], summary: value[2] }
    : value;
}

function normalizeSurfaceAdvertisement(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return {
    surfaceId: value[0],
    schema: value[1],
    recordRef: value[2],
    transport: value[3],
    status: value[4],
    surfaceKind: value[5],
    ...(value[6] ? { worldInteraction: normalizeWorldInteraction(value[6]) } : {}),
  };
}

function normalizeWorldInteraction(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
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

function normalizeAdvertisedCommand(value: unknown): unknown {
  return Array.isArray(value)
    ? { command: value[0], surfaceId: value[1], transport: value[2], summary: value[3] }
    : value;
}
