import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, Phone, MapPin, Calendar, User, Car, Hash, FileCheck, IdCard } from "lucide-react";
import { useContact } from "@/hooks/useContact";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CMATab } from "./CMATab";
import { CarteProTab } from "./CarteProTab";
import { getTrackFromFormationType } from "@/lib/formation-track";

interface DossierTabProps {
  contactId: string;
  formation: string | null;
  /** Pré-ouvrir l'accordéon réglementaire (par défaut si dossier incomplet). */
  defaultOpenRegulatory?: boolean;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3.5 py-2.5 group">
      <div className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground mt-0.5 shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-150">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function DossierTab({ contactId, formation, defaultOpenRegulatory = false }: DossierTabProps) {
  const { data: contact, isLoading } = useContact(contactId);

  if (isLoading || !contact) return <Skeleton className="h-[300px] rounded-xl" />;

  const fullAddress = [contact.rue, contact.code_postal, contact.ville].filter(Boolean).join(", ");
  const birthInfo = [
    contact.date_naissance ? format(new Date(contact.date_naissance), "dd MMMM yyyy", { locale: fr }) : null,
    contact.ville_naissance,
    contact.pays_naissance,
  ].filter(Boolean).join(", ");

  const civiliteLabel = contact.civilite === "Monsieur" ? "M." : contact.civilite === "Madame" ? "Mme" : null;
  const fullName = [civiliteLabel, contact.prenom, contact.nom].filter(Boolean).join(" ");
  const nomNaissance = contact.nom_naissance ? `Née ${contact.nom_naissance}` : null;

  const permisInfo = contact.numero_permis
    ? `${contact.numero_permis}${contact.prefecture_permis ? ` (${contact.prefecture_permis})` : ""}${
        contact.date_delivrance_permis
          ? ` — Délivré le ${format(new Date(contact.date_delivrance_permis), "dd/MM/yyyy", { locale: fr })}`
          : ""
      }`
    : null;

  const track = getTrackFromFormationType(formation);
  const isInitial = track === "initial";

  return (
    <div className="space-y-6">
      {/* Identité */}
      <Card className="p-4 space-y-1">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Identité</h3>
        <InfoRow icon={User} label="Nom complet" value={fullName} />
        {nomNaissance && <InfoRow icon={User} label="Nom de naissance" value={nomNaissance} />}
        <InfoRow icon={Calendar} label="Naissance" value={birthInfo} />
        {contact.custom_id && <InfoRow icon={Hash} label="ID personnalisé" value={contact.custom_id} />}
      </Card>

      {/* Coordonnées */}
      <Card className="p-4 space-y-1">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Coordonnées</h3>
        <InfoRow icon={Phone} label="Téléphone" value={contact.telephone} />
        <InfoRow icon={Mail} label="Email" value={contact.email} />
        <InfoRow icon={MapPin} label="Adresse" value={fullAddress} />
      </Card>

      {/* Permis */}
      {permisInfo && (
        <Card className="p-4 space-y-1">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Permis de conduire</h3>
          <InfoRow icon={Car} label="Permis" value={permisInfo} />
        </Card>
      )}

      {/* Réglementaire : CMA (initial) ou Carte Pro (formation continue) */}
      <Card className="p-2">
        <Accordion type="single" collapsible defaultValue={defaultOpenRegulatory ? "regulatory" : undefined}>
          <AccordionItem value="regulatory" className="border-b-0">
            <AccordionTrigger className="px-2 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                {isInitial ? (
                  <FileCheck className="h-4 w-4 text-primary" />
                ) : (
                  <IdCard className="h-4 w-4 text-accent" />
                )}
                <span className="text-sm font-semibold">
                  {isInitial ? "Dossier CMA réglementaire" : "Carte professionnelle"}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3">
              {isInitial ? (
                <CMATab
                  contactId={contactId}
                  contactPrenom={contact.prenom}
                  contactEmail={contact.email}
                  formation={formation}
                />
              ) : (
                <CarteProTab
                  contactId={contactId}
                  contactPrenom={contact.prenom}
                  formation={formation}
                />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}
