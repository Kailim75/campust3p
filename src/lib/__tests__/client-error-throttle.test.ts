import { describe, it, expect } from "vitest";
import { createErrorThrottle, buildClientErrorKey } from "../client-error-throttle";

describe("createErrorThrottle", () => {
  it("autorise le premier passage d'une clé", () => {
    const shouldReport = createErrorThrottle();
    expect(shouldReport("boom", 1000)).toBe(true);
  });

  it("bloque un second passage de la même clé dans la fenêtre", () => {
    const shouldReport = createErrorThrottle(60_000);
    expect(shouldReport("boom", 1000)).toBe(true);
    expect(shouldReport("boom", 1000 + 59_000)).toBe(false);
  });

  it("réautorise une fois la fenêtre écoulée", () => {
    const shouldReport = createErrorThrottle(60_000);
    expect(shouldReport("boom", 1000)).toBe(true);
    expect(shouldReport("boom", 1000 + 60_000)).toBe(true);
  });

  it("deux clés différentes sont indépendantes", () => {
    const shouldReport = createErrorThrottle(60_000);
    expect(shouldReport("boom-a", 1000)).toBe(true);
    expect(shouldReport("boom-b", 1000)).toBe(true);
    expect(shouldReport("boom-a", 1500)).toBe(false);
    expect(shouldReport("boom-b", 1500)).toBe(false);
  });

  it("la Map est bornée : une nouvelle clé au-delà de maxEntries évince la plus ancienne", () => {
    const shouldReport = createErrorThrottle(60_000, 3);
    expect(shouldReport("k1", 0)).toBe(true);
    expect(shouldReport("k2", 0)).toBe(true);
    expect(shouldReport("k3", 0)).toBe(true);
    // k4 dépasse la borne : k1 (la plus ancienne) est évincée.
    expect(shouldReport("k4", 0)).toBe(true);
    // k1 n'est plus en mémoire : elle est donc de nouveau "nouvelle" même
    // dans la fenêtre — comportement attendu d'une borne dure, pas d'un LRU
    // précis, mais elle ne doit jamais faire grossir la Map sans limite.
    expect(shouldReport("k1", 10)).toBe(true);
  });

  it("buildClientErrorKey combine message et début de stack", () => {
    const a = buildClientErrorKey("TypeError: x is undefined", "at foo (a.js:1:1)");
    const b = buildClientErrorKey("TypeError: x is undefined", "at bar (b.js:2:2)");
    expect(a).not.toBe(b);
    expect(buildClientErrorKey("m")).toBe("m::");
  });
});
