import { Card } from "@/components/ui/card";
import type { RequalificationContact } from "@/hooks/useRequalificationContacts";

export function RequalificationKPIs({ contacts }: { contacts: RequalificationContact[] }) {
  const total = contacts.length;
  const actifsReels = contacts.filter(
    (c) => !c.is_historical_import && c.hasInscription && !c.archived,
  ).length;
  const historiques = contacts.filter((c) => c.is_historical_import).length;
  const aRequalifier = contacts.filter(
    (c) =>
      !c.is_historical_import &&
      (c.requalification_category == null || c.requalification_category === "non_classe"),
  ).length;
  const incompletes = contacts.filter(
    (c) => c.suggestion.recommended === "fiche_incomplete",
  ).length;
  const anomalies = contacts.filter(
    (c) => c.suggestion.recommended === "anomalie_a_verifier",
  ).length;
  const aRattacher = contacts.filter(
    (c) =>
      !c.hasInscription &&
      !c.is_historical_import &&
      c.statut_apprenant === "actif",
  ).length;

  const items = [
    { label: "Total contacts", value: total },
    { label: "Apprenants actifs réels", value: actifsReels, tone: "text-emerald-700" },
    { label: "Historique SmartOF", value: historiques, tone: "text-slate-700" },
    { label: "À requalifier", value: aRequalifier, tone: "text-amber-700" },
    { label: "Fiches incomplètes", value: incompletes, tone: "text-orange-700" },
    { label: "Anomalies", value: anomalies, tone: "text-red-700" },
    { label: "À rattacher session", value: aRattacher, tone: "text-indigo-700" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
      {items.map((i) => (
        <Card key={i.label} className="p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {i.label}
          </div>
          <div className={"text-2xl font-semibold " + (i.tone ?? "")}>{i.value}</div>
        </Card>
      ))}
    </div>
  );
}
