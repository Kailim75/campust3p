import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Copy,
  User,
  Clock,
  GraduationCap,
  DollarSign,
} from "lucide-react";
import { useUpdateHistoriqueAlert } from "@/hooks/useContactHistorique";
import { format, parseISO, differenceInDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RelanceItem {
  id: string;
  contact_id: string;
  contactNom: string;
  contactPrenom: string;
  contactTelephone: string | null;
  contactEmail: string | null;
  contactFormation: string | null;
  montantDu: number;
  joursRetard: number;
  dateEcheance: string;
  factureNumero: string;
  rappelId: string;
  date_rappel: string;
  rappel_description: string | null;
  isPrioritaire: boolean;
}

interface RelancesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rappels: any[];
  financials: {
    factures: any[];
    paiements: any[];
    contacts: Map<string, any>;
  };
}

function formatMontant(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function generateMessage(item: RelanceItem): string {
  const formationText = item.contactFormation
    ? ` dans le cadre de votre formation ${item.contactFormation}`
    : "";
  return `Bonjour ${item.contactPrenom},\n\nNous nous permettons de vous rappeler qu'un règlement de ${formatMontant(item.montantDu)} reste en attente${formationText} (facture ${item.factureNumero}, échéance du ${format(parseISO(item.dateEcheance), "d MMMM yyyy", { locale: fr })}).\n\nCela représente un retard de ${item.joursRetard} jour${item.joursRetard > 1 ? "s" : ""}.\n\nMerci de bien vouloir régulariser cette situation dans les meilleurs délais.\n\nCordialement,\nL'équipe administrative`;
}

export function RelancesDrawer({ open, onOpenChange, rappels, financials }: RelancesDrawerProps) {
  const updateAlert = useUpdateHistoriqueAlert();
  const [treatedIds, setTreatedIds] = useState<Set<string>>(new Set());
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});

  const relances = useMemo((): RelanceItem[] => {
    if (!financials.factures.length) return [];

    const now = startOfDay(new Date());
    const paidByFacture = new Map<string, number>();
    financials.paiements.forEach((p: any) => {
      paidByFacture.set(p.facture_id, (paidByFacture.get(p.facture_id) || 0) + Number(p.montant));
    });

    const contactRappelMap = new Map<string, any>();
    rappels.forEach((r) => {
      if (r.alerte_active && r.date_rappel) {
        contactRappelMap.set(r.contact_id, r);
      }
    });

    const items: RelanceItem[] = [];

    financials.factures.forEach((f: any) => {
      if (!f.date_echeance) return;
      const echeance = parseISO(f.date_echeance);
      const days = differenceInDays(now, startOfDay(echeance));
      if (days <= 0) return;

      const paid = paidByFacture.get(f.id) || 0;
      const remaining = Math.max(0, Number(f.montant_total) - paid);
      if (remaining <= 0) return;

      const rappel = contactRappelMap.get(f.contact_id);
      if (!rappel) return;

      const contact = financials.contacts.get(f.contact_id);

      items.push({
        id: f.id,
        contact_id: f.contact_id,
        contactNom: contact?.nom || "Inconnu",
        contactPrenom: contact?.prenom || "",
        contactTelephone: contact?.telephone || null,
        contactEmail: contact?.email || null,
        contactFormation: contact?.formation || null,
        montantDu: remaining,
        joursRetard: days,
        dateEcheance: f.date_echeance,
        factureNumero: f.numero_facture || f.id.slice(0, 8),
        rappelId: rappel.id,
        date_rappel: rappel.date_rappel,
        rappel_description: rappel.rappel_description,
        isPrioritaire: days > 7 || remaining >= 500,
      });
    });

    items.sort((a, b) => {
      if (b.montantDu !== a.montantDu) return b.montantDu - a.montantDu;
      if (b.joursRetard !== a.joursRetard) return b.joursRetard - a.joursRetard;
      return new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime();
    });

    return items;
  }, [rappels, financials]);

  const activeRelances = relances.filter((r) => !treatedIds.has(r.id));
  const prioritaires = activeRelances.filter((r) => r.isPrioritaire);
  const secondaires = activeRelances.filter((r) => !r.isPrioritaire);
  const totalMontant = activeRelances.reduce((s, r) => s + r.montantDu, 0);

  const handleWhatsApp = (item: RelanceItem) => {
    const msg = editedMessages[item.id] || generateMessage(item);
    const phone = (item.contactTelephone || "").replace(/\s/g, "").replace(/^0/, "33");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleEmail = (item: RelanceItem) => {
    const msg = editedMessages[item.id] || generateMessage(item);
    const subject = `Relance paiement - Facture ${item.factureNumero}`;
    window.open(`mailto:${item.contactEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`);
  };

  const handleCopy = (item: RelanceItem) => {
    const msg = editedMessages[item.id] || generateMessage(item);
    navigator.clipboard.writeText(msg);
    toast.success("Message copié");
  };

  const handleMarkTreated = (item: RelanceItem) => {
    setTreatedIds((prev) => new Set(prev).add(item.id));
    updateAlert.mutate({
      id: item.rappelId,
      contactId: item.contact_id,
      alerte_active: false,
      date_rappel: item.date_rappel,
      rappel_description: item.rappel_description,
    });
    toast.success(`Relance traitée pour ${item.contactPrenom} ${item.contactNom}`);
  };

  const renderRelanceCard = (item: RelanceItem) => {
    const message = editedMessages[item.id] || generateMessage(item);
    return (
      <Card key={item.id} className={cn("border-l-4 overflow-hidden", item.isPrioritaire ? "border-l-destructive" : "border-l-amber-400")}>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", item.isPrioritaire ? "bg-destructive/10" : "bg-amber-500/10")}>
                <User className={cn("h-4 w-4", item.isPrioritaire ? "text-destructive" : "text-amber-600")} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {item.contactPrenom} {item.contactNom}
                </p>
                {item.contactFormation && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <GraduationCap className="h-3 w-3" />
                    {item.contactFormation}
                  </span>
                )}
              </div>
            </div>
            <Badge className={cn("text-xs whitespace-nowrap", item.isPrioritaire ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-amber-500/10 text-amber-600 border-amber-200")}>
              {formatMontant(item.montantDu)}
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] bg-destructive/5 text-destructive border-destructive/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {item.joursRetard}j de retard
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              <Clock className="h-3 w-3 mr-1" />
              Éch. {format(parseISO(item.dateEcheance), "dd/MM/yyyy")}
            </Badge>
          </div>

          <Textarea
            value={message}
            onChange={(e) => setEditedMessages((prev) => ({ ...prev, [item.id]: e.target.value }))}
            className="text-xs min-h-[120px] resize-none bg-muted/30"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={() => handleWhatsApp(item)} disabled={!item.contactTelephone}>
              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={() => handleEmail(item)} disabled={!item.contactEmail}>
              <Mail className="h-3.5 w-3.5" /> Email
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-8 gap-1.5" onClick={() => handleCopy(item)}>
              <Copy className="h-3.5 w-3.5" /> Copier
            </Button>
            <Button size="sm" className="text-xs h-8 gap-1.5 ml-auto bg-primary text-primary-foreground" onClick={() => handleMarkTreated(item)}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Traité
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Préparer mes relances
          </SheetTitle>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="text-xs">
              {activeRelances.length} relance{activeRelances.length > 1 ? "s" : ""}
            </Badge>
            {totalMontant > 0 && (
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20 gap-1">
                <DollarSign className="h-3 w-3" />
                {formatMontant(totalMontant)} à recouvrer
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {activeRelances.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Aucune relance à préparer</p>
                <p className="text-xs text-muted-foreground mt-1">Toutes les relances ont été traitées</p>
              </Card>
            ) : (
              <>
                {prioritaires.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <h3 className="text-sm font-semibold text-foreground">Relances prioritaires</h3>
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                        {prioritaires.length}
                      </Badge>
                    </div>
                    {prioritaires.map(renderRelanceCard)}
                  </div>
                )}

                {secondaires.length > 0 && (
                  <div className="space-y-3">
                    {prioritaires.length > 0 && (
                      <div className="flex items-center gap-2 pt-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <h3 className="text-sm font-semibold text-foreground">Relances secondaires</h3>
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
                          {secondaires.length}
                        </Badge>
                      </div>
                    )}
                    {secondaires.map(renderRelanceCard)}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
