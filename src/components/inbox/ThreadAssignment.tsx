import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ThreadAssignmentProps {
  threadId: string;
  centreId: string;
  assignedTo: string | null;
}

export function ThreadAssignment({ threadId, centreId, assignedTo }: ThreadAssignmentProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: centreUsers = [] } = useQuery({
    queryKey: ["centre-users", centreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_centres")
        .select("user_id, profiles(id, display_name, email)")
        .eq("centre_id", centreId);
      if (error) throw error;
      return (data || [])
        .filter((uc: any) => uc.profiles)
        .map((uc: any) => ({
          id: uc.user_id,
          label: uc.profiles.display_name || uc.profiles.email || uc.user_id.slice(0, 8),
        }));
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const updates: any = {
        assigned_to: userId,
        assigned_at: userId ? new Date().toISOString() : null,
        assigned_by: userId ? user?.id : null,
      };
      const { error } = await supabase
        .from("crm_email_threads")
        .update(updates)
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["crm-email-threads"] });
      toast.success("Assignation mise à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });

  return (
    <div className="flex items-center gap-2">
      <UserCircle className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
      <Select
        value={assignedTo || "__none__"}
        onValueChange={(v) => assignMutation.mutate(v === "__none__" ? null : v)}
      >
        <SelectTrigger className="h-7 text-xs w-[170px] border-dashed text-muted-foreground">
          <SelectValue placeholder="Non assigné" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Non assigné</SelectItem>
          {centreUsers.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
