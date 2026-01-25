import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useCentreContext } from "@/contexts/CentreContext";
import { Badge } from "@/components/ui/badge";

export function CentreSwitcher() {
  const [open, setOpen] = useState(false);
  const { currentCentre, setCurrentCentre, accessibleCentres, isSuperAdmin, isLoading } = useCentreContext();

  // Ne rien afficher si l'utilisateur n'a accès qu'à un seul centre et n'est pas super admin
  if (!isSuperAdmin && accessibleCentres.length <= 1) {
    return null;
  }

  if (isLoading) {
    return (
      <Button variant="outline" className="w-[200px] justify-start" disabled>
        <Building2 className="mr-2 h-4 w-4" />
        Chargement...
      </Button>
    );
  }

  const planColors: Record<string, string> = {
    essentiel: "bg-slate-100 text-slate-700",
    pro: "bg-blue-100 text-blue-700",
    premium: "bg-amber-100 text-amber-700",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {currentCentre?.nom || "Sélectionner un centre"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un centre..." />
          <CommandList>
            <CommandEmpty>Aucun centre trouvé.</CommandEmpty>
            <CommandGroup heading="Centres accessibles">
              {accessibleCentres.map((centre) => (
                <CommandItem
                  key={centre.id}
                  value={centre.nom}
                  onSelect={() => {
                    setCurrentCentre(centre);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-4 w-4",
                        currentCentre?.id === centre.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="truncate">{centre.nom}</span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={cn("ml-2 text-xs", planColors[centre.plan_type])}
                  >
                    {centre.plan_type}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
