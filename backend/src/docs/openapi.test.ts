import { describe, expect, it } from "vitest";
import { openapi } from "./openapi.js";

type Operation = {
  summary?: string;
  tags?: string[];
  responses?: Record<string, unknown>;
  parameters?: { name: string; in: string }[];
};
const spec = openapi as unknown as {
  tags: { name: string }[];
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, unknown> };
};

function collectRefs(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => collectRefs(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string") out.push(v);
      else collectRefs(v, out);
    }
  }
  return out;
}

describe("spesifikasi OpenAPI", () => {
  it("semua $ref menunjuk ke skema yang ada", () => {
    for (const ref of collectRefs(openapi)) {
      const name = ref.replace("#/components/schemas/", "");
      expect(spec.components.schemas, `skema ${name} tidak ada`).toHaveProperty(name);
    }
  });

  it("setiap operasi punya summary, respons, dan tag yang terdaftar", () => {
    const tagNames = spec.tags.map((t) => t.name);
    for (const [path, item] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(item)) {
        const where = `${method.toUpperCase()} ${path}`;
        expect(op.summary, `${where}: summary`).toBeTruthy();
        expect(Object.keys(op.responses ?? {}).length, `${where}: responses`).toBeGreaterThan(0);
        for (const t of op.tags ?? []) expect(tagNames, `${where}: tag ${t}`).toContain(t);
      }
    }
  });

  it("setiap parameter path {x} dideklarasikan", () => {
    for (const [path, item] of Object.entries(spec.paths)) {
      const needed = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
      for (const [method, op] of Object.entries(item)) {
        const declared = (op.parameters ?? []).filter((p) => p.in === "path").map((p) => p.name);
        for (const p of needed) expect(declared, `${method.toUpperCase()} ${path}: {${p}}`).toContain(p);
      }
    }
  });
});