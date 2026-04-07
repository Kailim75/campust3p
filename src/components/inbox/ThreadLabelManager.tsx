import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tags, Check, X, Plus, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRM_LABEL_GROUPS, CrmLabelBadge } from "./CrmLabelBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface ThreadLabelManagerProps {
  threadId: string;
  centreId: string;
  currentLabels: string[];
}

const CUSTOM_COLORS = [
  { value: "gray", label: "Gris" },
  { value: "blue", label: "Bleu" },
  { value: "green", label: "Vert" },
  { value: "red", label: "Rouge" },
  { value: "yellow", label: "Jaune" },
  { value: "purple", label: "Violet" },
  { value: "pink", label: "Rose" },
  { value: "indigo", label: "Indigo" },
  { value: "teal", label: "Sarcelle" },
  { value: "cyan", label: "Cyan" },
  { value: "orange", label: "Orange" },
];

export function ThreadLabelManager({ threadId, centreId, currentLabels }: ThreadLabelManagerProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const queryClient = useQueryClient();

  // Fetch custom labels for this centre
  const { data: customLabels = [] } = useQuery({
    queryKey: ["crm-label-definitions", centreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_label_definitions")
        .select("*")
        .eq("centre_id", centreId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const toggleLabel = useMutation({
    mutationFn: async ({ label, add }: { label: string; add: boolean }) => {
      const { error } = await supabase.functions.invoke("gmail-thread-actions", {
        body: { threadId, centreId, action: add ? "add_labels" : "remove_labels", labels: [label] },
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-threads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-email-thread", threadId] });
      toast.success(vars.add ? "Label ajouté" : "Label retiré");
    },
    onError: (e: any) => toast.error("Erreur: " + e.message),
  });

  const createLabel = useMutation({
    mutationFn: async () => {
      const fullName = `CRM/${newName.trim()}`;
      const { error } = await supabase.from("crm_label_definitions").insert({
        centre_id: centreId,
        name: fullName,
        short_name: newName.trim(),
        color: newColor,
        is_system: false,
        sort_order: customLabels.length,
      });
      if (error) throw error;
      return fullName;
    },
    onSuccess: (fullName) => {
      queryClient.invalidateQueries({ queryKey: ["crm-label-definitions", centreId] });
      setNewName("");
      setShowCreate(false);
      toast.success("Libellé créé");
      // Auto-apply to current thread
      toggleLabel.mutate({ label: fullName, add: true });
    },
    onError: (e: any) => toast.error("Erreur: " + e.message),
  });

  const isPending = toggleLabel.isPending || createLabel.isPending;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Tags className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Gérer les libellés
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-64 p-2 max-h-[420px] overflow-y-auto">
        {/* System labels grouped */}
        {Object.entries(CRM_LABEL_GROUPS).map(([group, labels]) => (
          <div key={group}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2 pb-1">
              {group}
            </p>
            <div className="space-y-0.5">
              {labels.map((label) => {
                const isActive = currentLabels.includes(label);
                return (
                  <button
                    key={label}
                    onClick={() => toggleLabel.mutate({ label, add: !isActive })}
                    disabled={isPending}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors",
                      isActive ? "bg-accent" : "hover:bg-muted"
                    )}
                  >
                    <CrmLabelBadge label={label} size="sm" />
                    {isActive ? (
                      <X className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Check className="h-3 w-3 text-transparent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Custom labels */}
        {customLabels.length > 0 && (
          <>
            <Separator className="my-2" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-1">
              Personnalisés
            </p>
            <div className="space-y-0.5">
              {customLabels.map((cl: any) => {
                const isActive = currentLabels.includes(cl.name);
                return (
                  <button
                    key={cl.id}
                    onClick={() => toggleLabel.mutate({ label: cl.name, add: !isActive })}
                    disabled={isPending}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors",
                      isActive ? "bg-accent" : "hover:bg-muted"
                    )}
                  >
                    <CrmLabelBadge label={cl.name} customShort={cl.short_name} customColor={cl.color} size="sm" />
                    {isActive ? (
                      <X className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Check className="h-3 w-3 text-transparent" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Create new label */}
        <Separator className="my-2" />
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3 w-3" />
            Créer un libellé
          </button>
        ) : (
          <div className="px-1 py-1 space-y-2">
            <Input
              placeholder="Nom du libellé"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-7 text-xs"
              autoFocus
            />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("w-2.5 h-2.5 rounded-full", `bg-${c.value === "gray" ? "muted" : c.value}-500`)} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                disabled={!newName.trim() || createLabel.isPending}
                onClick={() => createLabel.mutate()}
              >
                {createLabel.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Créer"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setShowCreate(false); setNewName(""); }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
