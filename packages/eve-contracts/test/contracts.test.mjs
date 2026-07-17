import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  EveContractValidationError,
  isEveCommandDescriptor,
  parseEveCommandInvocation,
  parseEveCommandReceipt,
  parseEveInputCapability,
  parseEveProviderAdvertisement,
  parseEveSurfaceDocument,
} from "../dist/index.js";

const command = { schema: "gamecult.eve.command.v1", command: "swarm.set_heat", transport: "cultmesh" };
const surface = {
  type: "surface-state",
  schema: "gamecult.eve.surface.v1",
  providerId: "voidbot.swarm",
  providerKind: "agent.swarm",
  title: "VoidBot Swarm",
  version: 1,
  updatedAt: "2026-07-13T00:00:00Z",
  surface: {
    root: { id: "root", kind: "surface", props: {}, children: [], stateBindings: [], embeddedDocuments: [] },
    styles: { tokens: {} },
  },
  commands: [command],
};

test("accepts canonical provider, surface, command, invocation, and receipt documents", () => {
  assert.ok(isEveCommandDescriptor(command));
  assert.equal(parseEveSurfaceDocument(surface).providerId, "voidbot.swarm");
  assert.equal(parseEveProviderAdvertisement({
    schema: "gamecult.eve.provider_advertisement.v1",
    providerId: "voidbot.swarm",
    serviceId: "voidbot",
    verseId: "voidbot.local",
    title: "VoidBot Swarm",
    kind: "agent.swarm",
    freshness: { state: "fresh" },
    schemas: ["gamecult.eve.surface.v1"],
    witnesses: [],
    surfaces: [{ surfaceId: "voidbot.swarm", schema: "gamecult.eve.surface.v1", transport: "cultmesh" }],
    commands: [{ command: "swarm.set_heat", transport: "cultmesh" }],
  }).providerId, "voidbot.swarm");
  assert.equal(parseEveCommandInvocation({
    schema: "gamecult.eve.command_invocation.v1",
    providerId: "voidbot.swarm",
    surfaceId: "voidbot.swarm",
    operation: { operationId: "swarm.set_heat" },
    payload: { value: 1.25 },
    issuedAt: "2026-07-13T00:00:00Z",
    clientId: "test",
    commandBoundary: "voidbot.swarm.commands",
    receiptSchema: "gamecult.eve.command_receipt.v1",
  }).operation.operationId, "swarm.set_heat");
  assert.equal(parseEveCommandReceipt({
    schema: "gamecult.eve.command_receipt.v1",
    receiptId: "receipt-1",
    commandId: "command-1",
    command: "swarm.set_heat",
    state: "reconciled",
    ownerRepo: "VoidBot",
    authority: "voidbot.swarm_control_state.v1",
    providerId: "voidbot.swarm",
    surfaceId: "voidbot.swarm",
    sourceVersion: 1,
  }).state, "reconciled");
});

test("rejects missing required fields with contract diagnostics", () => {
  assert.throws(
    () => parseEveSurfaceDocument({ ...surface, providerId: undefined }),
    (error) => error instanceof EveContractValidationError &&
      error.contract === "surface" &&
      error.errors.some((entry) => entry.keyword === "required" && entry.params.missingProperty === "providerId"),
  );
  assert.throws(
    () => parseEveCommandReceipt({ schema: "gamecult.eve.command_receipt.v1" }),
    EveContractValidationError,
  );
});

test("published schema constants retain their authoritative ids", async () => {
  const schemas = JSON.parse(await readFile(resolve(import.meta.dirname, "..", "..", "..", "schemas", "gamecult.eve.surface.v1.schema.json"), "utf8"));
  assert.equal(schemas.$id, "gamecult.eve.surface.v1");
});

test("validates scalar and view-direction input value models", () => {
  const base = {
    schema: "gamecult.eve.input_capability.v1",
    providerId: "flight.provider",
    capabilityId: "pilot.input",
    version: 1,
    defaultProfiles: [],
  };
  assert.equal(parseEveInputCapability({
    ...base,
    actions: [{
      actionId: "pilot.fire",
      label: "Fire",
      operation: "pilot.fire",
      availability: "available",
      inputValue: { model: "button-hold.v1", payloadKey: "active" },
    }],
  }).actions[0].inputValue.payloadKey, "active");
  assert.deepEqual(parseEveInputCapability({
    ...base,
    actions: [{
      actionId: "equipment.0.temperature",
      label: "Target Temperature",
      operation: "equipment.set-temperature",
      availability: "available",
      actionBar: true,
      inputValue: {
        model: "scalar.v1",
        payloadKey: "scalarValue",
        currentValue: 300,
        minimumValue: 0,
        stepValue: 1,
        unit: "kelvin",
      },
    }],
  }).actions[0].inputValue, {
    model: "scalar.v1",
    payloadKey: "scalarValue",
    currentValue: 300,
    minimumValue: 0,
    stepValue: 1,
    unit: "kelvin",
  });
  assert.deepEqual(parseEveInputCapability({
    ...base,
    actions: [{
      actionId: "pilot.target-reticle",
      label: "Target Reticle",
      operation: "pilot.target-reticle",
      availability: "available",
      inputValue: {
        model: "view-direction.v1",
        payloadKeys: ["directionX", "directionY", "directionZ"],
      },
    }],
  }).actions[0].inputValue.payloadKeys, ["directionX", "directionY", "directionZ"]);
  assert.throws(() => parseEveInputCapability({
    ...base,
    actions: [{
      actionId: "pilot.target-reticle",
      label: "Target Reticle",
      operation: "pilot.target-reticle",
      availability: "available",
      inputValue: { model: "view-direction.v1", payloadKey: "directionX" },
    }],
  }), EveContractValidationError);
  assert.throws(() => parseEveInputCapability({
    ...base,
    actions: [{
      actionId: "equipment.0.temperature",
      label: "Target Temperature",
      operation: "equipment.set-temperature",
      availability: "available",
      inputValue: { model: "scalar.v1", payloadKey: "scalarValue" },
    }],
  }), EveContractValidationError);
});

test("validates an existing canonical Eve surface fixture", async () => {
  const fixturePath = resolve(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "web",
    "fixtures",
    "eve-world-smoke-surface.json",
  );
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  assert.equal(parseEveSurfaceDocument(fixture).providerId, "eve.world-smoke");
});
