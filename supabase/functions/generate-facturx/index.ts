// Sprint 8 — Génère un XML Factur-X (UN/CEFACT CII profil BASIC, conforme EN 16931)
// pour une facture, le stocke sur `factures.facturx_xml` et le renvoie.
//
// Input: { facture_id: string }
// Output: { xml: string, generated_at: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  return d.replace(/-/g, "").slice(0, 8); // YYYYMMDD
}

function num(n: unknown): string {
  const v = typeof n === "number" ? n : parseFloat(String(n ?? "0"));
  return (isNaN(v) ? 0 : v).toFixed(2);
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => ({}));
    const factureId: string | undefined = body?.facture_id;
    if (!factureId) {
      return new Response(JSON.stringify({ error: "facture_id manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: facture, error: fErr } = await supabase
      .from("factures")
      .select("*")
      .eq("id", factureId)
      .maybeSingle();
    if (fErr) throw fErr;
    if (!facture) {
      return new Response(JSON.stringify({ error: "facture introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lignes } = await supabase
      .from("facture_lignes")
      .select("*")
      .eq("facture_id", factureId)
      .order("ordre", { ascending: true });

    const { data: centre } = await supabase
      .from("centres")
      .select("nom, nom_commercial, siret, email, telephone, adresse_complete, settings")
      .eq("id", facture.centre_id)
      .maybeSingle();

    const settings = (centre?.settings ?? {}) as Record<string, unknown>;
    const sellerName = (settings.legal_name as string) || centre?.nom_commercial || centre?.nom || "Vendeur";
    const sellerSiret = (settings.siret as string) || centre?.siret || "";
    const sellerSiren = sellerSiret.replace(/\s/g, "").slice(0, 9);
    const sellerTva = (settings.tva_intracom as string) || "";

    const buyerName = facture.buyer_name_snapshot || "Acheteur";
    const buyerAddr = (facture.buyer_address_snapshot ?? {}) as Record<string, string>;

    const montantHT = Number(facture.montant_ht ?? 0);
    const montantTVA = Number(facture.montant_tva ?? 0);
    const montantTTC = Number(facture.montant_total ?? 0);

    const tvaCategory = facture.regime_tva === "exonere_261_4_4_a" ? "E" : "S";
    const exemptionReason =
      facture.motif_exoneration_tva ||
      (facture.regime_tva === "exonere_261_4_4_a"
        ? "Exonération TVA — art. 261-4-4°a CGI (formation professionnelle continue)"
        : "");

    const lignesXml = (lignes ?? []).map((l, i) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${i + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(l.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${num(l.prix_unitaire_ht)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${esc(l.quantite)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${tvaCategory}</ram:CategoryCode>
          <ram:RateApplicablePercent>${num(l.tva_percent)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${num(l.montant_ht)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(facture.numero_facture)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${fmtDate(facture.date_emission)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lignesXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(sellerName)}</ram:Name>
        ${sellerSiren ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(sellerSiren)}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(centre?.adresse_complete ?? "")}</ram:LineOne>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${sellerTva ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(sellerTva)}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(buyerName)}</ram:Name>
        ${facture.buyer_siren ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(facture.buyer_siren)}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(buyerAddr.rue ?? "")}</ram:LineOne>
          <ram:PostcodeCode>${esc(buyerAddr.code_postal ?? "")}</ram:PostcodeCode>
          <ram:CityName>${esc(buyerAddr.ville ?? "")}</ram:CityName>
          <ram:CountryID>${esc(facture.buyer_country ?? "FR")}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${facture.buyer_tva_intracom ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(facture.buyer_tva_intracom)}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${esc(facture.devise ?? "EUR")}</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${num(montantTVA)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${exemptionReason ? `<ram:ExemptionReason>${esc(exemptionReason)}</ram:ExemptionReason>` : ""}
        <ram:BasisAmount>${num(montantHT)}</ram:BasisAmount>
        <ram:CategoryCode>${tvaCategory}</ram:CategoryCode>
        <ram:RateApplicablePercent>${num(montantHT > 0 ? (montantTVA / montantHT) * 100 : 0)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      ${facture.date_echeance ? `<ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">${fmtDate(facture.date_echeance)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>` : ""}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${num(montantHT)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${num(montantHT)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${esc(facture.devise ?? "EUR")}">${num(montantTVA)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${num(montantTTC)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${num(montantTTC)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const generatedAt = new Date().toISOString();
    const { error: uErr } = await supabase
      .from("factures")
      .update({ facturx_xml: xml, facturx_generated_at: generatedAt })
      .eq("id", factureId);
    if (uErr) throw uErr;

    return new Response(JSON.stringify({ xml, generated_at: generatedAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-facturx]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
