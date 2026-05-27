import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BanAddress {
  label: string;
  street: string;
  postcode: string;
  city: string;
  context: string;
}

interface BanFeature {
  properties: {
    label: string;
    name: string;
    postcode: string;
    city: string;
    context: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (addr: BanAddress) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Auto-complétion d'adresse via la Base Adresse Nationale (api-adresse.data.gouv.fr).
 * Service public gratuit, sans clé API. Optimisé : debounce 300ms, min 3 caractères.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Tapez une adresse…",
  className,
  disabled,
  id,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!value || value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=6&autocomplete=1`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("BAN error");
        const data = await res.json();
        setSuggestions(data.features || []);
        setOpen((data.features || []).length > 0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handlePick = (feature: BanFeature) => {
    const p = feature.properties;
    onSelect({
      label: p.label,
      street: p.name,
      postcode: p.postcode,
      city: p.city,
      context: p.context,
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn("pr-8", className)}
            autoComplete="off"
            onFocus={() => suggestions.length > 0 && setOpen(true)}
          />
          {loading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-72 overflow-y-auto py-1">
          {suggestions.map((f, idx) => (
            <button
              key={`${f.properties.label}-${idx}`}
              type="button"
              onClick={() => handlePick(f)}
              className="w-full text-left px-3 py-2 hover:bg-muted text-xs flex items-start gap-2 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{f.properties.label}</div>
                <div className="text-[10px] text-muted-foreground">{f.properties.context}</div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
