import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractionResponseSchema } from "./extract";
import { toGeminiSchema } from "./gemini-schema";

/** Walk every node of a schema document. */
function nodes(schema: unknown): Record<string, unknown>[] {
  if (Array.isArray(schema)) return schema.flatMap(nodes);
  if (typeof schema !== "object" || schema === null) return [];
  const self = schema as Record<string, unknown>;
  return [self, ...Object.values(self).flatMap(nodes)];
}

describe("toGeminiSchema", () => {
  it("strips keywords Gemini's OpenAPI subset rejects", () => {
    const converted = extractionResponseSchema();
    const banned = ["$schema", "$defs", "$ref", "additionalProperties", "allOf", "oneOf", "const"];

    for (const node of nodes(converted)) {
      for (const key of banned) {
        expect(Object.keys(node), `"${key}" survived conversion`).not.toContain(key);
      }
    }
  });

  it("inlines $refs so repeated sub-schemas survive", () => {
    const Inner = z.object({ value: z.string(), confidence: z.number() });
    const Outer = z.object({ a: Inner, b: Inner });

    const converted = toGeminiSchema(z.toJSONSchema(Outer, { io: "output" })) as {
      properties: { a: { properties: Record<string, unknown> }; b: { properties: Record<string, unknown> } };
    };

    expect(Object.keys(converted.properties.a.properties)).toEqual(["value", "confidence"]);
    expect(Object.keys(converted.properties.b.properties)).toEqual(["value", "confidence"]);
  });

  it("keeps every top-level extraction field and pins their order", () => {
    const converted = extractionResponseSchema() as {
      type: string;
      properties: Record<string, unknown>;
      propertyOrdering: string[];
      required: string[];
    };

    expect(converted.type).toBe("object");
    expect(converted.propertyOrdering).toEqual(Object.keys(converted.properties));
    expect(converted.required).toContain("utr_or_upi_ref");
    expect(converted.required).toContain("active_scam");
  });

  it("carries the UNREADABLE instruction down to individual fields", () => {
    const converted = extractionResponseSchema() as {
      properties: { utr_or_upi_ref: { properties: { value: { description: string } } } };
    };

    expect(converted.properties.utr_or_upi_ref.properties.value.description).toContain("UNREADABLE");
  });

  it("preserves enums", () => {
    const converted = extractionResponseSchema() as {
      properties: { payment_rail: { properties: { value: { enum: string[] } } } };
    };

    expect(converted.properties.payment_rail.properties.value.enum).toContain("UPI");
  });

  it("refuses to silently emit a recursive schema", () => {
    const recursive = {
      type: "object",
      properties: { child: { $ref: "#/$defs/Node" } },
      $defs: {
        Node: { type: "object", properties: { next: { $ref: "#/$defs/Node" } } },
      },
    };
    // A cycle cannot be inlined into a finite document — fail loudly, don't hang.
    expect(() => toGeminiSchema(recursive)).toThrow(/recursive/i);
  });
});
