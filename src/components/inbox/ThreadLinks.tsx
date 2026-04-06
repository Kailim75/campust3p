import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, User, FileText, Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface ThreadLinksProps {
  threadId: string;
  centreId: string;
}

const ENTITY_ICONS: Record<string, any> = {
  contact: User,
  prospect: User,
  session: Calendar,
  facture: CreditCard,
  devis: FileText,
  document: FileText,
};

const ENTITY_LABELS: Record<string, string> = {
  contact: "Contact",
  prospect: "Prospect",
  session: "Session",
  facture: "Facture",
  devis: "Devis",
  groupe_payeur: "Groupe payeur",
  document: "Document",
  apprenant: "Apprenant",
};

export function ThreadLinks({ threadId, centreId }: ThreadLinksProps) {
  const queryClient = useQueryClient();

  const { data: links = [] } = useQuery({
    queryKey: ["crm-email-links", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_links")
        .select("*")
        .eq("thread_id", threadId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("crm_email_links")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-links", threadId] });
      toast.success("Lien supprimé");
    },
  });

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Entités rattachées</span>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune entité rattachée</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => {
            const Icon = ENTITY_ICONS[link.entity_type] || FileText;
            return (
              <Badge key={link.id} variant={link.is_primary ? "default" : "secondary"} className="gap-1 pr-1">
                <Icon className="h-3 w-3" />
                <span className="text-xs">{ENTITY_LABELS[link.entity_type] || link.entity_type}</span>
                {link.link_source === "auto" && (
                  <span className="text-[10px] opacity-60">auto</span>
                )}
                <button
                  onClick={() => removeLink.mutate(link.id)}
                  className="ml-1 hover:bg-background/50 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
