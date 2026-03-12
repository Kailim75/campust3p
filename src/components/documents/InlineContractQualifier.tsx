import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useQualifyContractFrame,
  type ContractDocumentType,
} from "@/hooks/useContractQualification";
import { useQueryClient } from "@tanstack/react-query";

interface InlineContractQualifierProps {
  inscriptionId: string;
  currentFrame: "contrat" | "convention" | "a_qualifier";
  contactName?: string;
}

export function InlineContractQualifier({
  inscriptionId,
  currentFrame,
  contactName,
}: InlineContractQualifierProps) {
  const [open, setOpen] = useState(false);
  const qualifyMutation = useQualifyContractFrame();
  const queryClient = useQueryClient();

  const label = currentFrame === "contrat" ? "Contrat"
    : currentFrame === "convention" ? "Convention"
    : "À qualifier";

  const isQualified = currentFrame !== "a_qualifier";

  const handleQualify = async (type: ContractDocumentType) => {
    await qualifyMutation.mutateAsync({
      inscriptionId,
      contractDocumentType: type,
      source: "manual",
    });
    // Also refresh the session matrix
    queryClient.invalidateQueries({ queryKey: ["session-document-matrix"] });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center rounded-md border px-1.5 h-5 text-[9px] font-medium transition-colors",
            isQualified
              ? "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
              : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 cursor-pointer"
          )}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="center">
        <p className="text-xs font-medium mb-2 text-foreground">
          Qualifier {contactName ? `— ${contactName}` : ""}
        </p>
        <div className="grid gap-1.5">
          <button
            onClick={() => handleQualify("contrat")}
            disabled={qualifyMutation.isPending}
            className={cn(
              "flex flex-col items-start rounded-md border p-2.5 text-left transition-colors",
              "hover:bg-primary/5 hover:border-primary/30",
              currentFrame === "contrat" && "border-primary/40 bg-primary/5"
            )}
          >
            <span className="font-medium text-xs text-foreground">Contrat de formation</span>
            <span className="text-[10px] text-muted-foreground">
              Personne physique — Art. L6353-3
            </span>
          </button>
          <button
            onClick={() => handleQualify("convention")}
            disabled={qualifyMutation.isPending}
            className={cn(
              "flex flex-col items-start rounded-md border p-2.5 text-left transition-colors",
              "hover:bg-accent/50 hover:border-accent",
              currentFrame === "convention" && "border-accent bg-accent/30"
            )}
          >
            <span className="font-medium text-xs text-foreground">Convention de formation</span>
            <span className="text-[10px] text-muted-foreground">
              OPCO, CPF, entreprise — Art. L6353-1
            </span>
          </button>
        </div>
        {qualifyMutation.isPending && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Qualification...
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
