import * as React from "react";
import { useState } from "react";
import { CONTACT_SOURCE_OPTIONS, normalizeSource, getSourceLabel } from "@/lib/contact-sources";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface SourceSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SourceSelect({ value, onValueChange, className, disabled }: SourceSelectProps) {
  const [open, setOpen] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  // Check if value is a known source or "autre" with custom text
  const isKnownSource = CONTACT_SOURCE_OPTIONS.some(o => o.value === value);
  const isAutre = value === "autre" || (!isKnownSource && !!value);
  
  // Try normalizing legacy values
  const normalizedValue = isKnownSource ? value : normalizeSource(value);
  const effectiveValue = normalizedValue || (value ? "autre" : "");
  const displayLabel = isKnownSource
    ? getSourceLabel(value)
    : normalizedValue
      ? getSourceLabel(normalizedValue)
      : value || "";

  React.useEffect(() => {
    if (isAutre && !isKnownSource && value !== "autre") {
      setOtherValue(value);
      setShowOtherInput(true);
    }
  }, [value, isAutre, isKnownSource]);

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === "autre") {
      setShowOtherInput(true);
      onValueChange("autre");
    } else {
      setShowOtherInput(false);
      setOtherValue("");
      onValueChange(selectedValue);
    }
    setOpen(false);
  };

  const handleOtherChange = (text: string) => {
    setOtherValue(text);
    onValueChange(text || "autre");
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", !effectiveValue && "text-muted-foreground", className)}
            disabled={disabled}
          >
            <span className="truncate">
              {effectiveValue ? displayLabel : "Sélectionner la source…"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher une source…" />
            <CommandList>
              <CommandEmpty>Aucun résultat.</CommandEmpty>
              <CommandGroup>
                {CONTACT_SOURCE_OPTIONS.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        effectiveValue === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showOtherInput && (
        <Input
          value={otherValue}
          onChange={(e) => handleOtherChange(e.target.value)}
          placeholder="Précisez la source…"
          className="mt-1"
        />
      )}
    </div>
  );
}
