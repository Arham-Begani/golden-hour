/**
 * Zod is the single source of truth for the extraction shape. Gemini's
 * `responseSchema` accepts an OpenAPI 3.0 subset, not full JSON Schema, so
 * this converts one to the other: inline every `$ref`, drop every keyword
 * Gemini rejects, and pin property order so the model emits fields in the
 * order we care about.
 *
 * Doing it this way means the schema, the server-side validation and the
 * TypeScript types can never drift apart.
 */

/** Keywords Gemini's Schema type understands. Everything else is dropped. */
const ALLOWED = new Set([
  "type",
  "format",
  "description",
  "nullable",
  "enum",
  "items",
  "properties",
  "required",
  "propertyOrdering",
  "minItems",
  "maxItems",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "pattern",
  "anyOf",
]);

/**
 * Keys whose value is a *map of schemas* keyed by arbitrary names, not a
 * schema itself. Their keys are field names and must survive the ALLOWED
 * filter untouched.
 */
const SCHEMA_MAPS = new Set(["properties", "$defs", "definitions"]);

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Resolve a local JSON pointer like "#/$defs/Foo" against the root document. */
function resolveRef(ref: string, root: Json): Json {
  if (!ref.startsWith("#/")) {
    throw new Error(`toGeminiSchema: cannot resolve non-local $ref "${ref}"`);
  }
  const segments = ref
    .slice(2)
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));

  let node: unknown = root;
  for (const segment of segments) {
    if (!isObject(node)) {
      throw new Error(`toGeminiSchema: broken $ref "${ref}"`);
    }
    node = node[segment];
  }
  if (!isObject(node)) {
    throw new Error(`toGeminiSchema: $ref "${ref}" did not resolve to a schema`);
  }
  return node;
}

function walk(node: unknown, root: Json, seen: string[]): unknown {
  if (Array.isArray(node)) return node.map((child) => walk(child, root, seen));
  if (!isObject(node)) return node;

  if (typeof node.$ref === "string") {
    const ref = node.$ref;
    if (seen.includes(ref)) {
      // A recursive schema cannot be inlined into a finite document. We have
      // none today; fail loudly rather than emit something Gemini will reject.
      throw new Error(`toGeminiSchema: recursive $ref "${ref}" cannot be inlined`);
    }
    const resolved = resolveRef(ref, root);
    const siblings = { ...node };
    delete siblings.$ref;
    return walk({ ...resolved, ...siblings }, root, [...seen, ref]);
  }

  const out: Json = {};
  for (const [key, value] of Object.entries(node)) {
    if (!ALLOWED.has(key)) continue;

    if (SCHEMA_MAPS.has(key) && isObject(value)) {
      const mapped: Json = {};
      for (const [name, child] of Object.entries(value)) {
        mapped[name] = walk(child, root, seen);
      }
      out[key] = mapped;
      continue;
    }

    out[key] = walk(value, root, seen);
  }

  // Gemini emits properties in whatever order it likes unless told otherwise.
  // Fixing the order makes responses diffable and keeps the freeze-critical
  // fields early in the stream.
  if (isObject(out.properties)) {
    out.propertyOrdering = Object.keys(out.properties);
  }

  return out;
}

/**
 * Convert a JSON Schema document (as produced by `z.toJSONSchema`) into a
 * schema object Gemini's `responseSchema` will accept.
 */
export function toGeminiSchema(jsonSchema: unknown): Json {
  if (!isObject(jsonSchema)) {
    throw new Error("toGeminiSchema: expected a JSON Schema object");
  }
  const result = walk(jsonSchema, jsonSchema, []);
  if (!isObject(result)) {
    throw new Error("toGeminiSchema: conversion did not produce an object");
  }
  return result;
}
