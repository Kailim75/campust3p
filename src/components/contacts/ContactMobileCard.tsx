import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MessageCircle, UserPlus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Contact } from "@/hooks/useContacts";

interface ContactMobileCardProps {
  contact: Contact;
  onClick: () => void;
  onEnroll: () => void;
  onCall: () => void;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
}

const statusConfig: Record<string, { label: string; class: string }> = {
  "En attente de validation": { label: "En attente", class: "bg-info/10 text-info border-info/20" },
  "Client": { label: "Client", class: "bg-success/10 text-success border-success/20" },
  "Bravo": { label: "Bravo", class: "bg-warning/10 text-warning border-warning/20" },
};

const formationLabels: Record<string, string> = {
  TAXI: "Taxi",
  VTC: "VTC",
  VMDTR: "VMDTR",
  "ACC VTC": "ACC VTC",
  "ACC VTC 75": "ACC VTC 75",
  "Formation continue Taxi": "Continue Taxi",
  "Formation continue VTC": "Continue VTC",
  "Mobilité Taxi": "Mobilité Taxi",
};

export function ContactMobileCard({ contact, onClick, onEnroll, onCall, isSelected, onSelect }: ContactMobileCardProps) {
  const initials = `${contact.prenom?.[0] ?? ''}${contact.nom?.[0] ?? ''}`.toUpperCase();
  const status = contact.statut ?? "En attente de validation";
  const statusStyle = statusConfig[status] || statusConfig["En attente de validation"];

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md active:scale-[0.98]",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header with Avatar and Name */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">
                {contact.civilite ? `${contact.civilite} ` : ''}{contact.prenom} {contact.nom}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {contact.email || 'Pas d\'email'}
              </p>
              {contact.custom_id && (
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {contact.custom_id}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          {contact.formation && (
            <div>
              <span className="text-muted-foreground">Formation : </span>
              <Badge variant="outline" className="text-xs">
                {formationLabels[contact.formation] || contact.formation}
              </Badge>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Statut : </span>
            <Badge variant="outline" className={cn("text-xs", statusStyle.class)}>
              {statusStyle.label}
            </Badge>
          </div>
          {contact.ville && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Ville : </span>
              <span>{contact.ville}</span>
            </div>
          )}
          <div className="col-span-2 text-xs text-muted-foreground">
            Créé le {format(new Date(contact.created_at), 'dd MMM yyyy', { locale: fr })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onEnroll();
            }}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Inscrire
          </Button>
          
          {contact.telephone && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              onClick={(e) => {
                e.stopPropagation();
                onCall();
              }}
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
          
          {contact.email && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`mailto:${contact.email}`, '_blank');
              }}
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}
          
          {contact.telephone && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://wa.me/${contact.telephone?.replace(/\s/g, '')}`, '_blank');
              }}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
