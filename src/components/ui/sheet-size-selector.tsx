import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Maximize2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetSize, sheetSizeConfig } from "@/hooks/useSheetSize";

interface SheetSizeSelectorProps {
  size: SheetSize;
  onSizeChange: (size: SheetSize) => void;
}

export function SheetSizeSelector({ size, onSizeChange }: SheetSizeSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Taille de la fiche">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(sheetSizeConfig) as SheetSize[]).map((key) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onSizeChange(key)}
            className={cn("flex items-center justify-between", size === key && "bg-muted")}
          >
            {sheetSizeConfig[key].label}
            {size === key && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
