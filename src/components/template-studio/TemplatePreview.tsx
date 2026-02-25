// ═══════════════════════════════════════════════════════════════
// Template Preview — Renders template_body with variable replacement
// ═══════════════════════════════════════════════════════════════

import DOMPurify from "dompurify";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

const SAMPLE_DATA: Record<string, string> = {
  nom: "Dupont",
  prenom: "Karim",
  session_nom: "T3P - Session Exemple",
  session_date_debut: "2026-03-10",
  session_date_fin: "2026-03-12",
  centre_nom: "T3P Formation",
  centre_nom_legal: "T3P Formation SAS",
  centre_nom_commercial: "T3P Formation",
  centre_siret: "00000000000000",
  centre_nda: "00000000000",
  centre_adresse: "12 rue de la Paix, 75001 Paris",
  centre_email: "contact@t3p-formation.fr",
  centre_telephone: "01 23 45 67 89",
  centre_forme_juridique: "SAS",
  centre_iban: "FR76 0000 0000 0000 0000 0000 000",
  centre_bic: "BNPAFRPP",
  centre_region: "Île-de-France",
  centre_qualiopi_numero: "Q-2024-0001",
  centre_qualiopi_date: "2024-01-15",
  centre_agrement: "AGR-2024-001",
  centre_agrement_date: "2024-02-01",
  centre_code_rncp: "RNCP12345",
  centre_code_rs: "RS6789",
  responsable_nom: "Jean Martin",
  responsable_fonction: "Directeur",
  lieu: "Paris",
  date_jour: new Date().toLocaleDateString("fr-FR"),
  duree_heures: "35",
  prix_total: "990",
  email: "karim.dupont@email.com",
  telephone: "06 12 34 56 78",
  adresse: "12 rue de la Paix, 75001 Paris",
  civilite: "M.",
  date_naissance: "15/04/1990",
  numero_facture: "FAC-2026-001",
  montant_total: "990",
  horaires: "9h00-12h30 / 13h30-17h00",
};

function renderTemplate(body: string, data: Record<string, string> = SAMPLE_DATA): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (varName in data) {
      return data[varName];
    }
    // Unknown variable → highlight
    return `<mark style="background:#fbbf24;color:#000;padding:0 2px;border-radius:2px" title="Variable inconnue">${match}</mark>`;
  });
}

interface Props {
  body: string;
  customData?: Record<string, string>;
}

export default function TemplatePreview({ body, customData }: Props) {
  if (!body.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="h-10 w-10 mb-3 opacity-30" />
        <p className="font-medium">Ajoutez du contenu pour voir l'aperçu</p>
        <p className="text-sm mt-1">Utilisez les variables {"{{nom}}"}, {"{{prenom}}"}, etc.</p>
      </div>
    );
  }

  const rendered = renderTemplate(body, customData || SAMPLE_DATA);
  const sanitized = DOMPurify.sanitize(rendered, { ADD_ATTR: ["style"], ADD_TAGS: ["mark"] });

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="border rounded-lg bg-white dark:bg-card">
        {/* Header bar */}
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Aperçu avec données de test
          </span>
          <span className="text-[10px] text-muted-foreground">
            Variables non reconnues en <mark style={{ background: "#fbbf24", padding: "0 3px", borderRadius: 2, fontSize: 10 }}>surbrillance</mark>
          </span>
        </div>
        <div
          className="p-6 prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    </ScrollArea>
  );
}

export { SAMPLE_DATA, renderTemplate };
