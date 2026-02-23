import { Mail, Phone, MapPin, Calendar, User, Car, CreditCard, GraduationCap, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ContactCertificatesSection } from "./ContactCertificatesSection";

interface Contact {
  id?: string;
  email?: string | null;
  telephone?: string | null;
  rue?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
  ville_naissance?: string | null;
  pays_naissance?: string | null;
  custom_id?: string | null;
  numero_permis?: string | null;
  prefecture_permis?: string | null;
  date_delivrance_permis?: string | null;
  numero_carte_professionnelle?: string | null;
  prefecture_carte?: string | null;
  date_expiration_carte?: string | null;
  formation?: string | null;
  source?: string | null;
  commentaires?: string | null;
}

interface ContactInfoTabProps {
  contact: Contact;
}

const formationLabels: Record<string, string> = {
  TAXI: "Formation Taxi",
  VTC: "Formation VTC",
  VMDTR: "Formation VMDTR",
  "ACC VTC": "Accompagnement VTC",
  "ACC VTC 75": "Accompagnement VTC 75",
  "Formation continue Taxi": "Formation continue Taxi",
  "Formation continue VTC": "Formation continue VTC",
  "Mobilité Taxi": "Mobilité Taxi",
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
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

export function ContactInfoTab({ contact }: ContactInfoTabProps) {
  const fullAddress = [contact.rue, contact.code_postal, contact.ville].filter(Boolean).join(", ");

  const birthInfo = [
    contact.date_naissance ? format(new Date(contact.date_naissance), "dd MMMM yyyy", { locale: fr }) : null,
    contact.ville_naissance,
    contact.pays_naissance,
  ]
    .filter(Boolean)
    .join(", ");

  const permisInfo = contact.numero_permis
    ? `${contact.numero_permis}${contact.prefecture_permis ? ` (${contact.prefecture_permis})` : ""}${
        contact.date_delivrance_permis
          ? ` - Délivré le ${format(new Date(contact.date_delivrance_permis), "dd/MM/yyyy", { locale: fr })}`
          : ""
      }`
    : null;

  const carteProInfo = contact.numero_carte_professionnelle
    ? `${contact.numero_carte_professionnelle}${contact.prefecture_carte ? ` (${contact.prefecture_carte})` : ""}${
        contact.date_expiration_carte
          ? ` - Expire le ${format(new Date(contact.date_expiration_carte), "dd/MM/yyyy", { locale: fr })}`
          : ""
      }`
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Contact</h3>
        <InfoRow icon={Mail} label="Email" value={contact.email} />
        <InfoRow icon={Phone} label="Téléphone" value={contact.telephone} />
        <InfoRow icon={MapPin} label="Adresse" value={fullAddress} />
      </div>

      <div className="space-y-1">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
          Informations personnelles
        </h3>
        <InfoRow icon={Calendar} label="Naissance" value={birthInfo} />
        <InfoRow icon={User} label="ID personnalisé" value={contact.custom_id} />
      </div>

      {permisInfo && (
        <div className="space-y-1">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Permis de conduire</h3>
          <InfoRow icon={Car} label="Permis" value={permisInfo} />
        </div>
      )}

      {carteProInfo && (
        <div className="space-y-1">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Carte professionnelle</h3>
          <InfoRow icon={CreditCard} label="Carte" value={carteProInfo} />
        </div>
      )}

      <div className="space-y-1">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Formation</h3>
        <InfoRow
          icon={GraduationCap}
          label="Type de formation"
          value={contact.formation ? formationLabels[contact.formation] || contact.formation : null}
        />
        <InfoRow icon={FileText} label="Source" value={contact.source} />
        {contact.commentaires && (
          <div className="mt-3 p-4 bg-muted/40 rounded-xl border border-border/60">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Commentaires</p>
            <p className="text-sm leading-relaxed">{contact.commentaires}</p>
          </div>
        )}
      </div>

      {/* Certificats d'attestation */}
      {contact.id && <ContactCertificatesSection contactId={contact.id} />}
    </div>
  );
}
