export function validateSchemaSubset(schema, value, pointer = "$") {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${pointer}:const:${schema.const}`);
  }
  if (schema.type && !matchesSchemaType(value, schema.type)) {
    errors.push(`${pointer}:type:${schema.type}`);
    return errors;
  }
  if (schema.minLength !== undefined && typeof value === "string" && value.length < schema.minLength) {
    errors.push(`${pointer}:minLength:${schema.minLength}`);
  }
  if (schema.minItems !== undefined && Array.isArray(value) && value.length < schema.minItems) {
    errors.push(`${pointer}:minItems:${schema.minItems}`);
  }
  if (schema.required && value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required) {
      if (value[key] === undefined) errors.push(`${pointer}.${key}:required`);
    }
  }
  if (schema.properties && value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, childSchema] of Object.entries(schema.properties)) {
      if (value[key] !== undefined) {
        errors.push(...validateSchemaSubset(childSchema, value[key], `${pointer}.${key}`));
      }
    }
  }
  if (schema.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      errors.push(...validateSchemaSubset(schema.items, item, `${pointer}[${index}]`));
    });
  }
  return errors;
}

function matchesSchemaType(value, type) {
  switch (type) {
    case "array":
      return Array.isArray(value);
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    default:
      return true;
  }
}
