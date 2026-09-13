import { describe, it, expect, vi } from "vitest";

// Le module importe le client Supabase et sonner ; on les neutralise car on ne
// teste QUE la fonction pure resoudreObjetSignature (pas d'I/O).
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { resoudreObjetSignature } from "@/lib/signatures";

describe("resoudreObjetSignature — bucket + chemin depuis une signature_url hétérogène", () => {
  it("chemin brut du flux de signature publique → bucket generated-documents", () => {
    const p = "centre/97e69258/signatures/2e38375b/sig-c3dc5c29-1789305115051.png";
    expect(resoudreObjetSignature(p)).toEqual({ bucket: "generated-documents", path: p });
  });

  it("chemin brut avec slash de tête → nettoyé, generated-documents", () => {
    expect(resoudreObjetSignature("/centre/a/signatures/b/sig-x.png")).toEqual({
      bucket: "generated-documents",
      path: "centre/a/signatures/b/sig-x.png",
    });
  });

  it("chemin brut plat (émargement) → bucket signatures", () => {
    expect(resoudreObjetSignature("emargement_42_1789.png")).toEqual({
      bucket: "signatures",
      path: "emargement_42_1789.png",
    });
  });

  it("URL getPublicUrl → parse bucket + chemin", () => {
    const u = "https://zhgbbujqapcigmduuqiy.supabase.co/storage/v1/object/public/signatures/abc_123.png";
    expect(resoudreObjetSignature(u)).toEqual({ bucket: "signatures", path: "abc_123.png" });
  });

  it("URL signée (avec token) → re-signable : parse bucket + chemin sans le token", () => {
    const u =
      "https://ref.supabase.co/storage/v1/object/sign/generated-documents/centre/a/x.png?token=eyJ0eXAiabc";
    expect(resoudreObjetSignature(u)).toEqual({ bucket: "generated-documents", path: "centre/a/x.png" });
  });

  it("URL externe inconnue → null (on ne re-signe pas)", () => {
    expect(resoudreObjetSignature("https://example.com/whatever.png")).toBeNull();
  });

  it("vide → null", () => {
    expect(resoudreObjetSignature("")).toBeNull();
    expect(resoudreObjetSignature("   ")).toBeNull();
  });
});
